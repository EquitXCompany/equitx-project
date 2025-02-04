import cron from "node-cron";
import { CDP, CDPStatus } from "../entity/CDP";
import BigNumber from "bignumber.js";
import dotenv from "dotenv";
import axios from "axios";
import { getTotalXAsset, serverAuthenticatedContractCall } from "../utils/serverContractHelpers";
import { LiquidityPoolService } from "../services/liquidityPoolService";
import { assetConfig } from "../config/AssetConfig";
import { AssetService } from "../services/assetService";
import { LastQueriedTimestampService } from "../services/lastQueriedTimestampService";
import { TableType } from "../entity/LastQueriedTimestamp";
import { CDPService } from "../services/cdpService";
import { AppDataSource } from "../ormconfig";


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

async function getLastQueriedTimestamp(assetSymbol: string): Promise<number> {
  const timestampService = await LastQueriedTimestampService.create();
  return timestampService.getTimestamp(assetSymbol, TableType.CDP);
}

async function updateLastQueriedTimestamp(
  assetSymbol: string,
  timestamp: number
): Promise<void> {
  const timestampService = await LastQueriedTimestampService.create();
  const assetService = await AssetService.create();
  const asset = await assetService.findOne(assetSymbol);
  
  if (!asset) {
    throw new Error(`Asset with symbol ${assetSymbol} not found`);
  }

  await timestampService.updateTimestamp(asset, TableType.CDP, timestamp);
}

async function getLiquidityPoolId(assetSymbol: string): Promise<string> {
  const liq = await LiquidityPoolService.create();
  const liquidityPool = await liq.findOne(assetSymbol);
  if (liquidityPool) return liquidityPool.pool_address;
  else throw new Error(`No liquidity pool for asset symbol ${assetSymbol}`);
}

async function updateCDPs() {
  try {
    const cdpRepository = AppDataSource.getRepository(CDP);
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
        const serverCDP = await cdpRepository.findOne({
          where: { lender },
        });

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
            serverCDP!.status = CDPStatus.Frozen;
            await cdpRepository.save(serverCDP!);
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
            const totalXLM = await getTotalXAsset(liquidityPoolId);
            if(totalXLM.isGreaterThan(0)){
              const {result, status} = await serverAuthenticatedContractCall(
                "liquidate_cdp",
                { lender },
                liquidityPoolId
              );
              console.log(
                `Successfully liquidated CDP for lender: ${lender}. Result: ${result}`
              );
              const cdpStatus = result.value[2];
              console.log(`CDP status after liquidation: ${cdpStatus}`);
              if(cdpStatus === CDPStatus.Closed){
                serverCDP!.status = CDPStatus.Closed;
                await cdpRepository.save(serverCDP!);
              }
            }
            else{
              console.log("No XLM in the pool for liquidation, skipping");
            }

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

  // Run the job immediately on startup
  updateCDPs();
}
