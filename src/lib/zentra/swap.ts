import { D, Decimal, ZERO } from "./decimal";
import type { AssetId, LiquidityPool, ValidationResult } from "./types";

export interface SwapHop {
  poolId: string;
  from: AssetId;
  to: AssetId;
  amountIn: Decimal;
  amountOut: Decimal;
  fee: Decimal;
}

export interface SwapQuote {
  from: AssetId;
  to: AssetId;
  amountIn: Decimal;
  amountOut: Decimal;
  minimumReceived: Decimal;
  rate: Decimal; // to per 1 from
  priceImpact: Decimal; // 0..1
  feeBpsTotal: number;
  hops: SwapHop[];
}

function orient(pool: LiquidityPool, from: AssetId) {
  return pool.assetA === from
    ? { rIn: D(pool.reserveA), rOut: D(pool.reserveB), to: pool.assetB }
    : { rIn: D(pool.reserveB), rOut: D(pool.reserveA), to: pool.assetA };
}

function hop(pool: LiquidityPool, from: AssetId, amountIn: Decimal): SwapHop & { spot: Decimal } {
  const { rIn, rOut, to } = orient(pool, from);
  const fee = amountIn.mul(pool.feeBps).div(10_000);
  const inAfterFee = amountIn.sub(fee);
  const amountOut = inAfterFee.mul(rOut).div(rIn.add(inAfterFee));
  return { poolId: pool.id, from, to, amountIn, amountOut, fee, spot: rOut.div(rIn) };
}

const has = (p: LiquidityPool, a: AssetId) => p.assetA === a || p.assetB === a;

/** Finds a direct route, or a 2-hop route through a shared asset. Only real pools are used. */
export function findRoute(pools: LiquidityPool[], from: AssetId, to: AssetId): LiquidityPool[] | null {
  const direct = pools.find((p) => has(p, from) && has(p, to));
  if (direct) return [direct];
  for (const a of pools.filter((p) => has(p, from))) {
    const mid = a.assetA === from ? a.assetB : a.assetA;
    const b = pools.find((p) => p !== a && has(p, mid) && has(p, to));
    if (b) return [a, b];
  }
  return null;
}

export function quoteSwap(
  pools: LiquidityPool[],
  from: AssetId,
  to: AssetId,
  amountIn: Decimal,
  slippage: Decimal,
): ValidationResult<SwapQuote> {
  if (from === to) return { ok: false, error: "Choose two different tokens." };
  if (amountIn.lte(0)) return { ok: false, error: "Enter an amount greater than zero." };
  const route = findRoute(pools, from, to);
  if (!route) return { ok: false, error: "No route with available liquidity for this pair." };
  let cur = from;
  let amt = amountIn;
  let spot = D(1);
  const hops: SwapHop[] = [];
  for (const pool of route) {
    const h = hop(pool, cur, amt);
    spot = spot.mul(h.spot);
    hops.push(h);
    cur = h.to;
    amt = h.amountOut;
  }
  if (amt.lte(0)) return { ok: false, error: "Amount too small to trade." };
  const exec = amt.div(amountIn);
  const impact = Decimal.max(D(1).sub(exec.div(spot)), ZERO);
  return {
    ok: true,
    value: {
      from,
      to,
      amountIn,
      amountOut: amt,
      minimumReceived: amt.mul(D(1).sub(slippage)),
      rate: exec,
      priceImpact: impact,
      feeBpsTotal: route.reduce((s, p) => s + p.feeBps, 0),
      hops,
    },
  };
}
