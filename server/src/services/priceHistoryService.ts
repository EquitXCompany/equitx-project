import { Repository, DataSource, Between } from "typeorm";
import { PriceHistory } from "../entity/PriceHistory";
import { AppDataSource } from "../ormconfig";
import { Asset } from "../entity/Asset";
import BigNumber from "bignumber.js";

export class PriceHistoryService {
  private priceHistoryRepository: Repository<PriceHistory>;

  constructor(private readonly dataSource: DataSource) {
    this.priceHistoryRepository = this.dataSource.getRepository(PriceHistory);
  }

  static async create(): Promise<PriceHistoryService> {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    return new PriceHistoryService(AppDataSource);
  }

  async findPriceHistoryForAsset(
    asset_symbol: string,
    startTimestamp: Date,
    endTimestamp: Date
  ): Promise<PriceHistory[]> {
    return this.priceHistoryRepository.find({
      where: {
        asset: { symbol: asset_symbol },
        timestamp: Between(startTimestamp, endTimestamp),
      },
      relations: ["asset"],
      order: { timestamp: "ASC" },
    });
  }

  async findLatestPriceForAsset(asset_symbol: string): Promise<PriceHistory | null> {
    return this.priceHistoryRepository.findOne({
      where: { asset: { symbol: asset_symbol }, is_latest: true },
      relations: ["asset"],
    });
  }

  async insert(assetSymbol: string, price: BigNumber, timestamp: Date): Promise<PriceHistory> {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      // First, find the asset
      const asset = await transactionalEntityManager
        .createQueryBuilder(Asset, "asset")
        .where("asset.symbol = :symbol", { symbol: assetSymbol })
        .getOne();

      if (!asset) {
        throw new Error(`Asset with symbol ${assetSymbol} not found`);
      }

      // Update any existing latest price to not be latest
      await transactionalEntityManager
        .createQueryBuilder()
        .update(PriceHistory)
        .set({ is_latest: false })
        .where("asset_id = :assetId AND is_latest = true", { assetId: asset.id })
        .execute();

      // Update the asset's price
      await transactionalEntityManager
        .createQueryBuilder()
        .update(Asset)
        .set({ price: price.toString() })
        .where("id = :id", { id: asset.id })
        .execute();

      // Create and save the new price history record
      const priceHistory = new PriceHistory();
      priceHistory.asset = asset;
      priceHistory.price = price.toString();
      priceHistory.timestamp = timestamp;
      priceHistory.is_latest = true;

      return transactionalEntityManager.save(PriceHistory, priceHistory);
    });
  }
}
