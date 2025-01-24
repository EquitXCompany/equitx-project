import { Repository, DataSource, Between } from "typeorm";
import { PriceHistory } from "../entity/PriceHistory";
import { AppDataSource } from "../ormconfig";

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

  // ... You can add more methods here as needed, such as insert, update, delete, etc.
}
