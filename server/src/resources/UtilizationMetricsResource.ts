import { BaseEntityResource } from './BaseEntityResource';
import { UtilizationMetrics } from '../entity/UtilizationMetrics';

export class UtilizationMetricsResource extends BaseEntityResource {
    toJson(entity: UtilizationMetrics): Object {
        return {
            asset: entity.asset.symbol,
            dailyActiveUsers: entity.daily_active_users,
            dailyTransactions: entity.daily_transactions,
            dailyXlmVolume: entity.daily_xlm_volume,
            dailyXassetVolume: entity.daily_xasset_volume,
            timestamp: entity.timestamp
        };
    }

    toCompressed(entity: UtilizationMetrics): Object {
        return {
            t: 'UtilizationMetrics',
            a: entity.asset.symbol,
            du: entity.daily_active_users,
            dt: entity.daily_transactions,
            dx: entity.daily_xlm_volume,
            da: entity.daily_xasset_volume,
            ts: entity.timestamp
        };
    }
}
