import cron from "node-cron";
import { CDP, CDPStatus } from "../entity/CDP";
import BigNumber from "bignumber.js";
import dotenv from "dotenv";
import {
  getTotalXAsset,
  serverAuthenticatedContractCall,
} from "../utils/serverContractHelpers";
import { LastQueriedTimestampService } from "../services/lastQueriedTimestampService";
import { TableType } from "../entity/LastQueriedTimestamp";
import { CDPService } from "../services/cdpService";
import { AppDataSource } from "../ormconfig";
import { AssetService } from "../services/assetService";
import { CDPHistoryAction } from "../entity/CDPHistory";
import { CDPHistoryService } from "../services/cdpHistoryService";
import { LiquidationService } from "../services/liquidationService";
import { DECIMALS_XLM } from "../config/constants";
import { CDPEventService } from "../services/cdpEventService";
import { LiquidationEventService } from "../services/liquidationEventService";
import { CDPEvent } from "../entity/CDPEvent";
import { LiquidationEvent } from "../entity/LiquidationEvent";

dotenv.config();

async function determineAction(
  oldCDP: CDP | null,
  newCDP: CDP
): Promise<CDPHistoryAction> {
  if (!oldCDP) return CDPHistoryAction.OPEN;

  if (oldCDP.status !== newCDP.status) {
    if (newCDP.status === CDPStatus.Frozen) return CDPHistoryAction.FREEZE;
    if (newCDP.status === CDPStatus.Closed) return CDPHistoryAction.LIQUIDATE;
  }
  if (oldCDP.status === CDPStatus.Frozen) return CDPHistoryAction.LIQUIDATE;

  const oldXlm = new BigNumber(oldCDP.xlm_deposited);
  const newXlm = new BigNumber(newCDP.xlm_deposited);
  const oldAsset = new BigNumber(oldCDP.asset_lent);
  const newAsset = new BigNumber(newCDP.asset_lent);
  const oldInterestPaid = new BigNumber(oldCDP.interest_paid || "0");
  const newInterestPaid = new BigNumber(newCDP.interest_paid || "0");

  // Check if interest was paid
  if (newInterestPaid.isGreaterThan(oldInterestPaid)) {
    return CDPHistoryAction.PAY_INTEREST;
  }

  if (!oldXlm.isEqualTo(newXlm)) {
    return newXlm.isGreaterThan(oldXlm)
      ? CDPHistoryAction.ADD_COLLATERAL
      : CDPHistoryAction.WITHDRAW_COLLATERAL;
  }

  if (!oldAsset.isEqualTo(newAsset)) {
    return newAsset.isGreaterThan(oldAsset)
      ? CDPHistoryAction.BORROW_ASSET
      : CDPHistoryAction.REPAY_DEBT;
  }

  return CDPHistoryAction.OPEN;
}

async function updateCDPsInDatabase(
  cdpEvents: CDPEvent[],
  assetSymbol: string
): Promise<void> {
  const assetService = await AssetService.create();
  const cdpService = await CDPService.create();
  const cdpHistoryService = await CDPHistoryService.create();
  const asset = await assetService.findOne(assetSymbol);

  if (!asset) {
    console.error(`Could not find asset ${assetSymbol}`);
    return;
  }

  for (const cdpEvent of cdpEvents) {
    console.log(
      `processing cdp event at timestamp ${cdpEvent.timestamp} with status ${cdpEvent.status}`
    );
    const lender = cdpEvent.lender;
    const oldCDP = await cdpService.findOneRaw(assetSymbol, lender);
    const newCDP = await cdpService.upsert(assetSymbol, lender, {
      asset: asset,
      lender,
      xlm_deposited: new BigNumber(cdpEvent.xlm_deposited).toString(),
      asset_lent: new BigNumber(cdpEvent.asset_lent).toString(),
      status: cdpEvent.status,
      accrued_interest: new BigNumber(
        cdpEvent.accrued_interest || "0"
      ).toString(),
      interest_paid: new BigNumber(cdpEvent.interest_paid || "0").toString(),
      last_interest_time: cdpEvent.last_interest_time || "0",
      updated_at: new Date(Number(cdpEvent.timestamp * 1000)),
      created_at: oldCDP
        ? oldCDP.created_at
        : new Date(Number(cdpEvent.timestamp * 1000)),
    });

    const action = await determineAction(oldCDP, newCDP);

    await cdpHistoryService.createHistoryEntry(
      newCDP.id,
      newCDP,
      action,
      oldCDP,
      {
        interestDelta: oldCDP
          ? new BigNumber(newCDP.interest_paid)
              .minus(oldCDP.interest_paid || "0")
              .toString()
          : "0",
        accruedInterest: newCDP.accrued_interest,
        interestPaid: newCDP.interest_paid,
      }
    );
  }
}

