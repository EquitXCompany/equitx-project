import { Liquidation } from 'entity/Liquidation';
import { BaseEntityResource } from './BaseEntityResource';

export class LiquidationResource extends BaseEntityResource {
    toJson(entity: Liquidation): Object {
        return {
            cdpId: entity.cdp.id,
            asset: entity.asset,
            liquidatedAmount: entity.xlm_liquidated,
            debtCovered: entity.debt_covered,
            timestamp: entity.timestamp,
            collateralizationRatioAtLiquidation: entity.collateralization_ratio
        };
    }

    toCompressed(entity: Liquidation): Object {
        return {
            t: 'Liquidation',
            cid: entity.cdp.id,
            a: entity.asset,
            la: entity.xlm_liquidated,
            dc: entity.debt_covered,
            ts: entity.timestamp,
            cr: entity.collateralization_ratio
        };
    }
}
