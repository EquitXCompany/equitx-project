import cron from "node-cron";
import { CDP, CDPStatus } from "../entity/CDP";
import BigNumber from "bignumber.js";
import dotenv from "dotenv";
import axios, { AxiosError } from "axios";
import { getTotalXAsset, serverAuthenticatedContractCall } from "../utils/serverContractHelpers";
import { LastQueriedTimestampService } from "../services/lastQueriedTimestampService";
import { TableType } from "../entity/LastQueriedTimestamp";
import { CDPService } from "../services/cdpService";
import { AppDataSource } from "../ormconfig";
import { AssetService } from "../services/assetService";
import { CDPHistoryAction } from "../entity/CDPHistory";
import { CDPHistoryService } from "../services/cdpHistoryService";
import { LiquidationService } from "../services/liquidationService";
import { DECIMALS_XLM, X_WASM_HASH } from "../config/constants";

dotenv.config();

const apiClient = axios.create({
  baseURL: "https://api.mercurydata.app",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.RETROSHADE_API_TOKEN}`,
  },
});

/*function CalculateCollateralizationRatio(
  asset_lent: BigNumber,
  xlm_deposited: BigNumber,
  xlm_price: BigNumber,
  xasset_price: BigNumber
): BigNumber {
  if (asset_lent.isEqualTo(0) || xasset_price.isEqualTo(0)) {
    return new BigNumber(Infinity);
  }
  return xlm_deposited
    .times(xlm_price).times(100)
    .div(asset_lent.times(xasset_price));
}*/

interface RetroShadeCDP {
  id: string;
  contract_id: string;
  xlm_deposited: string;
  asset_lent: string;
  status: string[];
  timestamp: number;
  accrued_interest: string;
  interest_paid: string;
  last_interest_time: string;
  ledger: number;
}

interface RetroShadeLiquidation {
  cdp_id: string;
  contract_id: string;
  collateral_liquidated: string;
  principal_repaid: string;
  accrued_interest_repaid: string;
  collateral_applied_to_interest: string;
  collateralization_ratio: number;
  xasset_price: string;
  xlm_price: string;
  ledger: number;
  timestamp: number;
}

async function determineAction(oldCDP: CDP | null, newCDP: CDP): Promise<CDPHistoryAction> {
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
  const oldInterestPaid = new BigNumber(oldCDP.interest_paid || '0');
  const newInterestPaid = new BigNumber(newCDP.interest_paid || '0');

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

async function updateCDPsInDatabase(cdps: RetroShadeCDP[], assetSymbol: string): Promise<void> {
  const assetService = await AssetService.create();
  const cdpService = await CDPService.create();
  const cdpHistoryService = await CDPHistoryService.create();
  const asset = await assetService.findOne(assetSymbol);

  if (!asset) {
    console.error(`Could not find asset ${assetSymbol}`);
    return;
  }

  for (const cdp of cdps) {
    const lender = cdp.id;
    const oldCDP = await cdpService.findOneRaw(assetSymbol, lender);
    const newCDP = await cdpService.upsert(assetSymbol, lender, {
      asset: asset,
      lender,
      xlm_deposited: new BigNumber(cdp.xlm_deposited).toString(),
      asset_lent: new BigNumber(cdp.asset_lent).toString(),
      status: CDPStatus[cdp.status[0] as keyof typeof CDPStatus],
      accrued_interest: new BigNumber(cdp.accrued_interest || '0').toString(),
      interest_paid: new BigNumber(cdp.interest_paid || '0').toString(),
      last_interest_time: cdp.last_interest_time || '0',
      updated_at: new Date(cdp.timestamp * 1000),
      created_at: oldCDP ? oldCDP.created_at : new Date(cdp.timestamp * 1000),
    });

    const action = await determineAction(oldCDP, newCDP);

    await cdpHistoryService.createHistoryEntry(
      newCDP.id,
      newCDP,
      action,
      oldCDP,
      {
        interestDelta: oldCDP ?
          new BigNumber(newCDP.interest_paid).minus(oldCDP.interest_paid || '0').toString() :
          '0',
        accruedInterest: newCDP.accrued_interest,
        interestPaid: newCDP.interest_paid
      }
    );
  }
}

async function processLiquidations(
  liquidations: RetroShadeLiquidation[],
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

  for (const liquidation of liquidations) {
    const cdp = await cdpService.findOneRaw(assetSymbol, liquidation.cdp_id);
    if (!cdp) {
      console.error(`Could not find CDP for lender ${liquidation.cdp_id}`);
      continue;
    }

    const xlmPrice = liquidation.xlm_price;
    const xlmLiquidatedUsd = new BigNumber(liquidation.collateral_liquidated)
      .multipliedBy(xlmPrice)
      .dividedBy((new BigNumber(10)).pow(DECIMALS_XLM))
      .toString();

    await liquidationService.createLiquidation(
      cdp,
      asset,
      liquidation.collateral_liquidated,
      liquidation.principal_repaid,
      liquidation.collateralization_ratio.toString(),
      xlmLiquidatedUsd,
      new Date(liquidation.timestamp * 1000),
      liquidation.accrued_interest_repaid,
      liquidation.collateral_applied_to_interest,
      liquidation.xlm_price,
      liquidation.xasset_price,
    );
  }
}

async function fetchCDPs(
  tableName: string,
  lastQueriedTimestamp: number
): Promise<RetroShadeCDP[]> {
  try {
    const { data } = await apiClient.post("/retroshadesv1", {
      query: `SELECT * FROM ${tableName} WHERE timestamp > ${lastQueriedTimestamp} ORDER BY timestamp ASC`,
    });
    const latestEntries = new Map<string, RetroShadeCDP>();
    data.forEach((item: RetroShadeCDP) => {
      if (
        !latestEntries.has(item.id) ||
        item.timestamp > latestEntries.get(item.id)!.timestamp
      ) {
        latestEntries.set(item.id, item);
      }
    });

    return Array.from(latestEntries.values()).sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as AxiosError;
      const errorMessage = `Error fetching CDPs: ${axiosError.response?.status} - ${axiosError.response?.statusText} - ${axiosError.response?.data}`
      console.error(errorMessage);
      return [];
    }
    console.error("Error fetching CDPs:", error);
    throw error;
  }
}

async function fetchLiquidations(
  tableName: string,
  lastQueriedTimestamp: number
): Promise<RetroShadeLiquidation[]> {
  try {
    const { data } = await apiClient.post("/retroshadesv1", {
      query: `SELECT * FROM ${tableName} WHERE timestamp > ${lastQueriedTimestamp} ORDER BY timestamp ASC`,
    });

    return data.sort((a: RetroShadeLiquidation, b: RetroShadeLiquidation) => a.timestamp - b.timestamp);
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    const errorMessage = axiosError.response
      ? `Failed to fetch liquidations: ${axiosError.response.status} - ${axiosError.response.statusText} - - ${axiosError.response.data}`
      : `Failed to fetch liquidations: ${axiosError.message || 'Unknown error'}`;
    console.error(errorMessage);
    throw error;
  }
}

async function getLastQueriedTimestamp(wasmHash: string, tableType: TableType): Promise<number> {
  const timestampService = await LastQueriedTimestampService.create();
  return timestampService.getTimestamp(wasmHash, tableType);
}

async function updateLastQueriedTimestamp(
  wasmHash: string,
  tableType: TableType,
  timestamp: number
): Promise<void> {
  const timestampService = await LastQueriedTimestampService.create();
  await timestampService.updateTimestamp(wasmHash, tableType, timestamp);
}

async function getWasmHashToLiquidityPoolMapping(assetService: any): Promise<Map<string, Map<string, string>>> {
  const mapping = new Map<string, Map<string, string>>();
  mapping.set(X_WASM_HASH, new Map());
  const assets = await assetService.findAllWithPools();
  assets.forEach((asset: any) => {
    if (!asset.liquidityPool) {
      console.warn(`No pool address found for asset ${asset.symbol} in updateCDPs`);
      return;
    }
    mapping.get(X_WASM_HASH)!.set(asset.liquidityPool.pool_address, asset.symbol);
  });

  return mapping;
}

async function updateCDPs(wasmHashToUpdate: string | null = null) {
  try {
    const assetService = await AssetService.create();
    const cdpRepository = AppDataSource.getRepository(CDP);
    const wasmHashMapping = await getWasmHashToLiquidityPoolMapping(assetService);

    for (const [wasmHash, contractMapping] of wasmHashMapping) {
      if (wasmHashToUpdate !== null && wasmHashToUpdate !== wasmHash) {
        continue;
      }
      let nLiquidated = 0;

      // Process CDPs
      const lastCDPTimestamp = await getLastQueriedTimestamp(wasmHash, TableType.CDP);
      const cdps = await fetchCDPs(`cdp${wasmHash}`, lastCDPTimestamp);

      for (const cdp of cdps) {
        const assetSymbol = contractMapping.get(cdp.contract_id);
        if (!assetSymbol) {
          console.warn(`No asset found for contract ID ${cdp.contract_id}`);
          continue;
        }

        await updateCDPsInDatabase([cdp], assetSymbol);

        if (cdp.status[0] === "Insolvent" || cdp.status[0] === "Frozen") {
          const serverCDP = await cdpRepository.findOne({
            where: { lender: cdp.id },
          });

          if (cdp.status[0] === "Insolvent") {
            console.log(`Attempting to freeze insolvent CDP for lender: ${cdp.id}`);
            try {
              const result = await serverAuthenticatedContractCall(
                "freeze_cdp",
                { lender: cdp.id },
                cdp.contract_id
              );
              console.log(`Successfully frozen CDP for lender: ${cdp.id}. Result: ${result}`);
            } catch (error) {
              console.error(`Error freezing CDP for lender ${cdp.id}:`, error);
            }
          } else if (cdp.status[0] === "Frozen") {
            console.log(`Attempting to liquidate frozen CDP for lender: ${cdp.id}`);
            try {
              const totalXasset = await getTotalXAsset(cdp.contract_id);
              if (totalXasset.isGreaterThan(0)) {
                const { result, status } = await serverAuthenticatedContractCall(
                  "liquidate_cdp",
                  { lender: cdp.id },
                  cdp.contract_id
                );
                if (result.value[2] === CDPStatus.Closed) {
                  console.log("CDP has been closed");
                  nLiquidated++;
                }
                else {
                  if (status === "SUCCESS") {
                    nLiquidated++;
                    console.log(`CDP has been partially liquidated, status is ${result.value[2]}`);
                  }
                  else console.log("CDP liquidation failed");
                }
              } else {
                console.log("No XLM in the pool for liquidation, skipping");
              }
            } catch (error) {
              console.error(`Error liquidating CDP for lender ${cdp.id}:`, error);
            }
          }
        }
      }

      if (cdps.length > 0) {
        const newLastTimestamp = Math.max(...cdps.map((cdp) => cdp.timestamp));
        await updateLastQueriedTimestamp(wasmHash, TableType.CDP, newLastTimestamp);
      }

      // Process Liquidations
      const lastLiquidationTimestamp = await getLastQueriedTimestamp(wasmHash, TableType.LIQUIDATION);
      const liquidations = await fetchLiquidations(`liquidation${wasmHash}`, lastLiquidationTimestamp);

      for (const liquidation of liquidations) {
        const assetSymbol = contractMapping.get(liquidation.contract_id);
        if (!assetSymbol) {
          console.warn(`No asset found for contract ID ${liquidation.contract_id}`);
          continue;
        }

        await processLiquidations([liquidation], assetSymbol);
      }

      if (liquidations.length > 0) {
        const newLastTimestamp = Math.max(...liquidations.map((liq) => liq.timestamp));
        await updateLastQueriedTimestamp(wasmHash, TableType.LIQUIDATION, newLastTimestamp);
      }

      if (nLiquidated > 0) {
        console.log(`${nLiquidated} were liquidated, scheduling requery in 20s`);
        setTimeout(() => updateCDPs(wasmHash), 20000);
      }
    }
  } catch (error) {
    const axiosError = error as AxiosError;
    const errorMessage = axiosError.response
      ? `Error updating CDPs: ${axiosError.response.status} - ${axiosError.response.statusText} - ${axiosError.response.data}`
      : `Error updating CDPs: ${axiosError.message || 'Unknown error'}`;
    console.error(errorMessage);
  }
}

export async function startCDPUpdateJob() {
  console.log("Database connection established for CDP update job");

  // Run the job every 5 minutes
  cron.schedule("*/5 * * * *", () => updateCDPs());

  // Run the job immediately on startup
  updateCDPs();
}