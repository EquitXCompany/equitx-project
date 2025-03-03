import { BaseEntityResource } from './BaseEntityResource';
import { ProtocolStats } from '../entity/ProtocolStats';

export class ProtocolStatsResource extends BaseEntityResource {
    toJson(entity: ProtocolStats): Object {
        return {
            timestamp: entity.timestamp,
            globalMetrics: {
                totalValueLocked: entity.total_value_locked,
                totalDebt: entity.total_debt,
                totalOutstandingInterest: entity.total_outstanding_interest,
                totalPaidInterest: entity.total_paid_interest,
                uniqueUsers: entity.unique_users,
                activeCDPs: entity.active_cdps,
                totalStaked: entity.total_staked
            },
            riskMetrics: {
                systemCollateralization: entity.system_collateralization,
                liquidationEvents24h: entity.liquidation_events_24h,
                averageHealthFactor: entity.average_health_factor
            },
            volumeMetrics: {
                dailyVolume: entity.daily_volume,
            },
            growthMetrics: {
                userGrowth24h: entity.user_growth_24h,
                tvlGrowth24h: entity.tvl_growth_24h,
                volumeGrowth24h: entity.volume_growth_24h
            }
        };
    }

    toCompressed(entity: ProtocolStats): Object {
        return {
            t: 'ProtocolStats',
            ts: entity.timestamp,
            gm: {
                tvl: entity.total_value_locked,
                td: entity.total_debt,
                toi: entity.total_outstanding_interest,
                tpi: entity.total_paid_interest,
                uu: entity.unique_users,
                ac: entity.active_cdps,
                ts: entity.total_staked
            },
            rm: {
                sc: entity.system_collateralization,
                le: entity.liquidation_events_24h,
                hf: entity.average_health_factor
            },
            vm: {
                dv: entity.daily_volume,
            },
            gr: {
                ug: entity.user_growth_24h,
                tg: entity.tvl_growth_24h,
                vg: entity.volume_growth_24h
            }
        };
    }
}