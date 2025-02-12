import { Repository, DataSource, Between, MoreThan } from "typeorm";
import { UtilizationMetrics } from "../entity/UtilizationMetrics";
import { CDPHistory } from "../entity/CDPHistory";
import { StakerHistory } from "../entity/StakerHistory";
import { Asset } from "../entity/Asset";
import { AppDataSource } from "../ormconfig";
import BigNumber from "bignumber.js";

export class UtilizationMetricsService {
  private utilizationMetricsRepository: Repository<UtilizationMetrics>;
  private cdpHistoryRepository: Repository<CDPHistory>;
  private stakerHistoryRepository: Repository<StakerHistory>;

  constructor(private readonly dataSource: DataSource) {
    this.utilizationMetricsRepository = this.dataSource.getRepository(UtilizationMetrics);
    this.cdpHistoryRepository = this.dataSource.getRepository(CDPHistory);
    this.stakerHistoryRepository = this.dataSource.getRepository(StakerHistory);
  }

  static async create(): Promise<UtilizationMetricsService> {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    return new UtilizationMetricsService(AppDataSource);
  }

  private sumBigNumbersAbs(numbers: string[]): string {
    return numbers.reduce(
      (sum, current) => sum.plus(new BigNumber(current).abs()),
      new BigNumber(0)
    ).toString();
  }

  async calculateDailyMetrics(asset: Asset, startDate: Date): Promise<UtilizationMetrics> {
    // Get CDP history for the day
    const cdpHistory = await this.cdpHistoryRepository.find({
      where: {
        asset: { id: asset.id },
        timestamp: MoreThan(startDate)
      }
    });

    // Get Staker history for the day
    const stakerHistory = await this.stakerHistoryRepository.find({
      where: {
        asset: { id: asset.id },
        timestamp: MoreThan(startDate)
      }
    });

    // Calculate unique users (combine CDP and Staker addresses)
    const uniqueAddresses = new Set([
      ...cdpHistory.map(h => h.lender),
      ...stakerHistory.map(h => h.address)
    ]);

    // Calculate volumes
    const xlmVolume = this.sumBigNumbersAbs(
      cdpHistory.map(h => h.xlm_delta)
    );

    const xassetVolume = this.sumBigNumbersAbs([
      ...cdpHistory.map(h => h.asset_delta),
      ...stakerHistory.map(h => h.xasset_delta)
    ]);

    const metrics = this.utilizationMetricsRepository.create({
      asset: asset,
      daily_active_users: uniqueAddresses.size,
      daily_transactions: cdpHistory.length + stakerHistory.length,
      daily_xlm_volume: xlmVolume,
      daily_xasset_volume: xassetVolume
    });

    return await this.utilizationMetricsRepository.save(metrics);
  }

  async calculateMetricsForAllAssets(startDate: Date): Promise<UtilizationMetrics[]> {
    const assets = await this.dataSource.getRepository(Asset).find();
    const metrics: UtilizationMetrics[] = [];

    for (const asset of assets) {
      try {
        const metric = await this.calculateDailyMetrics(asset, startDate);
        metrics.push(metric);
      } catch (error) {
        console.error(`Error calculating utilization metrics for asset ${asset.symbol}:`, error);
      }
    }

    return metrics;
  }

  async findLatestByAsset(asset: Asset): Promise<UtilizationMetrics | null> {
    return await this.utilizationMetricsRepository.findOne({
      where: { asset: { id: asset.id } },
      order: { timestamp: 'DESC' },
      relations: ['asset'],
    });
  }

  async findInTimeRange(startDate: Date, endDate: Date): Promise<UtilizationMetrics[]> {
    return await this.utilizationMetricsRepository.find({
      where: {
        timestamp: Between(startDate, endDate)
      },
      relations: ['asset'],
      order: { timestamp: 'DESC' }
    });
  }

  async findAllForAsset(asset: Asset): Promise<UtilizationMetrics[]> {
    return await this.utilizationMetricsRepository.find({
      where: { asset: { id: asset.id } },
      order: { timestamp: 'DESC' },
      relations: ['asset'],
    });
  }
}
