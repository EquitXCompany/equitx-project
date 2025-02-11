import { Repository, LessThan, MoreThanOrEqual } from "typeorm";
import { CDP, CDPStatus } from "../entity/CDP";
import { CDPHistory, CDPHistoryAction } from "../entity/CDPHistory";
import { RISK_THRESHOLDS } from '../config/thresholds';
import { AppDataSource } from "../ormconfig";
import BigNumber from "bignumber.js";

export class UserRiskScoreService {
  private cdpRepository: Repository<CDP>;
  private cdpHistoryRepository: Repository<CDPHistory>;

  constructor() {
    this.cdpRepository = AppDataSource.getRepository(CDP);
    this.cdpHistoryRepository = AppDataSource.getRepository(CDPHistory);
  }

  static async create(): Promise<UserRiskScoreService> {
    return new UserRiskScoreService();
  }

  async calculateUserRiskScore(userAddress: string): Promise<number> {
    const userCDPs = await this.cdpRepository.find({
      where: {
        lender: userAddress,
        status: CDPStatus.Open
      },
      relations: ['asset']
    });
    const liquidationHistory = await this.cdpHistoryRepository.find({
      where: {
        lender: userAddress,
        action: CDPHistoryAction.LIQUIDATE
      },
      order: { timestamp: 'DESC' },
    });

    const liquidationScore = this.calculateLiquidationScore(liquidationHistory);
    const collateralScore = this.calculateCollateralScore(userCDPs);
    const ageScore = this.calculatePositionAgeScore(userCDPs);
    const activityScore = await this.calculateActivityScore(userAddress);

    const finalScore = Math.min(100, Math.round(
      liquidationScore * RISK_THRESHOLDS.USER_RISK.LIQUIDATION_WEIGHT +
      collateralScore * RISK_THRESHOLDS.USER_RISK.COLLATERAL_RATIO_WEIGHT +
      ageScore * RISK_THRESHOLDS.USER_RISK.POSITION_AGE_WEIGHT +
      activityScore * RISK_THRESHOLDS.USER_RISK.ACTIVITY_WEIGHT
    ));

    return finalScore;
  }

  private calculateLiquidationScore(liquidationHistory: CDPHistory[]): number {
    if (liquidationHistory.length === 0) return 0;

    const now = Date.now();
    const recentLiquidations = liquidationHistory.filter(l =>
      now - l.timestamp.getTime() <= RISK_THRESHOLDS.LIQUIDATION.RECENT_TIMEFRAME
    ).length;

    const recentScore = Math.min(60, recentLiquidations * 30);
    const historicalScore = Math.min(40, liquidationHistory.length * 10);

    return recentScore + historicalScore;
  }

  private calculateCollateralScore(cdps: CDP[]): number {
    if (cdps.length === 0) return 0;

    let totalDebt = new BigNumber(0);
    let weightedRatioSum = new BigNumber(0);

    cdps.forEach(cdp => {
      const debt = new BigNumber(cdp.asset_lent);
      const collateral = new BigNumber(cdp.xlm_deposited);

      if (!debt.isZero()) {
        const ratio = collateral.dividedBy(debt);
        weightedRatioSum = weightedRatioSum.plus(ratio.multipliedBy(debt));
        totalDebt = totalDebt.plus(debt);
      }
    });

    const avgCollateralRatio = totalDebt.isZero() ?
      new BigNumber(0) :
      weightedRatioSum.dividedBy(totalDebt);

    if (avgCollateralRatio.isLessThan(1.1)) return 100;
    if (avgCollateralRatio.isLessThan(1.2)) return 90;
    if (avgCollateralRatio.isLessThan(1.3)) return 75;
    if (avgCollateralRatio.isLessThan(1.5)) return 50;
    if (avgCollateralRatio.isLessThan(2.0)) return 25;
    return 10;
  }

  private calculatePositionAgeScore(cdps: CDP[]): number {
    if (cdps.length === 0) return 0;

    const now = Date.now();
    const avgAgeInDays = cdps.reduce((sum, cdp) =>
      sum + (now - cdp.created_at.getTime()) / (1000 * 60 * 60 * 24), 0
    ) / cdps.length;

    if (avgAgeInDays < 1) return 100;
    if (avgAgeInDays < 7) return 75;
    if (avgAgeInDays < 30) return 50;
    if (avgAgeInDays < 90) return 25;
    return 10;
  }

  private async calculateActivityScore(userAddress: string): Promise<number> {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentActivities = await this.cdpHistoryRepository.find({
      where: {
        lender: userAddress,
        timestamp: MoreThanOrEqual(last24Hours)
      }
    });

    const actionCounts = new Map<CDPHistoryAction, number>();
    recentActivities.forEach(activity => {
      actionCounts.set(
        activity.action,
        (actionCounts.get(activity.action) || 0) + 1
      );
    });

    const riskActions = [
      CDPHistoryAction.BORROW_ASSET,
      CDPHistoryAction.WITHDRAW_COLLATERAL
    ];

    const riskActionCount = riskActions.reduce((count, action) =>
      count + (actionCounts.get(action) || 0), 0
    );

    if (riskActionCount > 10) return 100;
    if (riskActionCount > 5) return 75;
    if (riskActionCount > 3) return 50;
    if (riskActionCount > 1) return 25;
    return 0;
  }
}
