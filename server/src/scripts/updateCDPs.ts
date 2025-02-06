import cron from "node-cron";
import { CDP, CDPStatus } from "../entity/CDP";
import BigNumber from "bignumber.js";
import dotenv from "dotenv";
import axios from "axios";
import { getTotalXAsset, serverAuthenticatedContractCall } from "../utils/serverContractHelpers";
import { LiquidityPoolService } from "../services/liquidityPoolService";
import { assetConfig } from "../config/AssetConfig";
import { LastQueriedTimestampService } from "../services/lastQueriedTimestampService";
import { TableType } from "../entity/LastQueriedTimestamp";
import { CDPService } from "../services/cdpService";
import { AppDataSource } from "../ormconfig";
import { AssetService } from "../services/assetService";

dotenv.config();

const apiClient = axios.create({
  baseURL: "https://api.mercurydata.app",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.RETROSHADE_API_TOKEN}`,
  },
});

interface RetroShadeCDP {
  id: string;
  contract_id: string;
  xlm_deposited: string;
  asset_lent: string;
  status: string[];
  timestamp: number;
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

async function updateCDPsInDatabase(cdps: RetroShadeCDP[], assetSymbol: string): Promise<void> {
  const assetService = await AssetService.create();
  const asset = await assetService.findOne(assetSymbol);
  const cdpService = await CDPService.create();

  if (!asset) {
    console.error(`Could not find asset ${assetSymbol}`);
    return;
  }

  for (const cdp of cdps) {
    const lender = cdp.id;
    await cdpService.upsert(assetSymbol, lender, {
      asset: asset,
      lender,
      xlm_deposited: new BigNumber(cdp.xlm_deposited).toString(),
      asset_lent: new BigNumber(cdp.asset_lent).toString(),
      status: CDPStatus[cdp.status[0] as keyof typeof CDPStatus],
    });
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

async function getLiquidityPoolId(assetSymbol: string): Promise<string> {
  const liq = await LiquidityPoolService.create();
  const liquidityPool = await liq.findOne(assetSymbol);
  if (liquidityPool) return liquidityPool.pool_address;
  else throw new Error(`No liquidity pool for asset symbol ${assetSymbol}`);
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

async function updateCDPs() {
  try {
    const cdpRepository = AppDataSource.getRepository(CDP);
    const wasmHashMapping = await getWasmHashToLiquidityPoolMapping();

    for (const [wasmHash, contractMapping] of wasmHashMapping) {
      const lastTimestamp = await getLastQueriedTimestamp(wasmHash);
      console.log(`querying cdps from reflector with timestamp ${lastTimestamp}`);
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
              serverCDP!.status = CDPStatus.Frozen;
              await cdpRepository.save(serverCDP!);
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
                  serverCDP!.status = CDPStatus.Closed;
                  await cdpRepository.save(serverCDP!);
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
        console.log(`Updated last queried timestamp for wasm hash ${wasmHash} with ${newLastTimestamp}`);
      }

      console.log(`Updated ${cdps.length} CDPs for wasm hash ${wasmHash}`);
    }
  } catch (error) {
    console.error("Error updating CDPs:", error);
  }
}

export async function startCDPUpdateJob() {
  console.log("Database connection established for CDP update job");

  // Run the job every 5 minutes
  cron.schedule("*/5 * * * *", updateCDPs);

  // Run the job immediately on startup
  updateCDPs();
}