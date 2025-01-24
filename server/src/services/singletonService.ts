import { Repository, DataSource } from "typeorm";
import { Singleton } from "../entity/Singleton";
import { AppDataSource } from "../ormconfig";


export class SingletonService {
  private singletonRepository: Repository<Singleton>;

  constructor(private readonly dataSource: DataSource) {
    this.singletonRepository = this.dataSource.getRepository(Singleton);
  }

  static async create(): Promise<SingletonService> {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    return new SingletonService(AppDataSource);
  }

  async findAll(assetSymbol: string): Promise<Singleton[]> {
    return this.singletonRepository.find({
      where: { asset: { symbol: assetSymbol } },
      relations: ["asset"],
    });
  }

  async findOne(key: string, assetSymbol: string): Promise<Singleton | null> {
    return this.singletonRepository.findOne({
      where: { key, asset: { symbol: assetSymbol } },
      relations: ["asset"],
    });
  }

  async insert(singleton: Singleton): Promise<Singleton> {
    return this.singletonRepository.save(singleton);
  }

  async update(key: string, assetSymbol: string, singleton: Partial<Singleton>): Promise<Singleton | null> {
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
