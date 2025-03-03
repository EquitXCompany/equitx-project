import BigNumber from "bignumber.js";
import { XAssetSymbol } from "../../contracts/contractConfig";

export interface TimestampRange {
  start_time?: string;
  end_time?: string;
}

export interface CDPMetricsData {
  asset: XAssetSymbol;
  totalCDPs: number;
  totalXLMLocked: BigNumber;
  interestMetrics: {
    totalOutstandingInterest: BigNumber;
    totalPaidInterest: BigNumber;
  };
  collateralRatio: BigNumber;
  riskMetrics: {
    nearLiquidation: number;
    recentLiquidations: number;
    healthScore: number;
  };
  volumeMetrics: {
    dailyVolume: BigNumber;
    weeklyVolume: BigNumber;
    monthlyVolume: BigNumber;
  };
  collateralRatioHistogram: {
    bucketSize: number;
    min: number;
    max: number;
    buckets: BigNumber[];
  };
  timestamp: Date;
}

export interface LiquidationData {
  cdpId: string;
  asset: XAssetSymbol;
  collateralLiquidated: BigNumber;
  collateralLiquidatedUsd: BigNumber;
  principalRepaid: BigNumber;
  accruedInterestRepaid: BigNumber;
  collateralAppliedToInterest: BigNumber;
  timestamp: Date;
  collateralizationRatio: number;
  xlmPrice: BigNumber;
  xassetPrice: BigNumber;
}

export interface ProtocolStatsData {
  timestamp: Date;
  globalMetrics: {
    totalValueLocked: BigNumber;
    totalDebt: BigNumber;
    totalOutstandingInterest: BigNumber;
    totalPaidInterest: BigNumber;
    uniqueUsers: number;
    activeCDPs: number;
    totalStaked: BigNumber;
  };
  riskMetrics: {
    systemCollateralization: BigNumber;
    liquidationEvents24h: number;
    averageHealthFactor: BigNumber;
  };
  volumeMetrics: {
    dailyVolume: BigNumber;
  };
  growthMetrics: {
    userGrowth24h: number;
    tvlGrowth24h: number;
    volumeGrowth24h: number;
  };
}

export interface TVLMetricsData {
  asset: XAssetSymbol;
  totalXlmLocked: BigNumber;
  totalXassetsMinted: BigNumber;
  totalXassetsStaked: BigNumber;
  activeCDPsCount: number;
  tvlUSD: BigNumber;
  totalXassetsMintedUSD: BigNumber;
  totalXassetsStakedUSD: BigNumber;
  openAccounts: number;
  stakedShareHistogram: {
    bucketSize: number;
    min: number;
    max: number; 
    buckets: BigNumber[];
  };
  timestamp: Date;
}

export interface UserMetricsData {
  address: string;
  totalCDPs: number;
  activePositions: {
    totalValueLocked: BigNumber;
    totalDebt: BigNumber;
    totalAccruedInterest: BigNumber;
    totalInterestPaid: BigNumber;
    averageCollateralizationRatio: BigNumber;
  };
  historicalMetrics: {
    totalVolume: BigNumber;
    liquidationsReceived: number;
    liquidationsExecuted: number;
  };
  riskProfile: {
    riskScore: number;
    lastActivity: Date;
    averagePositionDuration: number;
  };
}

export interface UtilizationMetricsData {
  asset: XAssetSymbol;
  dailyActiveUsers: number;
  dailyTransactions: number;
  dailyXlmVolume: BigNumber;
  dailyXassetVolume: BigNumber;
  timestamp: Date;
}

export interface CDPHistoryData {
  id: string;
  lender: string;
  xlmDeposited: BigNumber;
  assetLent: BigNumber;
  xlmDelta: BigNumber;
  assetDelta: BigNumber;
  interestDelta: BigNumber;
  accruedInterest: BigNumber;
  interestPaid: BigNumber;
  action: string; // Enum as string
  asset: XAssetSymbol;
  originalCdpId: string;
  timestamp: Date;
}