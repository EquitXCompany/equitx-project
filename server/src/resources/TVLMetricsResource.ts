import { BaseEntityResource } from './BaseEntityResource';
import { TVLMetrics } from '../entity/TVLMetrics';

export class TVLMetricsResource extends BaseEntityResource {
    toJson(entity: TVLMetrics): Object {
        return {
            asset: entity.asset.symbol,
            totalXlmLocked: entity.total_xlm_locked,
            totalXassetsMinted: entity.total_xassets_minted,
            totalXassetsStaked: entity.total_xassets_staked,
            activeCDPsCount: entity.active_cdps_count,
            tvlUSD: entity.tvl_usd,
            totalXassetsMintedUSD: entity.total_xassets_minted_usd,
            totalXassetsStakedUSD: entity.total_xassets_staked_usd,
            timestamp: entity.timestamp
        };
    }

    toCompressed(entity: TVLMetrics): Object {
        return {
            t: 'TVLMetrics',
            a: entity.asset.symbol,
            xl: entity.total_xlm_locked,
            xm: entity.total_xassets_minted,
            xs: entity.total_xassets_staked,
            ac: entity.active_cdps_count,
            tu: entity.tvl_usd,
            mu: entity.total_xassets_minted_usd,
            su: entity.total_xassets_staked_usd,
            ts: entity.timestamp
        };
    }
}