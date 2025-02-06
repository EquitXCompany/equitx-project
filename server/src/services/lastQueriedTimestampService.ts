import { Repository, DataSource } from "typeorm";
import { LastQueriedTimestamp, TableType } from "../entity/LastQueriedTimestamp";
import { AppDataSource } from "../ormconfig";

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

  async findOne(wasmHash: string, tableType: TableType): Promise<LastQueriedTimestamp | null> {
    return this.repository.findOne({
      where: {
        wasm_hash: wasmHash,
        table_type: tableType,
      },
    });
  }

  async getTimestamp(wasmHash: string, tableType: TableType): Promise<number> {
    const record = await this.findOne(wasmHash, tableType);
    return record?.timestamp || 0;
  }

  async updateTimestamp(
    wasmHash: string,
    tableType: TableType,
    timestamp: number
  ): Promise<LastQueriedTimestamp> {
    let record = await this.findOne(wasmHash, tableType);

    if (!record) {
      record = this.repository.create({
        wasm_hash: wasmHash,
        table_type: tableType,
        timestamp,
      });
    } else {
      record.timestamp = timestamp;
    }

    return this.repository.save(record);
  }
}