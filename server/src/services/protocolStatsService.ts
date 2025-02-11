import { Repository, DataSource } from "typeorm";
import { ProtocolStats } from "../entity/ProtocolStats";
import { AppDataSource } from "../ormconfig";
import { TVLService } from "./tvlService";
import { UserMetricsService } from "./userMetricsService";
import { UtilizationMetricsService } from "./utilizationMetricsService";
import { Asset } from "../entity/Asset";
import BigNumber from "bignumber.js";
import { UserMetrics } from "../entity/UserMetrics";

export class ProtocolStatsService {
  private protocolStatsRepository: Repository<ProtocolStats>;

  constructor(private readonly dataSource: DataSource) {
    this.protocolStatsRepository = this.dataSource.getRepository(ProtocolStats);
  }

  static async create(): Promise<ProtocolStatsService> {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    return new ProtocolStatsService(AppDataSource);
  }

  async findLatest(): Promise<ProtocolStats | null> {
    return this.protocolStatsRepository
      .createQueryBuilder("stats")
      .where("stats.is_latest = :isLatest", { isLatest: true })
      .getOne();
  }

  async findHistorical(
    startTime: Date,
    endTime: Date
  ): Promise<ProtocolStats[]> {
    return this.protocolStatsRepository
      .createQueryBuilder("stats")
      .where("stats.timestamp BETWEEN :startTime AND :endTime", {
        startTime,
        endTime,
      })
      .orderBy("stats.timestamp", "ASC")
      .getMany();
  }

  async insert(stats: Partial<ProtocolStats>): Promise<ProtocolStats> {
    return this.protocolStatsRepository.save(stats);
  }

  async updateStats(): Promise<ProtocolStats> {
    const newStats = await this.calculateStats();

    await this.protocolStatsRepository
      .createQueryBuilder()
      .update()
      .set({ is_latest: false })
      .where("is_latest = :isLatest", { isLatest: true })
      .execute();

    newStats.is_latest = true;
    return this.protocolStatsRepository.save(newStats);
  }

  async getGrowthStats(timeframe: number): Promise<any> {
    const currentStats = await this.findLatest();
    const previousStats = await this.protocolStatsRepository
      .createQueryBuilder("stats")
      .where("stats.timestamp <= :timestamp", {
        timestamp: new Date(Date.now() - timeframe),
      })
      .orderBy("stats.timestamp", "DESC")
      .getOne();

    return {
      tvlGrowth: this.calculateGrowthRate(
        previousStats?.total_value_locked,
        currentStats?.total_value_locked
      ),
    };
  }

  private async calculateStats(): Promise<Partial<ProtocolStats>> {
    const tvlService = await TVLService.create();
    const userMetricsService = await UserMetricsService.create();
    const utilizationService = await UtilizationMetricsService.create();

    const assets = await this.dataSource.getRepository(Asset).find();

    const tvlMetrics = await tvlService.calculateTVLMetricsForAllAssets();

    const totalValueLocked = tvlMetrics.reduce(
      (sum, metric) => sum.plus(metric.tvl_usd),
      new BigNumber(0)
    ).toString();

    const totalDebt = tvlMetrics.reduce(
      (sum, metric) => sum.plus(metric.total_xassets_minted),
      new BigNumber(0)
    ).toString();

    const activeCdps = tvlMetrics.reduce(
      (sum, metric) => sum + metric.active_cdps_count,
      0
    );

    const uniqueUsers = await this.dataSource
      .getRepository(UserMetrics)
      .createQueryBuilder("metrics")
      .select("COUNT(DISTINCT metrics.address)", "count")
      .getRawOne()
      .then(result => parseInt(result.count));

    const systemCollateralization = new BigNumber(totalValueLocked)
      .dividedBy(totalDebt)
      .multipliedBy(100)
      .toFixed(5);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const dailyMetrics = await Promise.all(
      assets.map(asset => utilizationService.findLatestByAsset(asset))
    );

    const dailyVolume = dailyMetrics.reduce(
      (sum, metric) => sum.plus(metric?.daily_xlm_volume || "0"),
      new BigNumber(0)
    ).toString();

    const previousStats = await this.protocolStatsRepository
      .createQueryBuilder("stats")
      .where("stats.timestamp <= :timestamp", { timestamp: oneDayAgo })
      .orderBy("stats.timestamp", "DESC")
      .getOne();

    const userMetrics = await this.dataSource
      .getRepository(UserMetrics)
      .find();

    const averageHealthFactor = userMetrics.length > 0
      ? new BigNumber(
          userMetrics.reduce(
            (sum, metric) => sum.plus(metric.avg_collateralization_ratio),
            new BigNumber(0)
          )
        )
        .dividedBy(userMetrics.length)
        .toFixed(5)
      : "0";

    const liquidationEvents24h = userMetrics.reduce(
      (sum, metric) => {
        if (metric.timestamp >= oneDayAgo) {
          return sum + metric.liquidations_received;
        }
        return sum;
      },
      0
    );

    const userGrowth24h = this.calculateGrowthRate(
      previousStats?.unique_users.toString(),
      uniqueUsers.toString()
    );

    const tvlGrowth24h = this.calculateGrowthRate(
      previousStats?.total_value_locked,
      totalValueLocked
    );

    const volumeGrowth24h = this.calculateGrowthRate(
      previousStats?.daily_volume,
      dailyVolume
    );

    return {
      total_value_locked: totalValueLocked,
      total_debt: totalDebt,
      unique_users: uniqueUsers,
      active_cdps: activeCdps,
      system_collateralization: systemCollateralization,
      liquidation_events_24h: liquidationEvents24h,
      average_health_factor: averageHealthFactor,
      daily_volume: dailyVolume,
      cumulative_volume: "0",
      fees_24h: new BigNumber(dailyVolume).multipliedBy("0.001").toString(),
      user_growth_24h: userGrowth24h,
      tvl_growth_24h: tvlGrowth24h,
      volume_growth_24h: volumeGrowth24h,
      timestamp: new Date(),
      is_latest: false
    };
  }

  private calculateGrowthRate(
    previous: string | undefined,
    current: string | undefined
  ): string {
    if (!previous || !current) return "0";
    const prev = BigInt(previous);
    const curr = BigInt(current);
    if (prev === 0n) return "0";
    return ((Number(curr - prev) / Number(prev)) * 100).toFixed(5);
  }
}