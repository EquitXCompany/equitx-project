import { getRepository } from "typeorm";
import { Asset } from "../entity/Asset";

export class AssetService {
  private assetRepository = getRepository(Asset);

  async findAll(): Promise<Asset[]> {
    return this.assetRepository.find();
  }

  async findOne(symbol: string): Promise<Asset | undefined> {
    return this.assetRepository.findOne(symbol);
  }

  // Internal methods for insert, update, delete
  async insert(asset: Asset): Promise<Asset> {
    return this.assetRepository.save(asset);
  }

  async update(symbol: string, asset: Partial<Asset>): Promise<Asset | undefined> {
    await this.assetRepository.update(symbol, asset);
    return this.assetRepository.findOne(symbol);
  }

  async delete(symbol: string): Promise<void> {
    await this.assetRepository.delete(symbol);
  }
}