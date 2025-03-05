import { Repository, DataSource, Between, DeepPartial } from "typeorm";
import { CDPHistory, CDPHistoryAction } from "../entity/CDPHistory";
import BigNumber from "bignumber.js";
import { CDP } from "../entity/CDP";
import { AppDataSource } from "../ormconfig";

interface InterestMetadata {
  interestDelta?: string;
  accruedInterest?: string;
  interestPaid?: string;
}

export class CDPHistoryService {
  private cdpHistoryRepository: Repository<CDPHistory>;

  constructor(private readonly dataSource: DataSource) {
    this.cdpHistoryRepository = this.dataSource.getRepository(CDPHistory);
  }

  static async create(): Promise<CDPHistoryService> {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    return new CDPHistoryService(AppDataSource);
  }

  async findAll(): Promise<CDPHistory[]> {
    return await this.cdpHistoryRepository.find({
      relations: ['asset'],
      order: { timestamp: 'DESC' }
    });
  }

  async findByOriginalCDPId(cdpId: string): Promise<CDPHistory[]> {
    return await this.cdpHistoryRepository.find({
      where: { original_cdp_id: cdpId },
      relations: ['asset'],
      order: { timestamp: 'DESC' }
    });
  }

  async findByLender(lender: string): Promise<CDPHistory[]> {
    return await this.cdpHistoryRepository
      .createQueryBuilder('cdpHistory')
      .leftJoinAndSelect('cdpHistory.asset', 'asset')
      .where('cdpHistory.lender = :lender', { lender })
      .orderBy('cdpHistory.timestamp', 'DESC')
      .getMany();
  }

  async findByAssetSymbol(asset_symbol: string): Promise<CDPHistory[]> {
    return await this.cdpHistoryRepository
      .createQueryBuilder('history')
      .innerJoinAndSelect('history.asset', 'asset')
      .where('asset.symbol = :asset_symbol', { asset_symbol })
      .orderBy('history.timestamp', 'DESC')
      .getMany();
  }

  async insert(historyEntry: Partial<CDPHistory>): Promise<CDPHistory> {
    return this.cdpHistoryRepository.save(historyEntry);
  }

  async createHistoryEntry(
    cdpId: string,
    newCDP: CDP,
    action: CDPHistoryAction,
    oldCDP?: CDP | null,
    interestData?: InterestMetadata
  ): Promise<CDPHistory> {
    let xlm_delta = "0";
    let asset_delta = "0";
    let interest_delta = "0";
    let accrued_interest = "0";
    let interest_paid = "0";

    if (oldCDP) {
      // Calculate deltas
      xlm_delta = new BigNumber(newCDP.xlm_deposited)
        .minus(oldCDP.xlm_deposited)
        .toString();
      
      asset_delta = new BigNumber(newCDP.asset_lent)
        .minus(oldCDP.asset_lent)
        .toString();
        
      // Set interest data if provided
      if (interestData) {
        interest_delta = interestData.interestDelta || "0";
        accrued_interest = interestData.accruedInterest || newCDP.accrued_interest || "0";
        interest_paid = interestData.interestPaid || newCDP.interest_paid || "0";
      } else {
        // Calculate interest delta if not provided
        interest_delta = new BigNumber(newCDP.interest_paid || "0")
          .minus(oldCDP.interest_paid || "0")
          .toString();
        accrued_interest = newCDP.accrued_interest || "0";
        interest_paid = newCDP.interest_paid || "0";
      }
    } else {
      // For new CDPs, the delta is the same as the total
      xlm_delta = newCDP.xlm_deposited;
      asset_delta = newCDP.asset_lent;
      
      // Set initial interest values
      accrued_interest = newCDP.accrued_interest || "0";
      interest_paid = newCDP.interest_paid || "0";
    }

    const historyEntry = this.cdpHistoryRepository.create({
      original_cdp_id: cdpId,
      lender: newCDP.lender,
      xlm_deposited: newCDP.xlm_deposited,
      asset_lent: newCDP.asset_lent,
      xlm_delta,
      asset_delta,
      interest_delta,
      accrued_interest,
      interest_paid,
      action,
      asset: newCDP.asset,
      timestamp: newCDP.updated_at,
    } as DeepPartial<CDPHistory>);

    return this.cdpHistoryRepository.save(historyEntry);
  }

  async calculateDailyVolume(date: Date): Promise<{ xlm_volume: string, asset_volume: string, interest_volume: string }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const history = await this.cdpHistoryRepository.find({
      where: {
        timestamp: Between(startOfDay, endOfDay)
      }
    });

    const xlm_volume = history.reduce((sum, entry) => 
      sum.plus(new BigNumber(entry.xlm_delta).abs()), new BigNumber(0));
    
    const asset_volume = history.reduce((sum, entry) => 
      sum.plus(new BigNumber(entry.asset_delta).abs()), new BigNumber(0));
      
    const interest_volume = history.reduce((sum, entry) => 
      sum.plus(new BigNumber(entry.interest_delta || "0").abs()), new BigNumber(0));

    return {
      xlm_volume: xlm_volume.toString(),
      asset_volume: asset_volume.toString(),
      interest_volume: interest_volume.toString()
    };
  }
}