import type { Asset, LedgerState, Market, RateModel } from "./types";

/**
 * SIMULATED DEVELOPMENT DATA. None of these figures come from Canton Network.
 * Replace by wiring a real LedgerAdapter for canton-test / production.
 */
export const ASSETS: Asset[] = [
  { id: "CC", symbol: "CC", name: "Canton Coin", decimals: 10, icon: "cc" },
  { id: "ZNT", symbol: "ZNT", name: "Zentra", decimals: 10, icon: "znt" },
  { id: "cETH", symbol: "cETH", name: "Canton-wrapped Ether", decimals: 10, icon: "eth" },
  { id: "cBNB", symbol: "cBNB", name: "Canton-wrapped BNB", decimals: 10, icon: "bnb" },
  { id: "BTC", symbol: "BTC", name: "Bitcoin (bridged)", decimals: 8, icon: "btc" },
  { id: "ETH", symbol: "ETH", name: "Ether (bridged)", decimals: 10, icon: "eth" },
  { id: "USDT", symbol: "USDT", name: "Tether USD (bridged)", decimals: 6, icon: "usdt" },
  { id: "BNB", symbol: "BNB", name: "BNB (bridged)", decimals: 10, icon: "bnb" },
];

const rm = (base: string, slope1: string, slope2: string, opt: string): RateModel => ({
  base,
  slope1,
  slope2,
  optimalUtilization: opt,
});

const supplyMarket = (
  assetId: string,
  totalSupplied: string,
  totalBorrowed: string,
  maxLtv: string,
  lt: string,
  model: RateModel,
): Market => ({
  assetId,
  status: "active",
  supplyEnabled: true,
  borrowEnabled: false,
  collateralEnabled: true,
  maxLtv,
  liquidationThreshold: lt,
  liquidationBonus: "0.05",
  reserveFactor: "0.1",
  totalSupplied,
  totalBorrowed,
  supplyCap: "100000000",
  borrowCap: "0",
  rateModel: model,
  stableBorrowRate: null,
});

const borrowMarket = (
  assetId: string,
  totalSupplied: string,
  totalBorrowed: string,
  model: RateModel,
  stable: string | null,
): Market => ({
  assetId,
  status: "active",
  supplyEnabled: false,
  borrowEnabled: true,
  collateralEnabled: false,
  maxLtv: "0",
  liquidationThreshold: "0",
  liquidationBonus: "0.05",
  reserveFactor: "0.15",
  totalSupplied,
  totalBorrowed,
  supplyCap: "100000000",
  borrowCap: totalSupplied,
  rateModel: model,
  stableBorrowRate: stable,
});

export function createDevState(now: number): LedgerState {
  const markets: Market[] = [
    supplyMarket("CC", "2400000", "1550000", "0.65", "0.75", rm("0.01", "0.07", "0.6", "0.8")),
    supplyMarket("ZNT", "8000000", "6100000", "0.5", "0.6", rm("0.02", "0.09", "0.8", "0.75")),
    supplyMarket("cETH", "1200", "960", "0.8", "0.85", rm("0.01", "0.1", "0.8", "0.8")),
    supplyMarket("cBNB", "9000", "3200", "0.7", "0.8", rm("0.005", "0.05", "0.6", "0.8")),
    borrowMarket("BTC", "40", "35", rm("0.01", "0.03", "0.6", "0.9"), "0.03"),
    borrowMarket("ETH", "400", "340", rm("0.02", "0.04", "0.7", "0.85"), "0.045"),
    borrowMarket("USDT", "2500000", "2100000", rm("0.03", "0.05", "0.5", "0.85"), "0.07"),
    borrowMarket("BNB", "1500", "1000", rm("0.02", "0.05", "0.6", "0.75"), "0.038"),
  ];
  const price = (assetId: string, priceUsd: string) => ({
    assetId,
    priceUsd,
    observedAt: now,
    source: "dev-oracle (simulated)",
  });
  return {
    assets: ASSETS,
    markets,
    prices: [
      price("CC", "0.8935"),
      price("ZNT", "0.12"),
      price("cETH", "2000"),
      price("cBNB", "600"),
      price("BTC", "60000"),
      price("ETH", "2000"),
      price("USDT", "1"),
      price("BNB", "600"),
    ],
    pools: [
      { id: "CC-USDT", assetA: "CC", assetB: "USDT", reserveA: "1000000", reserveB: "893500", feeBps: 30 },
      { id: "ZNT-CC", assetA: "ZNT", assetB: "CC", reserveA: "3000000", reserveB: "402910", feeBps: 30 },
      { id: "ETH-USDT", assetA: "ETH", assetB: "USDT", reserveA: "250", reserveB: "500000", feeBps: 30 },
      { id: "BTC-USDT", assetA: "BTC", assetB: "USDT", reserveA: "10", reserveB: "600000", feeBps: 30 },
      { id: "BNB-USDT", assetA: "BNB", assetB: "USDT", reserveA: "800", reserveB: "480000", feeBps: 30 },
    ],
    wallet: {
      CC: "253",
      ZNT: "5953",
      cETH: "3.05",
      cBNB: "12.01",
      BTC: "0",
      ETH: "0.85",
      USDT: "1250",
      BNB: "0",
    },
    supplies: [
      { assetId: "CC", amount: "5433", useAsCollateral: true },
      { assetId: "cBNB", amount: "10", useAsCollateral: true },
    ],
    borrows: [{ assetId: "ETH", amount: "2", rateMode: "variable" }],
    staking: {
      assetId: "ZNT",
      staked: "0",
      pendingRewards: "0",
      rewardRate: "0.08",
      totalStaked: "1250000",
      lockDays: 14,
      live: false,
    },
    txs: [],
  };
}
