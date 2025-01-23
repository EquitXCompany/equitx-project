import { getRepository } from "typeorm";
import { CDP } from "../entity/CDP";

export class CDPService {
  private cdpRepository = getRepository(CDP);

  async findAll(): Promise<CDP[]> {
    return this.cdpRepository.find();
  }

  async findOne(asset_symbol: string, addr: string): Promise<CDP | undefined> {
    return this.cdpRepository.findOne({ where: { asset_symbol, addr } });
  }

  async insert(cdp: CDP): Promise<CDP> {
    return this.cdpRepository.save(cdp);
  }

  async update(asset_symbol: string, addr: string, cdp: Partial<CDP>): Promise<CDP | undefined> {
    await this.cdpRepository.update({ asset_symbol, addr }, cdp);
    return this.cdpRepository.findOne({ where: { asset_symbol, addr } });
  }

  async delete(asset_symbol: string, addr: string): Promise<void> {
    await this.cdpRepository.delete({ asset_symbol, addr });
  }
}