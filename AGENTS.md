<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Protocol logic lives in `src/lib/zentra/` (pure TS, decimal.js); UI in `src/components/zentra/`. Why: keeps risk/rate math testable and separate from presentation.
- All amounts are decimal strings and all financial math uses `decimal.js`; JS numbers are for display only. Why: avoid floating-point drift in balances, interest and collateral.
- The UI talks to the protocol only through the `LedgerAdapter` and `WalletAdapter` interfaces; the in-memory dev adapter is used only when `VITE_ZENTRA_ENV` is `development` and every record it produces is flagged `simulated`. Why: the Canton ledger is the source of truth and simulated data must never pass as live.
- Frontend risk checks (`risk.ts`) are previews that mirror the Daml RiskEngine; the ledger adapter re-validates on confirmation. Why: liquidations and limits must be enforced by contracts, not the browser.
- Risk rules are covered by `src/lib/zentra/risk.test.ts`; add a test there when a rule changes. Why: these are the protocol's safety guarantees.
