/** Core ZENTRA protocol types. Amounts are decimal strings to avoid float drift. */
export type AssetId = string;
export type DecimalString = string;

export type AssetIconKind = "cc" | "znt" | "eth" | "bnb" | "btc" | "usdt";

export interface Asset {
  id: AssetId;
  symbol: string;
  name: string;
  decimals: number;
  icon: AssetIconKind;
}

export interface PriceObservation {
  assetId: AssetId;
  priceUsd: DecimalString;
  observedAt: number; // ms epoch
  source: string;
}

export interface RateModel {
  base: DecimalString; // annual, e.g. "0.01"
  slope1: DecimalString;
  slope2: DecimalString;
  optimalUtilization: DecimalString;
}

export type MarketStatus = "active" | "paused" | "frozen";

export interface Market {
  assetId: AssetId;
  status: MarketStatus;
  supplyEnabled: boolean;
  borrowEnabled: boolean;
  collateralEnabled: boolean;
  maxLtv: DecimalString; // 0..1
  liquidationThreshold: DecimalString; // 0..1
  liquidationBonus: DecimalString;
  reserveFactor: DecimalString;
  totalSupplied: DecimalString;
  totalBorrowed: DecimalString;
  supplyCap: DecimalString;
  borrowCap: DecimalString;
  rateModel: RateModel;
  /** Only set where a real stable-rate mechanism exists for the market. */
  stableBorrowRate: DecimalString | null;
}

export interface SupplyPosition {
  assetId: AssetId;
  amount: DecimalString;
  useAsCollateral: boolean;
}

export interface BorrowPosition {
  assetId: AssetId;
  amount: DecimalString;
  rateMode: "variable" | "stable";
}

export type TxStatus =
  | "draft"
  | "awaiting_authorization"
  | "submitted"
  | "pending_confirmation"
  | "confirmed"
  | "rejected"
  | "failed"
  | "expired";

export type TxKind =
  | "supply"
  | "withdraw"
  | "borrow"
  | "repay"
  | "swap"
  | "stake"
  | "unstake"
  | "claim";

export interface TxRecord {
  id: string;
  kind: TxKind;
  assetId: AssetId;
  amount: DecimalString;
  counterAssetId?: AssetId | undefined;
  counterAmount?: DecimalString | undefined;
  status: TxStatus;
  createdAt: number;
  updatedAt: number;
  simulated: boolean;
  error?: string | undefined;
}

export interface LiquidityPool {
  id: string;
  assetA: AssetId;
  assetB: AssetId;
  reserveA: DecimalString;
  reserveB: DecimalString;
  feeBps: number;
}

export interface StakingState {
  assetId: AssetId;
  staked: DecimalString;
  pendingRewards: DecimalString;
  rewardRate: DecimalString; // annual, variable
  totalStaked: DecimalString;
  lockDays: number;
  live: boolean; // false until token + staking contracts are deployed
}

export interface LedgerState {
  assets: Asset[];
  markets: Market[];
  prices: PriceObservation[];
  pools: LiquidityPool[];
  wallet: Record<AssetId, DecimalString>;
  supplies: SupplyPosition[];
  borrows: BorrowPosition[];
  staking: StakingState;
  txs: TxRecord[];
}

export type ValidationResult<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; error: string };
