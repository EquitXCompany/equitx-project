import { getRepository } from "typeorm";
import { LiquidityPool } from "../entity/LiquidityPool";

export class LiquidityPoolService {
  private liquidityPoolRepository = getRepository(LiquidityPool);

  async findAll(): Promise<LiquidityPool[]> {
    return this.liquidityPoolRepository.find();
  }

  async findOne(asset_symbol: string): Promise<LiquidityPool | undefined> {
    return this.liquidityPoolRepository.findOne({ where: { asset_symbol } });
  }

  async insert(liquidityPool: LiquidityPool): Promise<LiquidityPool> {
    return this.liquidityPoolRepository.save(liquidityPool);
  }

  async update(asset_symbol: string, liquidityPool: Partial<LiquidityPool>): Promise<LiquidityPool | undefined> {
    await this.liquidityPoolRepository.update({ asset_symbol }, liquidityPool);
    return this.liquidityPoolRepository.findOne({ where: { asset_symbol } });
  }

  async delete(asset_symbol: string): Promise<void> {
    await this.liquidityPoolRepository.delete({ asset_symbol });
  }
}