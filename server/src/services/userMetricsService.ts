import { Repository, DataSource, LessThan } from "typeorm";
import { UserMetrics } from "../entity/UserMetrics";
import { CDPService } from "./cdpService";
import { CDPHistoryService } from "./cdpHistoryService";
import { StakerService } from "./stakerService";
import { StakerHistoryService } from "./stakerHistoryService";
import { AppDataSource } from "../ormconfig";
import BigNumber from "bignumber.js";
import { CDPHistoryAction } from "../entity/CDPHistory";
import { StakerHistoryAction } from "../entity/StakerHistory";
import { UserRiskScoreService } from "./userRiskScoreService";
import { AssetService } from "./assetService";
import { DECIMALS_XASSET, DECIMALS_XLM } from "../config/constants";

export class UserMetricsService {
  private userMetricsRepository: Repository<UserMetrics>;

  constructor(private readonly dataSource: DataSource) {
    this.userMetricsRepository = this.dataSource.getRepository(UserMetrics);
  }

  static async create(): Promise<UserMetricsService> {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    return new UserMetricsService(AppDataSource);
  }

  async findByAddress(address: string): Promise<UserMetrics | null> {
    const metrics = await this.userMetricsRepository
      .createQueryBuilder("metrics")
      .where("metrics.address = :address", { address })
      .orderBy("metrics.timestamp", "DESC")
      .getOne();

    if (
      !metrics ||
      metrics.timestamp < new Date(Date.now() - 24 * 60 * 60 * 1000)
    ) {
      return this.updateForUser(address);
    }

    return metrics;
  }

  async findHistoricalByAddress(
    address: string,
    startTime: Date,
    endTime: Date
  ): Promise<UserMetrics[]> {
    return this.userMetricsRepository
      .createQueryBuilder("metrics")
      .where("metrics.address = :address", { address })
      .andWhere("metrics.timestamp BETWEEN :startTime AND :endTime", {
        startTime,
        endTime,
      })
      .orderBy("metrics.timestamp", "ASC")
      .getMany();
  }

  async insert(metrics: Partial<UserMetrics>): Promise<UserMetrics> {
    return this.userMetricsRepository.save(metrics);
  }

  async updateForUser(address: string): Promise<UserMetrics> {
    const newMetrics = await this.calculateMetrics(address);
    return this.userMetricsRepository.save(newMetrics);
  }

  async findTopUsers(limit: number = 10): Promise<UserMetrics[]> {
    return this.userMetricsRepository
      .createQueryBuilder("metrics")
      .orderBy("metrics.total_value_locked", "DESC")
      .limit(limit)
      .getMany();
  }

  private async calculateTotalAccruedInterest(cdps: any[]): Promise<string> {
    return cdps
      .reduce((sum, cdp) => {
        return sum.plus(new BigNumber(cdp.accrued_interest || "0"));
      }, new BigNumber(0))
      .toString();
  }

  private async calculateTotalInterestPaid(cdps: any[]): Promise<string> {
    return cdps
      .reduce((sum, cdp) => {
        return sum.plus(new BigNumber(cdp.interest_paid || "0"));
      }, new BigNumber(0))
      .toString();
  }

