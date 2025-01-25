import { Repository, DataSource } from "typeorm";
import { LastQueriedTimestamp } from "../entity/LastQueriedTimestamp";
import { Asset } from "../entity/Asset";
import { AppDataSource } from "../ormconfig";

export class LastQueriedTimestampService {
  private lastQueriedTimestampRepository: Repository<LastQueriedTimestamp>;

  constructor(private readonly dataSource: DataSource) {
    this.lastQueriedTimestampRepository = this.dataSource.getRepository(LastQueriedTimestamp);
  }

  static async create(): Promise<LastQueriedTimestampService> {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    return new LastQueriedTimestampService(AppDataSource);
  }

  async getLastQueriedTimestamp(asset: Asset): Promise<number> {
    const lastTimestamp = await this.lastQueriedTimestampRepository.findOne({
      where: { asset_id: asset.id },
    });
    return lastTimestamp ? lastTimestamp.timestamp : 0;
  }

  async updateLastQueriedTimestamp(asset: Asset, timestamp: number): Promise<void> {
    let lastTimestamp = await this.lastQueriedTimestampRepository.findOne({
      where: { asset: asset },
    });

    if (lastTimestamp) {
      lastTimestamp.timestamp = timestamp;
    } else {
      lastTimestamp = this.lastQueriedTimestampRepository.create({
        asset: asset,
        timestamp: timestamp,
      });
    }

    await this.lastQueriedTimestampRepository.save(lastTimestamp);
  }
}
