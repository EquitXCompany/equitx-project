import { Repository, DataSource } from "typeorm";
import { Staker } from "../entity/Staker";
import { AppDataSource } from "../ormconfig";
import { Asset } from "entity/Asset";


export class StakerService {
  private stakerRepository: Repository<Staker>;

  constructor(private readonly dataSource: DataSource) {
    this.stakerRepository = this.dataSource.getRepository(Staker);
  }

  static async create(): Promise<StakerService> {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    return new StakerService(AppDataSource);
  }

  async findAll(): Promise<Staker[]> {
    return this.stakerRepository.find({ relations: ["asset"] });
  }

  async findOne(asset_symbol: string, address: string): Promise<Staker | null> {
    return this.stakerRepository.findOne({
      where: { asset: { symbol: asset_symbol }, address },
      relations: ["asset"],
    });
  }

  async insert(staker: Staker): Promise<Staker> {
    return this.stakerRepository.save(staker);
  }

  async update(asset_symbol: string, address: string, staker: Partial<Staker>): Promise<Staker | null> {
    const existingStaker = await this.findOne(asset_symbol, address);
    if (!existingStaker) return null;

    Object.assign(existingStaker, staker);
    return this.stakerRepository.save(existingStaker);
  }


  async upsert(
    assetSymbol: string,
    address: string,
    stakerData: Partial<Staker>
  ): Promise<Staker> {
    const existingStaker = await this.findOne(assetSymbol, address);

    if (existingStaker) {
      Object.assign(existingStaker, stakerData);
      return this.stakerRepository.save(existingStaker);
    }
    return this.stakerRepository.save(stakerData);
  }

  async getTotalRewardsClaimed(assetSymbol: string, address: string): Promise<string> {
    const staker = await this.findOne(assetSymbol, address);
    return staker ? staker.total_rewards_claimed : "0";
  }

  async delete(asset_symbol: string, address: string): Promise<void> {
    const existingStaker = await this.findOne(asset_symbol, address);
    if (existingStaker) {
      await this.stakerRepository.remove(existingStaker);
    }
  }

  async findByAsset(asset: Asset): Promise<Staker[]> {
    return this.stakerRepository.find({
      where: { 
        asset,
        is_deleted: false
      },
      relations: ['asset']
    });
  }

  async findByAddress(address: string): Promise<Staker[]> {
    return this.stakerRepository.find({
      where: { 
        address,
        is_deleted: false
      },
      relations: ['asset']
    });
  }
}