  private async calculateMetrics(
    address: string
  ): Promise<Partial<UserMetrics>> {
    const cdpService = await CDPService.create();
    const cdpHistoryService = await CDPHistoryService.create();
    const stakerService = await StakerService.create();
    const stakerHistoryService = await StakerHistoryService.create();
    const assetService = await AssetService.create();

    const activeCDPs = await cdpService.findByLender(address);
    const activeStakes = await stakerService.findByAddress(address);

    const cdpHistory = await cdpHistoryService.findByLender(address);
    const stakingHistory = await stakerHistoryService.findByAddress(address);

    const cdpValueInUSD = await Promise.all(
      activeCDPs.map(async (cdp) => {
        const asset = await assetService.findOne(cdp.asset.symbol);
        if (!asset) return new BigNumber(0);

        return new BigNumber(cdp.xlm_deposited)
          .multipliedBy(asset.last_xlm_price)
          .dividedBy(new BigNumber(10).pow(7));
      })
    );

    const stakingValueInUSD = await Promise.all(
      activeStakes.map(async (stake) => {
        const asset = await assetService.findOne(stake.asset.symbol);
        if (!asset) return new BigNumber(0);

        return new BigNumber(stake.xasset_deposit)
          .multipliedBy(asset.price)
          .dividedBy(new BigNumber(10).pow(DECIMALS_XASSET));
      })
    );

    const totalValueLocked = [...cdpValueInUSD, ...stakingValueInUSD]
      .reduce((sum, value) => sum.plus(value), new BigNumber(0))
      .toString();

    const cdpRatios = await Promise.all(
      activeCDPs.map(async (cdp) => {
        const asset = await assetService.findOne(cdp.asset.symbol);
        if (!asset) return null;

        const collateralValueUSD = new BigNumber(
          cdp.xlm_deposited
        ).multipliedBy(asset.last_xlm_price);

        const debtValueUSD = new BigNumber(cdp.asset_lent).multipliedBy(
          asset.price
        );

        return debtValueUSD.isZero()
          ? null
          : collateralValueUSD.dividedBy(debtValueUSD).multipliedBy(100);
      })
    );

    const validRatios = cdpRatios.filter(
      (ratio): ratio is BigNumber => ratio !== null
    );

    const avgCollateral =
      validRatios.length > 0
        ? validRatios
            .reduce((sum, ratio) => sum.plus(ratio), new BigNumber(0))
            .dividedBy(validRatios.length)
            .toFixed(5)
        : "0";

    const totalDebtInUSD = await Promise.all(
      activeCDPs.map(async (cdp) => {
        const asset = await assetService.findOne(cdp.asset.symbol);
        if (!asset) return new BigNumber(0);

        return new BigNumber(cdp.asset_lent)
          .multipliedBy(asset.price)
          .dividedBy(new BigNumber(10).pow(DECIMALS_XASSET));
      })
    );

    const totalDebt = totalDebtInUSD
      .reduce((sum, value) => sum.plus(value), new BigNumber(0))
      .toString();

    const cdpVolumeInUSD = await Promise.all(
      cdpHistory.map(async (history) => {
        const asset = history.asset;
        if (!asset) return new BigNumber(0);

        return new BigNumber(history.xlm_delta)
          .abs()
          .multipliedBy(asset.last_xlm_price)
          .dividedBy(new BigNumber(10).pow(DECIMALS_XLM));
      })
    );

    const stakingVolumeInUSD = await Promise.all(
      stakingHistory.map(async (history) => {
        const asset = history.asset;
        if (!asset) return new BigNumber(0);

        return new BigNumber(history.xasset_delta)
          .abs()
          .multipliedBy(asset.price)
          .dividedBy(new BigNumber(10).pow(DECIMALS_XASSET));
      })
    );

    const totalVolume = [...cdpVolumeInUSD, ...stakingVolumeInUSD]
      .reduce((sum, value) => sum.plus(value), new BigNumber(0))
      .toString();

    const liquidationsReceived = cdpHistory.filter(
      (history) => history.action === CDPHistoryAction.LIQUIDATE
    ).length;

    const positionDurations = [
      ...cdpHistory
        .filter((h) => h.action === CDPHistoryAction.OPEN)
        .map((openEvent) => {
          const closeEvent = cdpHistory.find(
            (h) =>
              h.original_cdp_id === openEvent.original_cdp_id &&
              h.action === CDPHistoryAction.LIQUIDATE
          );
          return closeEvent
            ? (closeEvent.timestamp.getTime() - openEvent.timestamp.getTime()) /
                1000
            : (Date.now() - openEvent.timestamp.getTime()) / 1000;
        }),
      ...stakingHistory
        .filter((h) => h.action === StakerHistoryAction.STAKE)
        .map((stakeEvent) => {
          const unstakeEvent = stakingHistory.find(
            (h) =>
              h.original_staker_id === stakeEvent.original_staker_id &&
              h.action === StakerHistoryAction.UNSTAKE
          );
          return unstakeEvent
            ? (unstakeEvent.timestamp.getTime() -
                stakeEvent.timestamp.getTime()) /
                1000
            : (Date.now() - stakeEvent.timestamp.getTime()) / 1000;
        }),
    ];

    const avgPositionDuration =
      positionDurations.length > 0
        ? Math.floor(
            positionDurations.reduce((a, b) => a + b) / positionDurations.length
          )
        : 0;

    const userRiskScoreService = await UserRiskScoreService.create();
    const riskScore =
      await userRiskScoreService.calculateUserRiskScore(address);

    const lastActivity = new Date(
      Math.max(
        ...cdpHistory.map((h) => h.timestamp.getTime()),
        ...stakingHistory.map((h) => h.timestamp.getTime()),
        0
      )
    );

    const totalAccruedInterest =
      await this.calculateTotalAccruedInterest(activeCDPs);
    const totalInterestPaid = await this.calculateTotalInterestPaid(activeCDPs);

    return {
      address,
      total_cdps: activeCDPs.length,
      total_value_locked: totalValueLocked,
      total_debt: totalDebt,
      total_accrued_interest: totalAccruedInterest, // Add this line
      total_interest_paid: totalInterestPaid, // Add this line
      avg_collateralization_ratio: avgCollateral,
      total_volume: totalVolume,
      liquidations_received: liquidationsReceived,
      liquidations_executed: 0,
      risk_score: riskScore,
      last_activity: lastActivity,
      avg_position_duration: avgPositionDuration,
      timestamp: new Date(),
    };
  }
}
