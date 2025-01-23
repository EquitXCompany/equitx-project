import { getRepository } from "typeorm";
import { Pricefeed } from "../entity/Pricefeed";

export class PricefeedService {
  private pricefeedRepository = getRepository(Pricefeed);

  async findAll(): Promise<Pricefeed[]> {
    return this.pricefeedRepository.find();
  }

  async findOne(asset_symbol: string): Promise<Pricefeed | undefined> {
    return this.pricefeedRepository.findOne({ where: { asset_symbol } });
  }

  async insert(pricefeed: Pricefeed): Promise<Pricefeed> {
    return this.pricefeedRepository.save(pricefeed);
  }

  async update(asset_symbol: string, pricefeed: Partial<Pricefeed>): Promise<Pricefeed | undefined> {
    await this.pricefeedRepository.update({ asset_symbol }, pricefeed);
    return this.pricefeedRepository.findOne({ where: { asset_symbol } });
  }

  async delete(asset_symbol: string): Promise<void> {
    await this.pricefeedRepository.delete({ asset_symbol });
  }
}