async function processLiquidations(
  liquidationEvents: LiquidationEvent[],
  assetSymbol: string
): Promise<void> {
  const assetService = await AssetService.create();
  const cdpService = await CDPService.create();
  const liquidationService = await LiquidationService.create();
  const asset = await assetService.findOne(assetSymbol);

  if (!asset) {
    console.error(`Could not find asset ${assetSymbol}`);
    return;
  }

  for (const liquidationEvent of liquidationEvents) {
    console.log(
      `processing liquidation event at timestamp ${liquidationEvent.timestamp}`
    );
    const cdp = await cdpService.findOneRaw(
      assetSymbol,
      liquidationEvent.cdp_id
    );
    if (!cdp) {
      console.error(`Could not find CDP for lender ${liquidationEvent.cdp_id}`);
      continue;
    }

    const xlmPrice = liquidationEvent.xlm_price;
    const xlmLiquidatedUsd = new BigNumber(
      liquidationEvent.collateral_liquidated
    )
      .multipliedBy(xlmPrice)
      .dividedBy(new BigNumber(10).pow(DECIMALS_XLM))
      .toString();

    await liquidationService.createLiquidation(
      cdp,
      asset,
      liquidationEvent.collateral_liquidated,
      liquidationEvent.principal_repaid,
      liquidationEvent.collateralization_ratio.toString(),
      xlmLiquidatedUsd,
      new Date(Number(liquidationEvent.timestamp * 1000)),
      liquidationEvent.accrued_interest_repaid,
      liquidationEvent.collateral_applied_to_interest,
      liquidationEvent.xlm_price,
      liquidationEvent.xasset_price
    );
  }
}

async function getLastQueriedTimestamp(tableType: TableType): Promise<number> {
  const timestampService = await LastQueriedTimestampService.create();
  return timestampService.getTimestamp(tableType);
}

async function updateLastQueriedTimestamp(
  tableType: TableType,
  timestamp: number
): Promise<void> {
  const timestampService = await LastQueriedTimestampService.create();
  await timestampService.updateTimestamp(tableType, timestamp);
}

async function getPoolSymbolMapping(
  assetService: any
): Promise<Map<string, string>> {
  const mapping = new Map<string, string>();
  const assets = await assetService.findAllWithPools();

  assets.forEach((asset: any) => {
    if (!asset.liquidityPool) {
      console.warn(
        `No pool address found for asset ${asset.symbol} in updateStakes`
      );
      return;
    }
    mapping.set(asset.liquidityPool.pool_address, asset.symbol);
  });

  return mapping;
}

