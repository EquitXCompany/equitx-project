import { Repository, DataSource } from "typeorm";
import { Staker } from "../entity/Staker";
import { AppDataSource } from "../ormconfig";


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

  async delete(asset_symbol: string, address: string): Promise<void> {
    const existingStaker = await this.findOne(asset_symbol, address);
    if (existingStaker) {
      await this.stakerRepository.remove(existingStaker);
    }
  }
}
