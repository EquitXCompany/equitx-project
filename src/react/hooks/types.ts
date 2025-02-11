// First, let's create a shared types file to avoid repetition
import BigNumber from "bignumber.js";

// Common timestamp interface
export interface TimestampRange {
  start_time?: string;
  end_time?: string;
}

// Using the resource types directly
export interface CDPMetricsData {
  asset: string;
  totalCDPs: number;
  totalXLMLocked: BigNumber;
  averageCollateralizationRatio: BigNumber;
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
  timestamp: Date;
}

export interface LiquidationData {
  cdpId: string;
  asset: string;
  liquidatedAmount: BigNumber;
  debtCovered: BigNumber;
  timestamp: Date;
  collateralizationRatioAtLiquidation: BigNumber;
}

export interface ProtocolStatsData {
  timestamp: Date;
  globalMetrics: {
    totalValueLocked: BigNumber;
    totalDebt: BigNumber;
    uniqueUsers: number;
    activeCDPs: number;
  };
  riskMetrics: {
    systemCollateralization: BigNumber;
    liquidationEvents24h: number;
    averageHealthFactor: BigNumber;
  };
  volumeMetrics: {
    dailyVolume: BigNumber;
    cumulativeVolume: BigNumber;
    fees24h: BigNumber;
  };
  growthMetrics: {
    userGrowth24h: number;
    tvlGrowth24h: number;
    volumeGrowth24h: number;
  };
}

export interface TVLMetricsData {
  asset: string;
  totalXlmLocked: BigNumber;
  totalXassetsMinted: BigNumber;
  activeCDPsCount: number;
  tvlUSD: BigNumber;
  timestamp: Date;
}

export interface UserMetricsData {
  address: string;
  totalCDPs: number;
  activePositions: {
    totalValueLocked: BigNumber;
    totalDebt: BigNumber;
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
  asset: string;
  dailyActiveUsers: number;
  dailyTransactions: number;
  dailyXlmVolume: BigNumber;
  dailyXassetVolume: BigNumber;
  timestamp: Date;
}
