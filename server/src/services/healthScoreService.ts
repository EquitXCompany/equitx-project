import { RISK_THRESHOLDS } from '../config/thresholds';
import { CDP } from '../entity/CDP';
import { CDPHistory, CDPHistoryAction } from '../entity/CDPHistory';
import { MoreThan, Repository } from 'typeorm';
import BigNumber from 'bignumber.js';
import { Asset } from '../entity/Asset';
import { LiquidityPool } from '../entity/LiquidityPool';

export class HealthScoreService {
  constructor(
    private readonly cdpHistoryRepository: Repository<CDPHistory>
  ) {}

  calculateCDPHealthFactor(cdp: CDP): number {
    // Health factor = (Collateral Value * 100) / (Debt Value * Minimum Collateral Ratio)
    const collateralValue = new BigNumber(cdp.xlm_deposited)
      .times(cdp.asset.last_xlm_price);
    const debtValue = new BigNumber(cdp.asset_lent)
      .times(cdp.asset.price);
    const minCollateralRatio = cdp.asset.liquidityPool.minimum_collateralization_ratio;
    
    return collateralValue
      .times(100)
      .div(debtValue.times(minCollateralRatio))
      .toNumber();
  }

  calculateCDPCRAboveMinimum(cdp: CDP): number {
    // Health factor = (Collateral Value * 100) / (Debt Value * Minimum Collateral Ratio)
    const collateralValue = new BigNumber(cdp.xlm_deposited)
      .times(cdp.asset.last_xlm_price);
    const debtValue = new BigNumber(cdp.asset_lent)
      .times(cdp.asset.price);
    const minCollateralRatio = cdp.asset.liquidityPool.minimum_collateralization_ratio / 100;
    const CR = collateralValue.times(100).div(debtValue);
    return CR.minus(minCollateralRatio).toNumber();
  }

  async calculateAssetHealthScore(
    asset: Asset,
    activeCDPs: CDP[],
    liquidityPool: LiquidityPool
  ): Promise<number> {
    const activeCDPsCount = activeCDPs.length;
    if (activeCDPsCount === 0) return 100; // Perfect health when no CDPs exist

    // Get minimum collateralization ratio
    const minCollRatio = new BigNumber(liquidityPool.minimum_collateralization_ratio)
      .dividedBy(100000);

    // Calculate collateralization ratios
    const collRatios = activeCDPs.map(cdp => 
      new BigNumber(cdp.xlm_deposited)
        .dividedBy(cdp.asset_lent)
        .multipliedBy(100)
    );

    const avgCollRatio = collRatios.reduce((sum, ratio) => sum.plus(ratio), new BigNumber(0))
      .dividedBy(collRatios.length);

    // Define risk thresholds
    const criticalThreshold = minCollRatio.multipliedBy(RISK_THRESHOLDS.CDP_HEALTH.CRITICAL_BUFFER);
    const warningThreshold = minCollRatio.multipliedBy(RISK_THRESHOLDS.CDP_HEALTH.WARNING_BUFFER);
    const safeThreshold = minCollRatio.multipliedBy(RISK_THRESHOLDS.CDP_HEALTH.SAFE_BUFFER);

    // Calculate risk categories
    const criticalCDPs = collRatios.filter(ratio => ratio.isLessThan(criticalThreshold)).length;
    const warningCDPs = collRatios.filter(ratio => 
      ratio.isGreaterThanOrEqualTo(criticalThreshold) && 
      ratio.isLessThan(warningThreshold)
    ).length;

    // Get recent liquidations
    const recentLiquidations = await this.getRecentLiquidations(asset);

    // Calculate individual components
    const collateralComponent = Math.min(
      Number(avgCollRatio.dividedBy(safeThreshold).multipliedBy(100)),
      100
    );

    const criticalComponent = (1 - (criticalCDPs / activeCDPsCount)) * 100;
    const warningComponent = (1 - (warningCDPs / activeCDPsCount)) * 100;
    const liquidationComponent = (1 - Math.min(recentLiquidations / activeCDPsCount, 1)) * 100;

    // Calculate weighted score
    return Math.max(0, Math.min(100, Math.floor(
      (collateralComponent * RISK_THRESHOLDS.CDP_HEALTH.WEIGHTS.COLLATERAL_RATIO) +
      (criticalComponent * RISK_THRESHOLDS.CDP_HEALTH.WEIGHTS.CRITICAL_POSITIONS) +
      (warningComponent * RISK_THRESHOLDS.CDP_HEALTH.WEIGHTS.WARNING_POSITIONS) +
      (liquidationComponent * RISK_THRESHOLDS.CDP_HEALTH.WEIGHTS.RECENT_LIQUIDATIONS)
    )));
  }

  public async getRecentLiquidations(asset: Asset): Promise<number> {
    const recentTimeframe = new Date(Date.now() - RISK_THRESHOLDS.LIQUIDATION.RECENT_TIMEFRAME);
    return this.cdpHistoryRepository.count({
      where: {
        asset: { id: asset.id },
        action: CDPHistoryAction.LIQUIDATE,
        timestamp: MoreThan(recentTimeframe)
      }
    });
  }

  getHealthScoreCategory(score: number): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
    if (score >= RISK_THRESHOLDS.HEALTH_SCORE.EXCELLENT) return 'EXCELLENT';
    if (score >= RISK_THRESHOLDS.HEALTH_SCORE.GOOD) return 'GOOD';
    if (score >= RISK_THRESHOLDS.HEALTH_SCORE.FAIR) return 'FAIR';
    return 'POOR';
  }
}