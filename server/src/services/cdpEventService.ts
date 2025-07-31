import { Repository, DataSource } from "typeorm";
import { CDPEvent } from "../entity/CDPEvent";
import { AppDataSource } from "../ormconfig";

export class CDPEventService {
  private cdpEventRepository: Repository<CDPEvent>;

  constructor(private readonly dataSource: DataSource) {
    this.cdpEventRepository = this.dataSource.getRepository(CDPEvent);
  }

  static async create(): Promise<CDPEventService> {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    return new CDPEventService(AppDataSource);
  }

  async findEventsAfterTimestamp(timestamp: number): Promise<CDPEvent[]> {
    return this.cdpEventRepository
      .createQueryBuilder("event")
      .where("event.timestamp > :timestamp", { timestamp })
      .orderBy("event.timestamp", "ASC")
      .getMany();
  }
}