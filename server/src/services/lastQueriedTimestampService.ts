import { Repository, DataSource } from "typeorm";
import { LastQueriedTimestamp, TableType } from "../entity/LastQueriedTimestamp";
import { AppDataSource } from "../ormconfig";
import { Asset } from "../entity/Asset";

export class LastQueriedTimestampService {
  private repository: Repository<LastQueriedTimestamp>;

  constructor(private readonly dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(LastQueriedTimestamp);
  }

  static async create(): Promise<LastQueriedTimestampService> {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    return new LastQueriedTimestampService(AppDataSource);
  }

  async findOne(assetSymbol: string, tableType: TableType): Promise<LastQueriedTimestamp | null> {
    return this.repository.findOne({
      where: {
        asset: { symbol: assetSymbol },
        table_type: tableType,
      },
      relations: ["asset"],
    });
  }

  async getTimestamp(assetSymbol: string, tableType: TableType): Promise<number> {
    const record = await this.findOne(assetSymbol, tableType);
    return record?.timestamp || 0;
  }

  async updateTimestamp(
    asset: Asset,
    tableType: TableType,
    timestamp: number
  ): Promise<LastQueriedTimestamp> {
    let record = await this.findOne(asset.symbol, tableType);

    if (!record) {
      record = this.repository.create({
        asset,
        table_type: tableType,
        timestamp,
      });
    } else {
      record.timestamp = timestamp;
    }

    return this.repository.save(record);
  }
}
