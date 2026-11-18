CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 32),
  x_handle text CHECK (x_handle ~ '^[A-Za-z0-9_]{3,32}$'),
  telegram_handle text CHECK (telegram_handle ~ '^[A-Za-z0-9_]{3,32}$'),
  wallet_party_id text CHECK (char_length(wallet_party_id) BETWEEN 1 AND 255),
  invite_code text NOT NULL UNIQUE,
  referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (referred_by IS DISTINCT FROM id)
);
CREATE INDEX profiles_referred_by_idx ON public.profiles(referred_by);

GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (display_name, x_handle, telegram_handle, wallet_party_id) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.quest_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quest_id text NOT NULL CHECK (char_length(quest_id) BETWEEN 1 AND 64),
  period text NOT NULL CHECK (period = 'once' OR period ~ '^\d{4}-\d{2}-\d{2}$'),
  xp integer NOT NULL CHECK (xp > 0 AND xp <= 1000),
  evidence text CHECK (char_length(evidence) <= 500),
  simulated boolean NOT NULL DEFAULT false,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quest_id, period)
);
CREATE INDEX quest_claims_user_idx ON public.quest_claims(user_id);

GRANT SELECT ON public.quest_claims TO authenticated;
GRANT ALL ON public.quest_claims TO service_role;
ALTER TABLE public.quest_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own claims" ON public.quest_claims FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.quest_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quest_id text NOT NULL CHECK (char_length(quest_id) BETWEEN 1 AND 64),
  url text NOT NULL CHECK (char_length(url) BETWEEN 10 AND 500 AND url ~ '^https://'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE (user_id, quest_id)
);

GRANT SELECT ON public.quest_submissions TO authenticated;
GRANT ALL ON public.quest_submissions TO service_role;
ALTER TABLE public.quest_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own submissions" ON public.quest_submissions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Profile on sign-up: name from the sign-up form or Google, never from the email address.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text := btrim(coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''));
  v_code text;
BEGIN
  v_name := left(v_name, 32);
  IF char_length(v_name) < 2 THEN
    v_name := 'Explorer ' || upper(substr(replace(NEW.id::text, '-', ''), 1, 4));
  END IF;
  LOOP
    v_code := 'ZNT-' || upper(substr(md5(NEW.id::text || clock_timestamp()::text || random()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE invite_code = v_code);
  END LOOP;
  INSERT INTO public.profiles (id, display_name, invite_code) VALUES (NEW.id, v_name, v_code);
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Apply a friend's invite code once; no self-referral and no two-way referral.
CREATE OR REPLACE FUNCTION public.apply_referral(p_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := auth.uid();
  v_ref public.profiles%ROWTYPE;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO v_ref FROM public.profiles WHERE invite_code = upper(btrim(p_code));
  IF NOT FOUND THEN RETURN 'invalid'; END IF;
  IF v_ref.id = v_me OR v_ref.referred_by = v_me THEN RETURN 'invalid'; END IF;
  UPDATE public.profiles SET referred_by = v_ref.id WHERE id = v_me AND referred_by IS NULL;
  IF NOT FOUND THEN RETURN 'already_referred'; END IF;
  RETURN 'applied';
END; $$;
REVOKE EXECUTE ON FUNCTION public.apply_referral(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_referral(text) TO authenticated;

-- Season leaderboard: quest XP + floor(10% of referred friends' quest XP). Exposes names and XP only.
CREATE OR REPLACE FUNCTION public.quest_leaderboard(p_limit integer DEFAULT 200)
RETURNS TABLE (rank bigint, display_name text, xp bigint, quest_xp bigint, referral_xp bigint, friends bigint, is_you boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH qx AS (
    SELECT user_id, sum(xp)::bigint AS quest_xp FROM public.quest_claims GROUP BY user_id
  ),
  totals AS (
    SELECT p.id, p.display_name, p.created_at,
      coalesce(q.quest_xp, 0) AS quest_xp,
      coalesce((SELECT floor(sum(coalesce(fq.quest_xp, 0)) * 0.10)::bigint
                FROM public.profiles f LEFT JOIN qx fq ON fq.user_id = f.id
                WHERE f.referred_by = p.id), 0) AS referral_xp,
      (SELECT count(*) FROM public.profiles f WHERE f.referred_by = p.id) AS friends
    FROM public.profiles p LEFT JOIN qx q ON q.user_id = p.id
  ),
  ranked AS (
    SELECT row_number() OVER (ORDER BY quest_xp + referral_xp DESC, created_at, id) AS rank,
      display_name, quest_xp + referral_xp AS xp, quest_xp, referral_xp, friends,
      (id = auth.uid()) AS is_you
    FROM totals
    WHERE quest_xp + referral_xp > 0 OR id = auth.uid()
  )
  SELECT rank, display_name, xp, quest_xp, referral_xp, friends, coalesce(is_you, false)
  FROM ranked
  WHERE rank <= least(greatest(p_limit, 1), 500) OR is_you
  ORDER BY rank;
$$;
REVOKE EXECUTE ON FUNCTION public.quest_leaderboard(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quest_leaderboard(integer) TO anon, authenticated;