import { D, type Decimal } from "./decimal";
import type { AssetId, PriceObservation, ValidationResult } from "./types";

/** Prices older than this are rejected for risk-sensitive operations. */
export const MAX_PRICE_AGE_MS = 5 * 60 * 1000;

export function getPrice(prices: PriceObservation[], assetId: AssetId): PriceObservation | undefined {
  return prices.find((p) => p.assetId === assetId);
}

export function isStale(obs: PriceObservation, now: number, maxAgeMs = MAX_PRICE_AGE_MS) {
  return now - obs.observedAt > maxAgeMs || obs.observedAt > now + 60_000;
}

/** Returns a validated price or an error — never silently falls back. */
export function validPrice(
  prices: PriceObservation[],
  assetId: AssetId,
  now: number,
  maxAgeMs = MAX_PRICE_AGE_MS,
): ValidationResult<Decimal> {
  const obs = getPrice(prices, assetId);
  if (!obs) return { ok: false, error: `No price available for ${assetId}.` };
  const p = D(obs.priceUsd);
  if (!p.isFinite() || p.lte(0)) return { ok: false, error: `Invalid price for ${assetId}.` };
  if (isStale(obs, now, maxAgeMs))
    return { ok: false, error: `Price for ${assetId} is stale. Try again once the oracle updates.` };
  return { ok: true, value: p };
}

/** Display price without validity checks (UI only). */
export function displayPrice(prices: PriceObservation[], assetId: AssetId): Decimal {
  const obs = getPrice(prices, assetId);
  return obs ? D(obs.priceUsd) : D(0);
}