async function updateCDPs() {
  try {
    const assetService = await AssetService.create();
    const cdpEventService = await CDPEventService.create();
    const liquidationEventService = await LiquidationEventService.create();
    const cdpRepository = AppDataSource.getRepository(CDP);
    const contractMapping = await getPoolSymbolMapping(assetService);

    let nLiquidated = 0;

    // Process CDP Events
    const lastCDPTimestamp = await getLastQueriedTimestamp(TableType.CDP);
    const cdpEvents =
      await cdpEventService.findEventsAfterTimestamp(lastCDPTimestamp);

    // Group events by asset symbol based on contract_id
    const eventsByAsset = new Map<string, CDPEvent[]>();
    for (const cdpEvent of cdpEvents) {
      const assetSymbol = contractMapping.get(cdpEvent.contract_id);
      if (!assetSymbol) {
        console.warn(`No asset found for contract ID ${cdpEvent.contract_id}`);
        continue;
      }

      if (!eventsByAsset.has(assetSymbol)) {
        eventsByAsset.set(assetSymbol, []);
      }
      eventsByAsset.get(assetSymbol)!.push(cdpEvent);
    }

    // Process events for each asset
    for (const [assetSymbol, events] of eventsByAsset) {
      await updateCDPsInDatabase(events, assetSymbol);

      // Check for CDPs that need freezing/liquidation
      for (const cdpEvent of events) {
        if (
          cdpEvent.status === CDPStatus.Insolvent ||
          cdpEvent.status === CDPStatus.Frozen
        ) {
          const serverCDP = await cdpRepository.findOne({
            where: { lender: cdpEvent.lender },
          });

          if (cdpEvent.status === CDPStatus.Insolvent) {
            console.log(
              `Attempting to freeze insolvent CDP for lender: ${cdpEvent.lender}`
            );
            try {
              const result = await serverAuthenticatedContractCall(
                "freeze_cdp",
                { lender: cdpEvent.lender },
                cdpEvent.contract_id
              );
              console.log(
                `Successfully frozen CDP for lender: ${cdpEvent.lender}. Result: ${result}`
              );
            } catch (error) {
              console.error(
                `Error freezing CDP for lender ${cdpEvent.lender}:`,
                error
              );
            }
          } else if (cdpEvent.status === CDPStatus.Frozen) {
            console.log(
              `Attempting to liquidate frozen CDP for lender: ${cdpEvent.lender}`
            );
            try {
              const totalXasset = await getTotalXAsset(cdpEvent.contract_id);
              if (totalXasset.isGreaterThan(0)) {
                const { result, status } =
                  await serverAuthenticatedContractCall(
                    "liquidate_cdp",
                    { lender: cdpEvent.lender },
                    cdpEvent.contract_id
                  );
                if (result.value[2] === CDPStatus.Closed) {
                  console.log("CDP has been closed");
                  nLiquidated++;
                } else {
                  if (status === "SUCCESS") {
                    nLiquidated++;
                    console.log(
                      `CDP has been partially liquidated, status is ${result.value[2]}`
                    );
                  } else console.log("CDP liquidation failed");
                }
              } else {
                console.log("No XLM in the pool for liquidation, skipping");
              }
            } catch (error) {
              console.error(
                `Error liquidating CDP for lender ${cdpEvent.lender}:`,
                error
              );
            }
          }
        }
      }
    }

    if (cdpEvents.length > 0) {
      const newLastTimestamp = Math.max(
        ...cdpEvents.map((event) => Number(event.timestamp))
      );
      await updateLastQueriedTimestamp(TableType.CDP, newLastTimestamp);
    }

    // Process Liquidation Events
    const lastLiquidationTimestamp = await getLastQueriedTimestamp(
      TableType.LIQUIDATION
    );
    const liquidationEvents =
      await liquidationEventService.findEventsAfterTimestamp(
        lastLiquidationTimestamp
      );

    // Group liquidation events by asset symbol
    const liquidationsByAsset = new Map<string, LiquidationEvent[]>();
    for (const liquidationEvent of liquidationEvents) {
      const assetSymbol = contractMapping.get(liquidationEvent.contract_id);
      if (!assetSymbol) {
        console.warn(
          `No asset found for contract ID ${liquidationEvent.contract_id}`
        );
        continue;
      }

      if (!liquidationsByAsset.has(assetSymbol)) {
        liquidationsByAsset.set(assetSymbol, []);
      }
      liquidationsByAsset.get(assetSymbol)!.push(liquidationEvent);
    }

    // Process liquidations for each asset
    for (const [assetSymbol, events] of liquidationsByAsset) {
      await processLiquidations(events, assetSymbol);
    }

    if (liquidationEvents.length > 0) {
      const newLastTimestamp = Math.max(
        ...liquidationEvents.map((event) => Number(event.timestamp))
      );
      await updateLastQueriedTimestamp(TableType.LIQUIDATION, newLastTimestamp);
    }

    if (nLiquidated > 0) {
      console.log(`${nLiquidated} were liquidated, scheduling requery in 20s`);
      setTimeout(() => updateCDPs(), 20000);
    }
  } catch (error) {
    console.error("Error updating CDPs:", error);
  }
}

export async function startCDPUpdateJob() {
  console.log("Database connection established for CDP update job");

  // Run the job every 5 minutes
  cron.schedule("*/5 * * * *", () => updateCDPs());

  // Run the job immediately on startup
  updateCDPs();
}
