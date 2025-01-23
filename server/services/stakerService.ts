import { getRepository } from "typeorm";
import { Staker } from "../entity/Staker";

export class StakerService {
  private stakerRepository = getRepository(Staker);

  async findAll(): Promise<Staker[]> {
    return this.stakerRepository.find();
  }

  async findOne(asset_symbol: string, addr: string): Promise<Staker | undefined> {
    return this.stakerRepository.findOne({ where: { asset_symbol, addr } });
  }

  async insert(staker: Staker): Promise<Staker> {
    return this.stakerRepository.save(staker);
  }

  async update(asset_symbol: string, addr: string, staker: Partial<Staker>): Promise<Staker | undefined> {
    await this.stakerRepository.update({ asset_symbol, addr }, staker);
    return this.stakerRepository.findOne({ where: { asset_symbol, addr } });
  }

  async delete(asset_symbol: string, addr: string): Promise<void> {
    await this.stakerRepository.delete({ asset_symbol, addr });
  }
}