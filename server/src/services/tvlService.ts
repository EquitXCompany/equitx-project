import { Repository, DataSource, Between } from "typeorm";
import { TVLMetrics } from "../entity/TVLMetrics";
import { Asset } from "../entity/Asset";
import { CDP, CDPStatus } from "../entity/CDP";
import { AppDataSource } from "../ormconfig";
import BigNumber from "bignumber.js";

export class TVLService {
  private tvlMetricsRepository: Repository<TVLMetrics>;
  private cdpRepository: Repository<CDP>;
  private assetRepository: Repository<Asset>;

  constructor(private readonly dataSource: DataSource) {
    this.tvlMetricsRepository = this.dataSource.getRepository(TVLMetrics);
    this.cdpRepository = this.dataSource.getRepository(CDP);
    this.assetRepository = this.dataSource.getRepository(Asset);
  }

  static async create(): Promise<TVLService> {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    return new TVLService(AppDataSource);
  }

  private calculateUSDValue(amount: string, price: string): string {
    const amountBN = new BigNumber(amount);
    const priceBN = new BigNumber(price);
    // Price is in 14 decimal places, so divide by 10^14
    return amountBN.multipliedBy(priceBN).dividedBy(new BigNumber(10).pow(14)).toString();
  }

  async calculateTVLMetrics(asset: Asset): Promise<TVLMetrics> {
    const activeCDPs = await this.cdpRepository.find({
      where: {
        asset: { id: asset.id },
        status: CDPStatus.Open,
        is_deleted: false
      }
    });

    const totalXlmLocked = activeCDPs.reduce(
      (sum, cdp) => sum.plus(cdp.xlm_deposited), 
      new BigNumber(0)
    ).toString();

    const totalXassetsMinted = activeCDPs.reduce(
      (sum, cdp) => sum.plus(cdp.asset_lent),
      new BigNumber(0)
    ).toString();

    const tvlMetrics = this.tvlMetricsRepository.create({
      asset: asset,
      total_xlm_locked: totalXlmLocked,
      total_xassets_minted: totalXassetsMinted,
      active_cdps_count: activeCDPs.length,
      tvl_usd: this.calculateUSDValue(totalXlmLocked, asset.last_xlm_price || "0")
    });

    return await this.tvlMetricsRepository.save(tvlMetrics);
  }

  async calculateTVLMetricsForAllAssets(): Promise<TVLMetrics[]> {
    const assets = await this.assetRepository.find();
    const metrics: TVLMetrics[] = [];

    for (const asset of assets) {
      try {
        const metric = await this.calculateTVLMetrics(asset);
        metrics.push(metric);
      } catch (error) {
        console.error(`Error calculating TVL metrics for asset ${asset.symbol}:`, error);
      }
    }

    return metrics;
  }

  async findLatestByAsset(asset: Asset): Promise<TVLMetrics | null> {
    return await this.tvlMetricsRepository.findOne({
      where: { asset: { id: asset.id } },
      order: { timestamp: 'DESC' },
      relations: ['asset']
    });
  }

  async findInTimeRange(startDate: Date, endDate: Date): Promise<TVLMetrics[]> {
    return await this.tvlMetricsRepository.find({
      where: {
        timestamp: Between(startDate, endDate)
      },
      relations: ['asset'],
      order: { timestamp: 'DESC' }
    });
  }

  async findAllForAsset(asset: Asset): Promise<TVLMetrics[]> {
    return await this.tvlMetricsRepository.find({
      where: { asset: { id: asset.id } },
      order: { timestamp: 'DESC' },
      relations: ['asset']
    });
  }
}
