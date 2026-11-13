import { D, Decimal, ZERO } from "./decimal";
import type { Market } from "./types";

export function utilization(m: Pick<Market, "totalSupplied" | "totalBorrowed">): Decimal {
  const s = D(m.totalSupplied);
  if (s.lte(0)) return ZERO;
  return Decimal.min(D(m.totalBorrowed).div(s), 1);
}

/** Kinked utilization-based variable borrow rate (annual). */
export function variableBorrowRate(m: Market): Decimal {
  const u = utilization(m);
  const { base, slope1, slope2, optimalUtilization } = m.rateModel;
  const opt = D(optimalUtilization);
  if (u.lte(opt)) return D(base).add(D(slope1).mul(u).div(opt));
  return D(base)
    .add(slope1)
    .add(D(slope2).mul(u.sub(opt)).div(D(1).sub(opt)));
}

/** Supply rate = borrow rate × utilization × (1 − reserve factor). */
export function supplyRate(m: Market): Decimal {
  return variableBorrowRate(m).mul(utilization(m)).mul(D(1).sub(m.reserveFactor));
}

export function availableLiquidity(m: Market): Decimal {
  return Decimal.max(D(m.totalSupplied).sub(m.totalBorrowed), 0);
}
