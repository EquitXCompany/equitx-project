import { BaseEntityResource } from './BaseEntityResource';
import { UserMetrics } from '../entity/UserMetrics';

export class UserMetricsResource extends BaseEntityResource {
    toJson(entity: UserMetrics): Object {
        return {
            address: entity.address,
            totalCDPs: entity.total_cdps,
            activePositions: {
                totalValueLocked: entity.total_value_locked,
                totalDebt: entity.total_debt,
                averageCollateralizationRatio: entity.avg_collateralization_ratio
            },
            historicalMetrics: {
                totalVolume: entity.total_volume,
                liquidationsReceived: entity.liquidations_received,
                liquidationsExecuted: entity.liquidations_executed
            },
            riskProfile: {
                riskScore: entity.risk_score,
                lastActivity: entity.last_activity,
                averagePositionDuration: entity.avg_position_duration
            }
        };
    }

    toCompressed(entity: UserMetrics): Object {
        return {
            t: 'UserMetrics',
            a: entity.address,
            tc: entity.total_cdps,
            ap: {
                tvl: entity.total_value_locked,
                td: entity.total_debt,
                cr: entity.avg_collateralization_ratio
            },
            hm: {
                tv: entity.total_volume,
                lr: entity.liquidations_received,
                le: entity.liquidations_executed
            },
            rp: {
                rs: entity.risk_score,
                la: entity.last_activity,
                ad: entity.avg_position_duration
            }
        };
    }
}
