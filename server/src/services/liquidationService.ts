import { Repository, DataSource, MoreThanOrEqual } from "typeorm";
import { Liquidation } from "../entity/Liquidation";
import { CDP } from "../entity/CDP";
import { Asset } from "../entity/Asset";
import { AppDataSource } from "../ormconfig";

export class LiquidationService {
  private liquidationRepository: Repository<Liquidation>;

  constructor(private readonly dataSource: DataSource) {
    this.liquidationRepository = this.dataSource.getRepository(Liquidation);
  }

  static async create(): Promise<LiquidationService> {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    return new LiquidationService(AppDataSource);
  }

  async findAll(): Promise<Liquidation[]> {
    return await this.liquidationRepository.find({
      relations: ['cdp', 'asset'],
      order: { timestamp: 'DESC' }
    });
  }

  async findByCDP(cdpId: string): Promise<Liquidation[]> {
    return await this.liquidationRepository.find({
      where: { cdp: { id: cdpId } },
      relations: ['cdp', 'asset'],
      order: { timestamp: 'DESC' }
    });
  }

  async findByAsset(assetSymbol: string): Promise<Liquidation[]> {
    return await this.liquidationRepository
      .createQueryBuilder('liquidation')
      .innerJoinAndSelect('liquidation.asset', 'asset')
      .innerJoinAndSelect('liquidation.cdp', 'cdp')
      .where('asset.symbol = :assetSymbol', { assetSymbol })
      .orderBy('liquidation.timestamp', 'DESC')
      .getMany();
  }

  async createLiquidation(
    cdp: CDP,
    asset: Asset,
    xlmLiquidated: string,
    debtCovered: string,
    collateralizationRatio: string,
    xlmLiquidatedUsd: string,
  ): Promise<Liquidation> {
    const liquidation = this.liquidationRepository.create({
      cdp,
      asset,
      xlm_liquidated: xlmLiquidated,
      debt_covered: debtCovered,
      collateralization_ratio: collateralizationRatio,
      xlm_liquidated_usd: xlmLiquidatedUsd,
    });

    return await this.liquidationRepository.save(liquidation);
  }

  async findByTimeRange(startTime: Date): Promise<Liquidation[]> {
    return await this.liquidationRepository.find({
      where: {
        timestamp: MoreThanOrEqual(startTime)
      },
      relations: ['cdp', 'asset'],
      order: { timestamp: 'DESC' }
    });
  }
}