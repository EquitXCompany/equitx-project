import { Liquidation } from 'entity/Liquidation';
import { BaseEntityResource } from './BaseEntityResource';

export class LiquidationResource extends BaseEntityResource {
    toJson(entity: Liquidation): Object {
        return {
            cdpId: entity.cdp.id,
            asset: entity.asset.symbol,
            collateralLiquidated: entity.collateral_liquidated,
            collateralLiquidatedUsd: entity.collateral_liquidated_usd,
            principalRepaid: entity.principal_repaid,
            accruedInterestRepaid: entity.accrued_interest_repaid,
            collateralAppliedToInterest: entity.collateral_applied_to_interest,
            timestamp: entity.timestamp,
            collateralizationRatio: entity.collateralization_ratio,
            xlmPrice: entity.xlm_price,
            xassetPrice: entity.xasset_price
        };
    }

    toCompressed(entity: Liquidation): Object {
        return {
            t: 'Liquidation',
            cid: entity.cdp.id,
            a: entity.asset.symbol,
            cl: entity.collateral_liquidated,
            clu: entity.collateral_liquidated_usd,
            pr: entity.principal_repaid,
            air: entity.accrued_interest_repaid,
            cai: entity.collateral_applied_to_interest,
            ts: entity.timestamp,
            cr: entity.collateralization_ratio,
            xp: entity.xlm_price,
            ap: entity.xasset_price
        };
    }
}