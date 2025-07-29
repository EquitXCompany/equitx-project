import { Repository, DataSource } from "typeorm";
import { StakePositionEvent } from "../entity/StakePositionEvent";
import { AppDataSource } from "../ormconfig";

export class StakePositionEventService {
  private stakePositionEventRepository: Repository<StakePositionEvent>;

  constructor(private readonly dataSource: DataSource) {
    this.stakePositionEventRepository = this.dataSource.getRepository(StakePositionEvent);
  }

  static async create(): Promise<StakePositionEventService> {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    return new StakePositionEventService(AppDataSource);
  }

  async findEventsAfterTimestamp(timestamp: number): Promise<StakePositionEvent[]> {
    return this.stakePositionEventRepository
      .createQueryBuilder("event")
      .where("event.timestamp > :timestamp", { timestamp })
      .orderBy("event.timestamp", "ASC")
      .getMany();
  }
}