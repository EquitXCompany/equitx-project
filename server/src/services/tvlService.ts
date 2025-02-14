import { Repository, DataSource, Between, Not } from "typeorm";
import { TVLMetrics } from "../entity/TVLMetrics";
import { Asset } from "../entity/Asset";
import { CDP, CDPStatus } from "../entity/CDP";
import { AppDataSource } from "../ormconfig";
import BigNumber from "bignumber.js";
import { DECIMALS_XLM } from "../config/constants";
import { StakerService } from "./stakerService";
import { Staker } from "entity/Staker";

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
    // amount is 7 decimals in integer form, so need to divide by 7
    // price in USD is always in 14 decimals so stored usd values are in 14 decimals
    const amountBN = new BigNumber(amount);
    const priceBN = new BigNumber(price);
    return amountBN.multipliedBy(priceBN).dividedBy(new BigNumber(10).pow(DECIMALS_XLM)).toString();
  }

  private calculateStakedShareHistogram(stakes: Staker[]): TVLMetrics['staked_share_histogram'] {
    const BUCKET_SIZE = 0.5;
    const MAX_BUCKET = 50;
    const buckets: Array<BigNumber> = [];
    for(let i = 0; i < Math.floor(MAX_BUCKET/BUCKET_SIZE) + 2; i++){
      buckets.push(new BigNumber(0));
    }
    let totalValue = new BigNumber(0);
    for(const staker of stakes){
      totalValue = totalValue.plus(staker.xasset_deposit);
    }

    stakes.forEach(stake => {
      const shareValue = new BigNumber(stake.xasset_deposit || "0").times(100).div(totalValue);
      let bucketIndex = 0;
      
      if(shareValue.gt(0)) {
        bucketIndex = Math.min(
          Math.floor(shareValue.toNumber() / BUCKET_SIZE) + 1,
          buckets.length - 1
        );
      }
      
      if (bucketIndex >= 0) {
        buckets[bucketIndex] = buckets[bucketIndex].plus(stake.xasset_deposit);
      }
    });

    return {
      bucket_size: BUCKET_SIZE,
      min: 0,
      max: MAX_BUCKET,
      buckets: buckets.map((n) => n.toString())
    };
  }

  async calculateTVLMetrics(asset: Asset): Promise<TVLMetrics> {
    const activeCDPs = await this.cdpRepository.find({
      where: {
        asset: { id: asset.id },
        status: Not(CDPStatus.Closed),
        is_deleted: false
      }
    });

    const stakerService = await StakerService.create();
    const activeStakes = await stakerService.findByAsset(asset);

    const totalXlmLocked = activeCDPs.reduce(
      (sum, cdp) => sum.plus(cdp.status === CDPStatus.Open ? cdp.xlm_deposited : 0),
      new BigNumber(0)
    ).toString();

    const totalXassetsMinted = activeCDPs.reduce(
      (sum, cdp) => sum.plus(cdp.asset_lent),
      new BigNumber(0)
    ).toString();

    const totalXassetsMintedUsd = this.calculateUSDValue(totalXassetsMinted, asset.price);

    const totalXassetsStaked = activeStakes.reduce(
      (sum, stake) => sum.plus(stake.xasset_deposit),
      new BigNumber(0)
    ).toString();

    const tvlMetrics = this.tvlMetricsRepository.create({
      asset: asset,
      total_xlm_locked: totalXlmLocked,
      total_xassets_minted: totalXassetsMinted,
      total_xassets_minted_usd: totalXassetsMintedUsd,
      total_xassets_staked: totalXassetsStaked,
      total_xassets_staked_usd: this.calculateUSDValue(totalXassetsStaked, asset.price || "0"),
      active_cdps_count: activeCDPs.length,
      tvl_usd: this.calculateUSDValue(totalXlmLocked, asset.last_xlm_price || "0"),
      open_accounts: activeStakes.length,
      staked_share_histogram: this.calculateStakedShareHistogram(activeStakes)
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
