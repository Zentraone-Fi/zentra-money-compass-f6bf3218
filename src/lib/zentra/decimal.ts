import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_DOWN });

export { Decimal };
export const D = (v: Decimal.Value) => new Decimal(v);
export const ZERO = new Decimal(0);

/** Parse user input; returns null for anything that isn't a plain non-negative decimal. */
export function parseAmount(input: string): Decimal | null {
  const t = input.trim();
  if (!/^\d*\.?\d+$|^\d+\.$/.test(t)) return null;
  try {
    return new Decimal(t);
  } catch {
    return null;
  }
}

function group(intPart: string) {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Display-only formatting. Never feed the result back into calculations. */
export function fmt(value: Decimal.Value, dp = 2, opts: { trim?: boolean } = {}) {
  const d = new Decimal(value);
  let s = d.toFixed(dp, Decimal.ROUND_DOWN);
  if (opts.trim && s.includes(".")) s = s.replace(/\.?0+$/, "");
  const neg = s.startsWith("-");
  if (neg) s = s.slice(1);
  const [i, f] = s.split(".");
  return `${neg ? "-" : ""}${group(i)}${f ? "." + f : ""}`;
}

export function fmtUsd(value: Decimal.Value, dp = 2) {
  return `$${fmt(value, dp)}`;
}

export function fmtPct(rate: Decimal.Value, dp = 2) {
  return `${fmt(new Decimal(rate).mul(100), dp, { trim: true })}%`;
}
