import { Repository, DataSource } from "typeorm";
import { ContractState } from "../entity/ContractState";
import { AppDataSource } from "../ormconfig";


export class ContractStateService {
  private singletonRepository: Repository<ContractState>;

  constructor(private readonly dataSource: DataSource) {
    this.singletonRepository = this.dataSource.getRepository(ContractState);
  }

  static async create(): Promise<ContractStateService> {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    return new ContractStateService(AppDataSource);
  }

  async findAll(assetSymbol: string): Promise<ContractState[]> {
    return this.singletonRepository.find({
      where: { asset: { symbol: assetSymbol } },
      relations: ["asset"],
    });
  }

  async findOne(key: string, assetSymbol: string): Promise<ContractState | null> {
    return this.singletonRepository.findOne({
      where: { key, asset: { symbol: assetSymbol } },
      relations: ["asset"],
    });
  }

  async insert(singleton: ContractState): Promise<ContractState> {
    return this.singletonRepository.save(singleton);
  }

  async update(key: string, assetSymbol: string, singleton: Partial<ContractState>): Promise<ContractState | null> {
    const existingSingleton = await this.findOne(key, assetSymbol);
    if (!existingSingleton) return null;

    Object.assign(existingSingleton, singleton);
    return this.singletonRepository.save(existingSingleton);
  }

  async delete(key: string, assetSymbol: string): Promise<void> {
    const existingSingleton = await this.findOne(key, assetSymbol);
    if (existingSingleton) {
      await this.singletonRepository.remove(existingSingleton);
    }
  }
}
