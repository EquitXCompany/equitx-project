export const RISK_THRESHOLDS = {
  LIQUIDATION: {
    RECENT_TIMEFRAME: 24 * 60 * 60 * 1000, // 24 hours in ms
    NEAR_THRESHOLD: 1.2, // 120% collateralization ratio
  },
  HEALTH_SCORE: {
    EXCELLENT: 800,
    GOOD: 650,
    FAIR: 500,
    POOR: 350,
  },
  USER_RISK: {
    LIQUIDATION_WEIGHT: 0.4,
    COLLATERAL_RATIO_WEIGHT: 0.3,
    POSITION_AGE_WEIGHT: 0.2,
    ACTIVITY_WEIGHT: 0.1,
  },
  CDP_HEALTH: {
    CRITICAL_BUFFER: 1.05, // 5% above liquidation
    WARNING_BUFFER: 1.2,   // 20% above liquidation
    SAFE_BUFFER: 1.5,      // 50% above liquidation
    WEIGHTS: {
      COLLATERAL_RATIO: 0.4,  // 40%
      CRITICAL_POSITIONS: 0.25, // 25%
      WARNING_POSITIONS: 0.20,  // 20%
      RECENT_LIQUIDATIONS: 0.15 // 15%
    }
  }
};