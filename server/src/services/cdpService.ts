import { Repository, DataSource } from "typeorm";
import { CDP } from "../entity/CDP";
import { AppDataSource } from "../ormconfig";

export class CDPService {
  private cdpRepository: Repository<CDP>;

  constructor(private readonly dataSource: DataSource) {
    this.cdpRepository = this.dataSource.getRepository(CDP);
  }

  static async create(): Promise<CDPService> {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    return new CDPService(AppDataSource);
  }

  async findAll(): Promise<CDP[]> {
    return this.cdpRepository.find();
  }

  async findOne(asset_symbol: string, address: string): Promise<CDP | null> {
    return this.cdpRepository
      .createQueryBuilder("cdp")
      .innerJoinAndSelect("cdp.asset", "asset")
      .where("asset.symbol = :asset_symbol", { asset_symbol })
      .andWhere("cdp.address = :address", { address })
      .getOne();
  }

  async insert(cdp: CDP): Promise<CDP> {
    return this.cdpRepository.save(cdp);
  }

  async update(
    asset_symbol: string,
    address: string,
    cdp: Partial<CDP>
  ): Promise<CDP | null> {
    const existingCDP = await this.cdpRepository.createQueryBuilder('cdp')
      .innerJoinAndSelect('cdp.asset', 'asset')
      .where('asset.symbol = :asset_symbol', { asset_symbol })
      .andWhere('cdp.address = :address', { address })
      .getOne();

    if (!existingCDP) {
      return null;
    }

    Object.assign(existingCDP, cdp);
    await this.cdpRepository.save(existingCDP);
    return existingCDP;
  }

  async delete(asset_symbol: string, address: string): Promise<void> {
    const cdp = await this.cdpRepository.createQueryBuilder('cdp')
      .innerJoinAndSelect('cdp.asset', 'asset')
      .where('asset.symbol = :asset_symbol', { asset_symbol })
      .andWhere('cdp.address = :address', { address })
      .getOne();

    if (cdp) {
      cdp.is_deleted = true;
      await this.cdpRepository.save(cdp);
    }
  }
}
