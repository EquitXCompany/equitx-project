import { Repository, DataSource, MoreThan } from "typeorm";
import { CDPMetrics } from "../entity/CDPMetrics";
import { AppDataSource } from "../ormconfig";
import { Asset } from "../entity/Asset";
import { CDP, CDPStatus } from "../entity/CDP";
import { CDPHistory, CDPHistoryAction } from "../entity/CDPHistory";
import BigNumber from "bignumber.js";
import { RISK_THRESHOLDS } from "../config/thresholds";
import { LiquidityPool } from "../entity/LiquidityPool";
import { HealthScoreService } from './healthScoreService';


export class CDPMetricsService {
  private healthScoreService: HealthScoreService;
  private cdpMetricsRepository: Repository<CDPMetrics>;
  private cdpRepository: Repository<CDP>;
  private cdpHistoryRepository: Repository<CDPHistory>;

  constructor(private readonly dataSource: DataSource) {
    this.cdpMetricsRepository = this.dataSource.getRepository(CDPMetrics);
    this.cdpRepository = this.dataSource.getRepository(CDP);
    this.cdpHistoryRepository = this.dataSource.getRepository(CDPHistory);
    this.healthScoreService = new HealthScoreService(this.cdpHistoryRepository);
  }

  static async create(): Promise<CDPMetricsService> {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    return new CDPMetricsService(AppDataSource);
  }

  async findLatestByAsset(asset_symbol: string): Promise<CDPMetrics | null> {
    return this.cdpMetricsRepository
      .createQueryBuilder("metrics")
      .innerJoinAndSelect("metrics.asset", "asset")
      .where("asset.symbol = :asset_symbol", { asset_symbol })
      .orderBy("metrics.timestamp", "DESC")
      .getOne();
  }

  async findHistoricalByAsset(
    asset_symbol: string,
    startTime: Date,
    endTime: Date
  ): Promise<CDPMetrics[]> {
    return this.cdpMetricsRepository
      .createQueryBuilder("metrics")
      .innerJoinAndSelect("metrics.asset", "asset")
      .where("asset.symbol = :asset_symbol", { asset_symbol })
      .andWhere("metrics.timestamp BETWEEN :startTime AND :endTime", {
        startTime,
        endTime,
      })
      .orderBy("metrics.timestamp", "ASC")
      .getMany();
  }

  async insert(metrics: Partial<CDPMetrics>): Promise<CDPMetrics> {
    return this.cdpMetricsRepository.save(metrics);
  }

  async updateForAsset(asset: Asset): Promise<CDPMetrics> {
    const newMetrics = await this.calculateMetrics(asset);
    return this.cdpMetricsRepository.save(newMetrics);
  }

  private async getActiveCDPs(asset: Asset): Promise<CDP[]> {
    return this.cdpRepository
      .createQueryBuilder("cdp")
      .leftJoinAndSelect("cdp.asset", "asset")
      .leftJoinAndSelect("asset.liquidityPool", "liquidityPool")
      .where("cdp.asset_id = :assetId", { assetId: asset.id })
      .andWhere("cdp.status = :status", { status: CDPStatus.Open })
      .getMany();
  }

  private countCDPsNearLiquidation(cdps: CDP[]): number {
    return cdps.filter(cdp => {
      const healthFactor = this.healthScoreService.calculateCDPHealthFactor(cdp);
      return healthFactor <= RISK_THRESHOLDS.LIQUIDATION.NEAR_THRESHOLD;
    }).length;
  }

  private calculateAverageCollateralRatio(cdps: CDP[]): string {
    if (cdps.length === 0) return "0";

    return cdps
      .reduce((sum, cdp) => {
        const xlmValueInUsd = new BigNumber(cdp.xlm_deposited)
          .multipliedBy(cdp.asset.last_xlm_price);

        const assetValueInUsd = new BigNumber(cdp.asset_lent)
          .multipliedBy(cdp.asset.price);

        return sum.plus(
          xlmValueInUsd
            .dividedBy(assetValueInUsd)
            .multipliedBy(100)
        );
      }, new BigNumber(0))
      .dividedBy(cdps.length)
      .toFixed(5);
  }

  private async calculateMetrics(asset: Asset): Promise<Partial<CDPMetrics>> {
    const activeCDPs = await this.getActiveCDPs(asset);
    const liquidityPool = await this.dataSource
      .getRepository(LiquidityPool)
      .findOneBy({ asset_id: asset.id });

    if (!liquidityPool) {
      throw new Error(`No liquidity pool found for asset ${asset.id}`);
    }
    const activeCDPsCount = activeCDPs.length;
    const totalXLMLocked = activeCDPs
      .reduce((sum, cdp) => sum.plus(cdp.xlm_deposited), new BigNumber(0))
      .toString();

    const avgCollRatio = this.calculateAverageCollateralRatio(activeCDPs);

    const healthScore = await this.healthScoreService.calculateAssetHealthScore(
      asset,
      activeCDPs,
      liquidityPool
    );

    const now = new Date();
    const oneDayVolume = await this.calculateVolumeInRange(
      asset,
      new Date(now.getTime() - 24 * 60 * 60 * 1000),
      now
    );
    const oneWeekVolume = await this.calculateVolumeInRange(
      asset,
      new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      now
    );
    const oneMonthVolume = await this.calculateVolumeInRange(
      asset,
      new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      now
    );

    return {
      asset,
      active_cdps_count: activeCDPsCount,
      total_xlm_locked: totalXLMLocked,
      average_collateralization_ratio: avgCollRatio,
      cdps_near_liquidation: this.countCDPsNearLiquidation(activeCDPs),
      recent_liquidations: await this.healthScoreService.getRecentLiquidations(asset),
      health_score: healthScore,
      daily_volume: oneDayVolume,
      weekly_volume: oneWeekVolume,
      monthly_volume: oneMonthVolume
    };
  }

  private async calculateVolumeInRange(
    asset: Asset,
    startTime: Date,
    endTime: Date
  ): Promise<string> {
    const history = await this.cdpHistoryRepository.find({
      where: {
        asset: { id: asset.id },
        timestamp: MoreThan(startTime)
      }
    });

    return history
      .reduce((sum, record) => sum.plus(record.asset_lent), new BigNumber(0))
      .toString();
  }
}