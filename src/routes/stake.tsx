import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Info } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { PageHeader, PageShell } from "@/components/zentra/PageHeader";
import { Panel, SimBadge, StatTile } from "@/components/zentra/Panel";
import { TokenIcon } from "@/components/zentra/TokenIcon";
import { D, fmt, fmtPct, parseAmount } from "@/lib/zentra/decimal";
import { IS_SIMULATED } from "@/lib/zentra/env";
import { useZentra } from "@/lib/zentra/store";

export const Route = createFileRoute("/stake")({
  head: () => ({
    meta: [
      { title: "Stake & Yield — ZENTRA Finance" },
      { name: "description", content: "ZNT staking and ZENTRA yield strategies, with every source, fee, lock-up and risk shown up front." },
      { property: "og:title", content: "Stake & Yield — ZENTRA Finance" },
      { property: "og:description", content: "ZNT staking and yield strategies with sources, fees, lock-ups and risks shown up front." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Stake,
});

const STRATEGIES = [
  {
    name: "Lending interest",
    source: "Interest paid by borrowers in ZENTRA markets",
    reward: "Supplied asset",
    apy: "Variable — see Markets",
    fees: "Reserve factor per market",
    lock: "None",
    withdraw: "Subject to available market liquidity",
    risks: "Smart contract, liquidity, oracle",
    available: true,
  },
  {
    name: "Liquidity provision",
    source: "Trading fees from swap pools",
    reward: "Pool assets",
    apy: "Variable",
    fees: "Pool fee share",
    lock: "None",
    withdraw: "Any time, at current pool ratio",
    risks: "Smart contract, impermanent loss, liquidity",
    available: false,
  },
  {
    name: "Pool incentives",
    source: "Protocol-defined incentive programs",
    reward: "ZNT",
    apy: "Not announced",
    fees: "—",
    lock: "Program-specific",
    withdraw: "Program-specific",
    risks: "Smart contract, token price",
    available: false,
  },
  {
    name: "Third-party yield",
    source: "Integrated Canton-native protocols",
    reward: "Varies",
    apy: "Not available",
    fees: "Varies",
    lock: "Varies",
    withdraw: "Varies",
    risks: "Smart contract, counterparty, liquidity",
    available: false,
  },
];

function Stake() {
  const { state, session, submit, setConnectOpen } = useZentra();
  const [mode, setMode] = useState<"stake" | "unstake">("stake");
  const [input, setInput] = useState("");
  const st = state.staking;
  const amount = parseAmount(input);
  const balance = mode === "stake" ? D(state.wallet[st.assetId] ?? 0) : D(st.staked);
  const error = !input ? null : !amount ? "Enter a valid number." : amount.lte(0) ? "Enter an amount greater than zero." : amount.gt(balance) ? `Amount exceeds your ${mode === "stake" ? "wallet" : "staked"} balance.` : null;

  const go = async () => {
    if (!session) return setConnectOpen(true);
    if (!amount || error) return;
    await submit({ kind: mode, assetId: st.assetId, amount: amount.toString() });
    setInput("");
  };

  return (
    <PageShell>
      <PageHeader
        title={<span className="flex items-center gap-3">Stake {IS_SIMULATED && <SimBadge />}</span>}
        subtitle="Holding ZNT does not earn rewards by itself. Rewards only accrue on staked ZNT, at a variable rate."
      />
      {!st.live && (
        <p className="mb-6 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/[0.07] p-4 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          ZNT staking goes live once the token and staking contracts are deployed on Canton Network. Everything on this
          page is a development preview with simulated figures.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Panel
          title={
            <span className="flex items-center gap-2">
              <TokenIcon kind="znt" className="size-7" /> ZNT staking
            </span>
          }
        >
          <div className="mb-4 inline-flex rounded-full border border-panel-border bg-field p-1">
            {(["stake", "unstake"] as const).map((m) => (
              <Button key={m} variant="tab" size="sm" className="h-8 px-5 capitalize" data-active={mode === m} onClick={() => { setMode(m); setInput(""); }}>
                {m}
              </Button>
            ))}
          </div>
          <div className="rounded-xl border border-panel-border bg-field p-4 focus-within:border-lime/60">
            <div className="flex justify-between text-xs text-text-2">
              <label htmlFor="stake-amt">Amount</label>
              {session && <span className="tabular">{mode === "stake" ? "Wallet" : "Staked"}: {fmt(balance, 4, { trim: true })} ZNT</span>}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                id="stake-amt"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={input}
                onChange={(e) => setInput(e.target.value.replace(",", "."))}
                className="min-w-0 flex-1 bg-transparent text-2xl font-medium tabular placeholder:text-muted-foreground focus:outline-none"
              />
              {session && (
                <Button variant="pill" size="row" onClick={() => setInput(balance.toString())}>Max</Button>
              )}
            </div>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
          <dl className="panel-row mt-4 divide-y divide-panel-border/50 px-4 py-1 text-sm">
            <div className="flex justify-between py-2"><dt className="text-text-2">Reward rate (variable)</dt><dd className="tabular">{fmtPct(st.rewardRate)}</dd></div>
            <div className="flex justify-between py-2"><dt className="text-text-2">Unstaking period</dt><dd>{st.lockDays} days</dd></div>
            {mode === "stake" && (
              <div className="flex justify-between py-2"><dt className="text-text-2">Est. yearly rewards</dt><dd className="tabular">{fmt((amount ?? D(0)).mul(st.rewardRate), 4, { trim: true })} ZNT</dd></div>
            )}
          </dl>
          <Button variant="action" size="xl" className="mt-5 w-full capitalize" disabled={!!session && (!amount || !!error)} onClick={go}>
            {session ? `Authorize ${mode}` : "Connect Wallet"}
          </Button>
        </Panel>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Total staked" value={`${fmt(st.totalStaked, 0)} ZNT`} />
            <StatTile label="Your stake" value={session ? `${fmt(st.staked, 4, { trim: true })} ZNT` : "—"} />
            <StatTile label="Pending rewards" value={session ? `${fmt(st.pendingRewards, 6, { trim: true })} ZNT` : "—"} />
            <div className="panel-row flex items-center justify-center p-3">
              <Button
                variant="action"
                className="w-full"
                disabled={!session || D(st.pendingRewards).lte(0)}
                onClick={() => submit({ kind: "claim", assetId: st.assetId, amount: "0" })}
              >
                Claim rewards
              </Button>
            </div>
          </div>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" /> Rates are variable and can change. Rewards are never guaranteed.
          </p>
        </div>
      </div>

      <Panel title="Yield strategies" className="mt-8">
        <div className="overflow-x-auto scrollbar-lime">
          <table className="w-full min-w-[960px] text-left text-[13px]">
            <thead className="text-text-2">
              <tr>
                {["Strategy", "Yield source", "Reward", "APY", "Fees", "Lock-up", "Withdrawals", "Risks"].map((h) => (
                  <th key={h} className="px-3 py-2 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STRATEGIES.map((s) => (
                <tr key={s.name} className="border-t border-panel-border/50 align-top">
                  <td className="px-3 py-3 font-medium">
                    {s.name}
                    {!s.available && <span className="mt-1 block text-xs font-normal text-warning">Coming later</span>}
                  </td>
                  <td className="px-3 py-3 text-text-2">{s.source}</td>
                  <td className="px-3 py-3">{s.reward}</td>
                  <td className="px-3 py-3">{s.apy}</td>
                  <td className="px-3 py-3 text-text-2">{s.fees}</td>
                  <td className="px-3 py-3 text-text-2">{s.lock}</td>
                  <td className="px-3 py-3 text-text-2">{s.withdraw}</td>
                  <td className="px-3 py-3 text-text-2">{s.risks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </PageShell>
  );
}
