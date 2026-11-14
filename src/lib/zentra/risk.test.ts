import { describe, expect, it } from "vitest";

import { D } from "./decimal";
import { createDevState } from "./dev-data";
import { applyRequest } from "./ledger";
import { validPrice } from "./oracle";
import { maxBorrowable, summarize, validateBorrow, validateRepay, validateSupply, validateWithdraw } from "./risk";
import { quoteSwap } from "./swap";

const NOW = 1_800_000_000_000;
const fresh = () => createDevState(NOW);

describe("ZENTRA risk rules", () => {
  it("rejects borrowing above the maximum LTV", () => {
    const s = fresh();
    const max = maxBorrowable(s, "ETH");
    expect(validateBorrow(s, "ETH", max.mul(0.99), NOW).ok).toBe(true);
    const r = validateBorrow(s, "ETH", max.add(0.01), NOW);
    expect(r.ok).toBe(false);
  });

  it("rejects borrowing with no collateral", () => {
    const s = { ...fresh(), supplies: [], borrows: [] };
    const r = validateBorrow(s, "USDT", D(1), NOW);
    expect(r).toEqual({ ok: false, error: "Supply collateral before borrowing." });
  });

  it("rejects withdrawing collateral that would drop health factor below 1", () => {
    const s = fresh();
    const r = validateWithdraw(s, "cBNB", D(10), NOW);
    expect(r.ok).toBe(false);
  });

  it("rejects repaying more than the outstanding debt", () => {
    const s = { ...fresh(), wallet: { ...fresh().wallet, ETH: "10" } };
    expect(validateRepay(s, "ETH", D("2.01")).ok).toBe(false);
    expect(validateRepay(s, "ETH", D(2)).ok).toBe(true);
  });

  it("rejects supplying more than the wallet balance", () => {
    expect(validateSupply(fresh(), "CC", D(254)).ok).toBe(false);
    expect(validateSupply(fresh(), "CC", D(253)).ok).toBe(true);
  });

  it("rejects withdrawing more than the market's available liquidity", () => {
    const s = fresh();
    s.markets = s.markets.map((m) => (m.assetId === "CC" ? { ...m, totalSupplied: "6000", totalBorrowed: "5990" } : m));
    s.borrows = [];
    const r = validateWithdraw(s, "CC", D(100), NOW);
    expect(r).toEqual({ ok: false, error: "Not enough available liquidity in this market right now." });
  });

  it("rejects stale oracle prices for borrowing", () => {
    const s = fresh();
    const later = NOW + 6 * 60 * 1000;
    expect(validPrice(s.prices, "ETH", later).ok).toBe(false);
    expect(validateBorrow(s, "ETH", D("0.1"), later).ok).toBe(false);
  });

  it("computes health factor as collateral × liquidation threshold ÷ debt", () => {
    const s = fresh();
    // CC 5433 × 0.8935 × 0.75 + cBNB 10 × 600 × 0.8 = 3640.85 + 4800 ; debt 2 ETH × 2000
    const hf = summarize(s).healthFactor!;
    expect(hf.toFixed(4)).toBe(D("5433").mul("0.8935").mul("0.75").add(4800).div(4000).toFixed(4));
  });

  it("applies a confirmed repay and removes a fully repaid loan", () => {
    const s = { ...fresh(), wallet: { ...fresh().wallet, ETH: "5" } };
    const r = applyRequest(s, { kind: "repay", assetId: "ETH", amount: "2" }, NOW);
    expect(r.ok && r.value.borrows.length).toBe(0);
    expect(r.ok && r.value.wallet["ETH"]).toBe("3");
  });

  it("rejects a swap when output falls below the minimum received", () => {
    const s = fresh();
    const q = quoteSwap(s.pools, "CC", "USDT", D(100), D("0.005"));
    expect(q.ok).toBe(true);
    if (!q.ok) return;
    const tooHigh = q.value.amountOut.add(1).toString();
    const r = applyRequest(s, { kind: "swap", assetId: "CC", counterAssetId: "USDT", amount: "100", minOut: tooHigh }, NOW);
    expect(r.ok).toBe(false);
  });
});
