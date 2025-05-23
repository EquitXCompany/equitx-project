import { Repository, DataSource } from "typeorm";
import { Asset } from "../entity/Asset";
import { AppDataSource } from "../ormconfig";

export class AssetService {
  private assetRepository: Repository<Asset>;

  constructor(private readonly dataSource: DataSource) {
    this.assetRepository = this.dataSource.getRepository(Asset);
  }

  static async create(): Promise<AssetService> {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    return new AssetService(AppDataSource);
  }

  async findAll(): Promise<Asset[]> {
    return this.assetRepository.find();
  }

  async findAllWithPools(): Promise<Asset[]> {
    return this.assetRepository.createQueryBuilder("asset")
      .leftJoinAndSelect("asset.liquidityPool", "liquidityPool")
      .getMany();
  }

  async findOne(symbol: string): Promise<Asset | null> {
    return this.assetRepository.findOne({ where: { symbol } });
  }

  // Internal methods for insert, update, delete
  async insert(asset: Asset): Promise<Asset> {
    return this.assetRepository.save(asset);
  }

  async update(id: string, asset: Partial<Asset>): Promise<Asset | null> {
    await this.assetRepository.update(id, asset);
    return this.assetRepository.findOne({ where: { id } });
  }

  async delete(symbol: string): Promise<void> {
    await this.assetRepository.delete(symbol);
  }
}
