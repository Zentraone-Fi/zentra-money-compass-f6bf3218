import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ArrowDownUp, Info } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { PageHeader, PageShell } from "@/components/zentra/PageHeader";
import { Panel, SimBadge } from "@/components/zentra/Panel";
import { TokenSelect } from "@/components/zentra/TokenSelect";
import { D, fmt, fmtPct, parseAmount } from "@/lib/zentra/decimal";
import { IS_SIMULATED } from "@/lib/zentra/env";
import { useZentra } from "@/lib/zentra/store";
import { quoteSwap } from "@/lib/zentra/swap";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/swap")({
  head: () => ({
    meta: [
      { title: "Swap — ZENTRA Finance" },
      { name: "description", content: "Swap Canton Network assets on ZENTRA with clear price impact, fees, slippage and routing." },
      { property: "og:title", content: "Swap — ZENTRA Finance" },
      { property: "og:description", content: "Swap Canton assets with clear price impact, fees, slippage and routing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Swap,
});

const SLIPPAGE = ["0.001", "0.005", "0.01"];

function Swap() {
  const { state, session, submit, setConnectOpen } = useZentra();
  const tradable = useMemo(() => {
    const ids = new Set(state.pools.flatMap((p) => [p.assetA, p.assetB]));
    return state.assets.filter((a) => ids.has(a.id));
  }, [state.pools, state.assets]);
  const [from, setFrom] = useState("CC");
  const [to, setTo] = useState("USDT");
  const [input, setInput] = useState("");
  const [slippage, setSlippage] = useState("0.005");

  const amount = parseAmount(input);
  const quote = amount ? quoteSwap(state.pools, from, to, amount, D(slippage)) : null;
  const balance = D(state.wallet[from] ?? 0);
  const insufficient = !!session && !!amount && amount.gt(balance);
  const highImpact = quote?.ok && quote.value.priceImpact.gt(0.05);
  const sym = (id: string) => state.assets.find((a) => a.id === id)?.symbol ?? id;

  const flip = () => {
    setFrom(to);
    setTo(from);
    setInput("");
  };

  const onSwap = async () => {
    if (!session) return setConnectOpen(true);
    if (!quote?.ok || !amount) return;
    await submit({ kind: "swap", assetId: from, counterAssetId: to, amount: amount.toString(), minOut: quote.value.minimumReceived.toString() });
    setInput("");
  };

  return (
    <PageShell>
      <PageHeader
        title={<span className="flex items-center gap-3">Swap {IS_SIMULATED && <SimBadge />}</span>}
        subtitle="Only routes backed by available pool liquidity are offered."
      />
      <div className="mx-auto max-w-[480px]">
        <Panel>
          <div className="space-y-1">
            <div className="rounded-xl border border-panel-border bg-field p-4">
              <div className="flex justify-between text-xs text-text-2">
                <label htmlFor="swap-from">You pay</label>
                {session && (
                  <button type="button" className="tabular hover:text-lime" onClick={() => setInput(balance.toString())}>
                    Balance: {fmt(balance, 4, { trim: true })} · Max
                  </button>
                )}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <input
                  id="swap-from"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  value={input}
                  onChange={(e) => setInput(e.target.value.replace(",", "."))}
                  className="min-w-0 flex-1 bg-transparent text-2xl font-medium tabular placeholder:text-muted-foreground focus:outline-none"
                />
                <TokenSelect assets={tradable} value={from} onChange={(v) => (v === to ? flip() : setFrom(v))} label="Token to pay" />
              </div>
            </div>
            <div className="relative z-10 -my-3 flex justify-center">
              <Button variant="outline" size="icon" onClick={flip} aria-label="Switch tokens" className="rounded-full border-panel-border bg-panel">
                <ArrowDownUp />
              </Button>
            </div>
            <div className="rounded-xl border border-panel-border bg-field p-4">
              <div className="flex justify-between text-xs text-text-2">
                <span>You receive (estimated)</span>
                {session && <span className="tabular">Balance: {fmt(state.wallet[to] ?? 0, 4, { trim: true })}</span>}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <output className="min-w-0 flex-1 truncate text-2xl font-medium tabular text-foreground/90">
                  {quote?.ok ? fmt(quote.value.amountOut, 6, { trim: true }) : "0.00"}
                </output>
                <TokenSelect assets={tradable} value={to} onChange={(v) => (v === from ? flip() : setTo(v))} label="Token to receive" />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 text-xs text-text-2">
            <span>Slippage tolerance</span>
            <div className="flex gap-1">
              {SLIPPAGE.map((s) => (
                <Button key={s} variant="tab" size="sm" className="h-7 px-3 text-xs" data-active={slippage === s} onClick={() => setSlippage(s)}>
                  {fmtPct(s, 1)}
                </Button>
              ))}
            </div>
          </div>

          {input && quote && !quote.ok && (
            <p role="alert" className="mt-4 flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="size-4" /> {quote.error}
            </p>
          )}
          {input && !amount && <p role="alert" className="mt-4 text-sm text-destructive">Enter a valid number.</p>}

          {quote?.ok && (
            <dl className="panel-row mt-4 divide-y divide-panel-border/50 px-4 py-1 text-sm">
              {[
                ["Rate", `1 ${sym(from)} = ${fmt(quote.value.rate, 6, { trim: true })} ${sym(to)}`],
                ["Price impact", <span key="pi" className={cn(highImpact && "text-destructive")}>{fmtPct(quote.value.priceImpact)}</span>],
                ["Trading fee", `${(quote.value.feeBpsTotal / 100).toFixed(2)}%`],
                ["Minimum received", `${fmt(quote.value.minimumReceived, 6, { trim: true })} ${sym(to)}`],
                ["Route", quote.value.hops.map((h) => sym(h.from)).concat(sym(to)).join(" → ")],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-4 py-2">
                  <dt className="text-text-2">{k}</dt>
                  <dd className="text-right tabular">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          {highImpact && (
            <p className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> High price impact. You may receive much less than the market rate.
            </p>
          )}

          <Button
            variant="action"
            size="xl"
            className="mt-5 w-full"
            disabled={!!session && (!quote?.ok || insufficient)}
            onClick={onSwap}
          >
            {!session ? "Connect Wallet" : insufficient ? `Insufficient ${sym(from)}` : "Authorize & swap"}
          </Button>
          <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" /> If the price moves past your slippage tolerance before
            settlement, the swap is rejected and nothing is exchanged.
          </p>
        </Panel>
      </div>
    </PageShell>
  );
}
