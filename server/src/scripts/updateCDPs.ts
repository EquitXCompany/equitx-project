import cron from "node-cron";
import { CDP, CDPStatus } from "../entity/CDP";
import BigNumber from "bignumber.js";
import dotenv from "dotenv";
import axios from "axios";
import { getLatestPriceData, getTotalXAsset, serverAuthenticatedContractCall } from "../utils/serverContractHelpers";
import { assetConfig } from "../config/AssetConfig";
import { LastQueriedTimestampService } from "../services/lastQueriedTimestampService";
import { TableType } from "../entity/LastQueriedTimestamp";
import { CDPService } from "../services/cdpService";
import { AppDataSource } from "../ormconfig";
import { AssetService } from "../services/assetService";
import { CDPHistoryAction } from "../entity/CDPHistory";
import { CDPHistoryService } from "../services/cdpHistoryService";
import { LiquidationService } from "../services/liquidationService";

dotenv.config();

const apiClient = axios.create({
  baseURL: "https://api.mercurydata.app",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.RETROSHADE_API_TOKEN}`,
  },
});

function CalculateCollateralizationRatio(
  asset_lent: BigNumber,
  xlm_deposited: BigNumber,
  xlm_price: BigNumber,
  xasset_price: BigNumber
): BigNumber {
  if (asset_lent.isEqualTo(0) || xasset_price.isEqualTo(0)) {
    return new BigNumber(Infinity);
  }
  return xlm_deposited
    .times(xlm_price)
    .div(asset_lent.times(xasset_price));
}



interface RetroShadeCDP {
  id: string;
  contract_id: string;
  xlm_deposited: string;
  asset_lent: string;
  status: string[];
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
    });
      

    const action = await determineAction(oldCDP, newCDP);
    if(action === CDPHistoryAction.LIQUIDATE){
      const liquidationService = await LiquidationService.create();
      const oldXLMDeposited = new BigNumber(oldCDP!.xlm_deposited);
      const newXLMDeposited = new BigNumber(newCDP.xlm_deposited);
      const oldAssetLent = new BigNumber(oldCDP!.asset_lent);
      const newAssetLent = new BigNumber(newCDP.asset_lent);
      const xlmDiff = oldXLMDeposited.minus(newXLMDeposited);
      const assetDiff = oldAssetLent.minus(newAssetLent);
      const xlmPrice = (await getLatestPriceData("XLM", cdp.contract_id)).price;
      const assetPrice = (await getLatestPriceData(assetSymbol, cdp.contract_id)).price;
      const collateralizationRatio = CalculateCollateralizationRatio(assetDiff, xlmDiff, xlmPrice, assetPrice);
      await liquidationService.createLiquidation(
        newCDP,
        newCDP.asset,
        xlmDiff.toString(),
        assetDiff.toString(),
        collateralizationRatio.toString(),
      );
    }
    await cdpHistoryService.createHistoryEntry(newCDP.id, newCDP, action, oldCDP);
  }
}

async function fetchCDPs(
  tableName: string,
  lastQueriedTimestamp: number
): Promise<RetroShadeCDP[]> {
  try {
    const { data } = await apiClient.post("/retroshadesv1", {
      query: `SELECT * FROM ${tableName} WHERE timestamp > ${lastQueriedTimestamp} ORDER BY timestamp DESC`,
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

    return Array.from(latestEntries.values());
  } catch (error) {
    console.error("Error fetching CDPs:", error);
    throw error;
  }
}

async function getLastQueriedTimestamp(wasmHash: string): Promise<number> {
  const timestampService = await LastQueriedTimestampService.create();
  return timestampService.getTimestamp(wasmHash, TableType.CDP);
}

async function updateLastQueriedTimestamp(
  wasmHash: string,
  timestamp: number
): Promise<void> {
  const timestampService = await LastQueriedTimestampService.create();
  await timestampService.updateTimestamp(wasmHash, TableType.CDP, timestamp);
}

async function getWasmHashToLiquidityPoolMapping(): Promise<Map<string, Map<string, string>>> {
  const mapping = new Map<string, Map<string, string>>();
  
  for (const [assetSymbol, assetDetails] of Object.entries(assetConfig)) {
    if (!mapping.has(assetDetails.wasm_hash)) {
      mapping.set(assetDetails.wasm_hash, new Map());
    }
    mapping.get(assetDetails.wasm_hash)!.set(assetDetails.pool_address, assetSymbol);
  }
  
  return mapping;
}

async function updateCDPs(wasmHashToUpdate: string | null = null) {
  try {
    const cdpRepository = AppDataSource.getRepository(CDP);
    const wasmHashMapping = await getWasmHashToLiquidityPoolMapping();

    for (const [wasmHash, contractMapping] of wasmHashMapping) {
      if(wasmHashToUpdate !== null && wasmHashToUpdate !== wasmHash){
        continue;
      }
      let nLiquidated = 0;
      const lastTimestamp = await getLastQueriedTimestamp(wasmHash);
      //console.log(`querying cdps from reflector with timestamp ${lastTimestamp}`);
      const cdps = await fetchCDPs(`cdp${wasmHash}`, lastTimestamp);

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
              const totalXLM = await getTotalXAsset(cdp.contract_id);
              if(totalXLM.isGreaterThan(0)){
                const {result, status} = await serverAuthenticatedContractCall(
                  "liquidate_cdp",
                  { lender: cdp.id },
                  cdp.contract_id
                );
                if(result.value[2] === CDPStatus.Closed){
                  console.log("CDP has been closed");
                  nLiquidated++;
                }
                else{
                  if(status === "SUCCESS"){
                    nLiquidated++;
                    console.log("CDP has been partially liquidated");
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
        await updateLastQueriedTimestamp(wasmHash, newLastTimestamp);
        //console.log(`Updated last queried timestamp for wasm hash ${wasmHash} with ${newLastTimestamp}`);
      }

      //console.log(`Updated ${cdps.length} CDPs for wasm hash ${wasmHash}`);
      if(nLiquidated > 0){
        console.log(`${nLiquidated} were liquidated, scheduling requery in 20s`);
        setTimeout(() => updateCDPs(wasmHash), 20000); // todo instead we should recheck the cdp by querying the blockchain directly then ensure no history values get put in db if the previous value of the cdp is hte same as currrent
      }
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