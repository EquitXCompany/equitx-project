import { BaseEntityResource } from './BaseEntityResource';
import { CDPMetrics } from '../entity/CDPMetrics';

export class CDPMetricsResource extends BaseEntityResource {
    toJson(entity: CDPMetrics): Object {
        return {
            asset: entity.asset.symbol,
            totalCDPs: Number(entity.active_cdps_count),
            totalXLMLocked: entity.total_xlm_locked,
            interestMetrics: {
                totalOutstandingInterest: entity.total_outstanding_interest,
                totalPaidInterest: entity.total_paid_interest
            },
            collateralRatio: entity.collateral_ratio,
            riskMetrics: {
                nearLiquidation: entity.cdps_near_liquidation,
                recentLiquidations: entity.recent_liquidations,
                healthScore: entity.health_score
            },
            volumeMetrics: {
                dailyVolume: entity.daily_volume,
                weeklyVolume: entity.weekly_volume,
                monthlyVolume: entity.monthly_volume
            },
            collateralRatioHistogram: {
                bucketSize: entity.collateral_ratio_histogram.bucket_size,
                min: entity.collateral_ratio_histogram.min,
                max: entity.collateral_ratio_histogram.max,
                buckets: entity.collateral_ratio_histogram.buckets
            },
            timestamp: entity.timestamp
        };
    }

    toCompressed(entity: CDPMetrics): Object {
        return {
            t: 'CDPMetrics',
            a: entity.asset.symbol,
            tc: Number(entity.active_cdps_count),
            tl: entity.total_xlm_locked,
            im: {
                oi: entity.total_outstanding_interest,
                pi: entity.total_paid_interest
            },
            cr: entity.collateral_ratio,
            rm: {
                nl: entity.cdps_near_liquidation,
                rl: entity.recent_liquidations,
                hs: entity.health_score
            },
            vm: {
                dv: entity.daily_volume,
                wv: entity.weekly_volume,
                mv: entity.monthly_volume
            },
            crh: {
                bs: entity.collateral_ratio_histogram.bucket_size,
                mn: entity.collateral_ratio_histogram.min,
                mx: entity.collateral_ratio_histogram.max,
                b: entity.collateral_ratio_histogram.buckets
            },
            ts: entity.timestamp
        };
    }
}