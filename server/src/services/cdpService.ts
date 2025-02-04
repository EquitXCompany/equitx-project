import { Repository, DataSource } from "typeorm";
import { CDP } from "../entity/CDP";
import { AppDataSource } from "../ormconfig";
import { CDPDTO, toCDPDTO } from "../dto/cdpDTO";

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

  async findAll(): Promise<CDPDTO[]> {
    const cdps = await this.cdpRepository.find();
    return cdps.map(toCDPDTO);
  }

  async findOne(asset_symbol: string, lender: string): Promise<CDPDTO | null> {
    const cdp = await this.cdpRepository
      .createQueryBuilder("cdp")
      .innerJoinAndSelect("cdp.asset", "asset")
      .where("asset.symbol = :asset_symbol", { asset_symbol })
      .andWhere("cdp.lender = :lender", { lender })
      .getOne();
    
    return cdp ? toCDPDTO(cdp) : null;
  }

  async insert(cdp: Partial<CDP>): Promise<CDP> {
    return this.cdpRepository.save(cdp);
  }

  async update(
    asset_symbol: string,
    lender: string,
    cdp: Partial<CDP>
  ): Promise<CDP | null> {
    const existingCDP = await this.cdpRepository.createQueryBuilder('cdp')
      .innerJoinAndSelect('cdp.asset', 'asset')
      .where('asset.symbol = :asset_symbol', { asset_symbol })
      .andWhere('cdp.lender = :lender', { lender })
      .getOne();

    if (!existingCDP) {
      return null;
    }

    Object.assign(existingCDP, cdp);
    await this.cdpRepository.save(existingCDP);
    return existingCDP;
  }

  async upsert(
    asset_symbol: string,
    lender: string,
    cdpData: Partial<CDP>
  ): Promise<CDP> {
    const existingCDP = await this.cdpRepository.createQueryBuilder('cdp')
      .innerJoinAndSelect('cdp.asset', 'asset')
      .where('asset.symbol = :asset_symbol', { asset_symbol })
      .andWhere('cdp.lender = :lender', { lender })
      .getOne();

    if (existingCDP) {
      Object.assign(existingCDP, cdpData);
      return this.cdpRepository.save(existingCDP);
    }

    return this.cdpRepository.save(cdpData);
  }

  async delete(asset_symbol: string, lender: string): Promise<void> {
    const cdp = await this.cdpRepository.createQueryBuilder('cdp')
      .innerJoinAndSelect('cdp.asset', 'asset')
      .where('asset.symbol = :asset_symbol', { asset_symbol })
      .andWhere('cdp.lender = :lender', { lender })
      .getOne();

    if (cdp) {
      cdp.is_deleted = true;
      await this.cdpRepository.save(cdp);
    }
  }
}
