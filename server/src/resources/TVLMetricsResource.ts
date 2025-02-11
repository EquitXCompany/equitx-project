import { BaseEntityResource } from './BaseEntityResource';
import { TVLMetrics } from '../entity/TVLMetrics';

export class TVLMetricsResource extends BaseEntityResource {
    toJson(entity: TVLMetrics): Object {
        return {
            asset: entity.asset.symbol,
            totalXlmLocked: entity.total_xlm_locked,
            totalXassetsMinted: entity.total_xassets_minted,
            activeCDPsCount: entity.active_cdps_count,
            tvlUSD: entity.tvl_usd,
            timestamp: entity.timestamp
        };
    }

    toCompressed(entity: TVLMetrics): Object {
        return {
            t: 'TVLMetrics',
            a: entity.asset.symbol,
            xl: entity.total_xlm_locked,
            xm: entity.total_xassets_minted,
            ac: entity.active_cdps_count,
            tu: entity.tvl_usd,
            ts: entity.timestamp
        };
    }
}
