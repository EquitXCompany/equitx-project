import { Repository, DataSource, Between, DeepPartial } from "typeorm";
import { StakerHistory, StakerHistoryAction } from "../entity/StakerHistory";
import { AppDataSource } from "../ormconfig";
import { Staker } from "../entity/Staker";
import BigNumber from "bignumber.js";

export class StakerHistoryService {
  private stakerHistoryRepository: Repository<StakerHistory>;

  constructor(private readonly dataSource: DataSource) {
    this.stakerHistoryRepository = this.dataSource.getRepository(StakerHistory);
  }

  static async create(): Promise<StakerHistoryService> {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    return new StakerHistoryService(AppDataSource);
  }

  async findAll(): Promise<StakerHistory[]> {
    return await this.stakerHistoryRepository.find({
      relations: ['asset'],
      order: { timestamp: 'DESC' }
    });
  }

  async findByAddress(address: string): Promise<StakerHistory[]> {
    return await this.stakerHistoryRepository.find({
      where: { address },
      relations: ['asset'],
      order: { timestamp: 'DESC' }
    });
  }

  async createHistoryEntry(
    stakerId: string,
    newStaker: Staker,
    action: StakerHistoryAction,
    oldStaker?: Staker | null,
    rewardsClaimed: string = "0" 
  ): Promise<StakerHistory> {
    let xasset_delta = "0";

    if (oldStaker) {
      xasset_delta = new BigNumber(newStaker.xasset_deposit)
        .minus(oldStaker.xasset_deposit)
        .toString();
    } else {
      xasset_delta = newStaker.xasset_deposit;
    }

    const historyEntry = this.stakerHistoryRepository.create({
      original_staker_id: stakerId,
      address: newStaker.address,
      xasset_deposit: newStaker.xasset_deposit,
      product_constant: newStaker.product_constant,
      compounded_constant: newStaker.compounded_constant,
      rewards_claimed: rewardsClaimed,
      xasset_delta,
      epoch: newStaker.epoch,
      action,
      asset: newStaker.asset,
      timestamp: newStaker.updated_at,
    } as DeepPartial<StakerHistory>);

    return this.stakerHistoryRepository.save(historyEntry);
  }

  async calculateDailyRewards(date: Date): Promise<string> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const history = await this.stakerHistoryRepository.find({
      where: {
        timestamp: Between(startOfDay, endOfDay),
        action: StakerHistoryAction.CLAIM_REWARDS
      }
    });

    return history.reduce((sum, entry) => 
      sum.plus(entry.rewards_claimed), new BigNumber(0)).toString();
  }
}
