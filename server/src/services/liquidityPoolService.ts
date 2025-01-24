import { Repository, DataSource } from "typeorm";
import { LiquidityPool } from "../entity/LiquidityPool";
import { AppDataSource } from "../ormconfig";

export class LiquidityPoolService {
  private liquidityPoolRepository: Repository<LiquidityPool>;

  constructor(private readonly dataSource: DataSource) {
    this.liquidityPoolRepository = this.dataSource.getRepository(LiquidityPool);
  }

  static async create(): Promise<LiquidityPoolService> {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    return new LiquidityPoolService(AppDataSource);
  }

  async findAll(): Promise<LiquidityPool[]> {
    return this.liquidityPoolRepository.find({ relations: ["asset"] });
  }

  async findOne(asset_symbol: string): Promise<LiquidityPool | null> {
    return this.liquidityPoolRepository.findOne({
      where: { asset: { symbol: asset_symbol } },
      relations: ["asset"],
    });
  }

  async insert(liquidityPool: LiquidityPool): Promise<LiquidityPool> {
    return this.liquidityPoolRepository.save(liquidityPool);
  }

  async update(
    asset_symbol: string,
    liquidityPool: Partial<LiquidityPool>
  ): Promise<LiquidityPool | null> {
    const existingPool = await this.findOne(asset_symbol);
    if (!existingPool) return null;

    Object.assign(existingPool, liquidityPool);
    return this.liquidityPoolRepository.save(existingPool);
  }

  async delete(asset_symbol: string): Promise<void> {
    const existingPool = await this.findOne(asset_symbol);
    if (existingPool) {
      await this.liquidityPoolRepository.remove(existingPool);
    }
  }
}
