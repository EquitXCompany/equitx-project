import { Repository, DataSource } from "typeorm";
import { LiquidationEvent } from "../entity/LiquidationEvent";
import { AppDataSource } from "../ormconfig";

export class LiquidationEventService {
  private liquidationEventRepository: Repository<LiquidationEvent>;

  constructor(private readonly dataSource: DataSource) {
    this.liquidationEventRepository = this.dataSource.getRepository(LiquidationEvent);
  }

  static async create(): Promise<LiquidationEventService> {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    return new LiquidationEventService(AppDataSource);
  }

  async findEventsAfterTimestamp(timestamp: number): Promise<LiquidationEvent[]> {
    return this.liquidationEventRepository
      .createQueryBuilder("event")
      .where("event.timestamp > :timestamp", { timestamp })
      .orderBy("event.timestamp", "ASC")
      .getMany();
  }
}