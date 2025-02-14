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
            openAccounts: entity.open_accounts,
            stakedShareHistogram: {
              bucketSize: entity.staked_share_histogram.bucket_size,
              min: entity.staked_share_histogram.min,
              max: entity.staked_share_histogram.max,
              buckets: entity.staked_share_histogram.buckets
            },
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
            oa: entity.open_accounts,
            sh: {
              bs: entity.staked_share_histogram.bucket_size,
              mn: entity.staked_share_histogram.min, 
              mx: entity.staked_share_histogram.max,
              b: entity.staked_share_histogram.buckets
            },
            ts: entity.timestamp
        };
    }
}
