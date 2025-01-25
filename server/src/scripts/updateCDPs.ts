import cron from "node-cron";
import { CDP, CDPStatus } from "../entity/CDP";
import { AppDataSource } from "../ormconfig";
import BigNumber from "bignumber.js";
import dotenv from "dotenv";
import axios from "axios";
import { serverAuthenticatedContractCall } from "../utils/serverContractHelpers";
import { LiquidityPoolService } from "../services/liquidityPoolService";
import { assetConfig } from "../config/AssetConfig";
import { createAssetsIfNotExist } from "./createAssets";
import { AssetService } from "../services/assetService";
import { LastQueriedTimestampService } from "../services/lastQueriedTimestampService";

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

async function updateCDPsInDatabase(cdps: RetroShadeCDP[], asset_symbol: string): Promise<void> {
  const cdpRepository = AppDataSource.getRepository(CDP);

  for (const cdp of cdps) {
    const address = cdp.id;

    await cdpRepository.save({
      asset_symbol,
      address,
      xlm_deposited: new BigNumber(cdp.xlm_deposited).toString(),
      asset_lent: new BigNumber(cdp.asset_lent).toString(),
      status: CDPStatus[cdp.status[0] as keyof typeof CDPStatus],
    });
  }
}

async function getLastQueriedTimestamp(assetSymbol: string): Promise<number> {
  const assetService = await AssetService.create();
  const lastQueriedTimestampService = await LastQueriedTimestampService.create();

  const asset = await assetService.findOne(assetSymbol);
  if (!asset) {
    throw new Error(`Asset with symbol ${assetSymbol} not found`);
  }

  return await lastQueriedTimestampService.getLastQueriedTimestamp(asset);
}

async function updateLastQueriedTimestamp(
  assetSymbol: string,
  timestamp: number
): Promise<void> {
  const assetService = await AssetService.create();
  const lastQueriedTimestampService = await LastQueriedTimestampService.create();

  const asset = await assetService.findOne(assetSymbol);
  if (!asset) {
    throw new Error(`Asset with symbol ${assetSymbol} not found`);
  }

  await lastQueriedTimestampService.updateLastQueriedTimestamp(asset, timestamp);
}

async function getLiquidityPoolId(assetSymbol: string): Promise<string> {
  const liq = await LiquidityPoolService.create();
  const liquidityPool = await liq.findOne(assetSymbol);
  if (liquidityPool) return liquidityPool.pool_address;
  else throw new Error(`No liquidity pool for asset symbol ${assetSymbol}`);
}

async function updateCDPs() {
  try {
    for (const [assetSymbol, assetDetails] of Object.entries(assetConfig)) {
      const lastTimestamp = await getLastQueriedTimestamp(assetSymbol);
      console.log(`querying cdps from reflector with timestamp ${lastTimestamp}`);
      const cdps = await fetchCDPs(assetDetails.retroshades_cdp, lastTimestamp);
      const liquidityPoolId = await getLiquidityPoolId(assetSymbol);
      await updateCDPsInDatabase(cdps, assetSymbol);

      if (cdps.length > 0) {
        const newLastTimestamp = Math.max(...cdps.map((cdp) => cdp.timestamp));
        await updateLastQueriedTimestamp(assetSymbol, newLastTimestamp);
        console.log(`Updated last queried timestamp for ${assetSymbol} with ${newLastTimestamp}`);
      }

      console.log(`Updated ${cdps.length} CDPs for ${assetSymbol}`);

      // Process insolvent and frozen CDPs
      // todo: also need to periodically check when prices change for newly insolvent CDPs
      for (const cdp of cdps) {
        const lender = cdp.id;

        if (cdp.status[0] === "Insolvent") {
          console.log(
            `Attempting to freeze insolvent CDP for lender: ${lender}`
          );
          try {
            const result = await serverAuthenticatedContractCall(
              "freeze_cdp",
              { lender },
              liquidityPoolId
            );
            console.log(
              `Successfully frozen CDP for lender: ${lender}. Result: ${result}`
            );
          } catch (error) {
            console.error(`Error freezing CDP for lender ${lender}:`, error);
          }
        } else if (cdp.status[0] === "Frozen") {
          console.log(
            `Attempting to liquidate frozen CDP for lender: ${lender}`
          );
          try {
            const result = await serverAuthenticatedContractCall(
              "liquidate_cdp",
              { lender },
              liquidityPoolId
            );
            console.log(
              `Successfully liquidated CDP for lender: ${lender}. Result: ${result}`
            );
          } catch (error) {
            console.error(`Error liquidating CDP for lender ${lender}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error updating CDPs:", error);
  }
}

export async function startCDPUpdateJob() {
  console.log("Database connection established for CDP update job");

  // Run the job every 5 minutes
  cron.schedule("*/5 * * * *", updateCDPs);

  // add any new assets if needed
  await createAssetsIfNotExist(assetConfig);
  // Run the job immediately on startup
  updateCDPs();
}
