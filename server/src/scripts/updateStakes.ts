import cron from "node-cron";
import { Staker } from "../entity/Staker";
import dotenv from "dotenv";
import axios from "axios";
import { assetConfig } from "../config/AssetConfig";
import { AssetService } from "../services/assetService";
import { StakerService } from "../services/stakerService";
import { LastQueriedTimestampService } from "../services/lastQueriedTimestampService";
import { TableType } from "../entity/LastQueriedTimestamp";

dotenv.config();

const apiClient = axios.create({
  baseURL: "https://api.mercurydata.app",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.RETROSHADE_API_TOKEN}`,
  },
});

interface RetroShadeStake {
  id: string;
  contract_id: string;
  xasset_deposit: string;
  product_constant: string;
  compounded_constant: string;
  epoch: string;
  timestamp: number;
}

async function fetchStakes(
  tableName: string,
  lastQueriedTimestamp: number
): Promise<RetroShadeStake[]> {
  try {
    const { data } = await apiClient.post("/retroshadesv1", {
      query: `SELECT * FROM ${tableName} WHERE timestamp > ${lastQueriedTimestamp} ORDER BY timestamp DESC`,
    });
    const latestEntries = new Map<string, RetroShadeStake>();
    data.forEach((item: RetroShadeStake) => {
      if (
        !latestEntries.has(item.id) ||
        item.timestamp > latestEntries.get(item.id)!.timestamp
      ) {
        latestEntries.set(item.id, item);
      }
    });

    return Array.from(latestEntries.values());
  } catch (error) {
    console.error("Error fetching stakes:", error);
    throw error;
  }
}

async function updateStakesInDatabase(
  stakes: RetroShadeStake[],
  assetSymbol: string
): Promise<void> {
  const stakerService = await StakerService.create();
  const assetService = await AssetService.create();
  const asset = await assetService.findOne(assetSymbol);

  if (!asset) {
    throw new Error(`Asset ${assetSymbol} not found`);
  }

  for (const stake of stakes) {
    await stakerService.upsert(assetSymbol, stake.id, {
      address: stake.id,
      xasset_deposit: stake.xasset_deposit,
      product_constant: stake.product_constant,
      compounded_constant: stake.compounded_constant,
      epoch: stake.epoch,
      asset,
    });
  }
}

async function getLastQueriedTimestamp(assetSymbol: string): Promise<number> {
  const timestampService = await LastQueriedTimestampService.create();
  return timestampService.getTimestamp(assetSymbol, TableType.STAKE);
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

  await timestampService.updateTimestamp(asset, TableType.STAKE, timestamp);
}

async function updateStakes() {
  try {
    for (const [assetSymbol, assetDetails] of Object.entries(assetConfig)) {
      const lastTimestamp = await getLastQueriedTimestamp(assetSymbol);
      console.log(
        `Querying stakes from reflector with timestamp ${lastTimestamp}`
      );
      const stakes = await fetchStakes(
        assetDetails.retroshades_stake,
        lastTimestamp
      );
      await updateStakesInDatabase(stakes, assetSymbol);

      if (stakes.length > 0) {
        const newLastTimestamp = Math.max(
          ...stakes.map((stake) => stake.timestamp)
        );
        await updateLastQueriedTimestamp(assetSymbol, newLastTimestamp);
        console.log(
          `Updated last queried timestamp for ${assetSymbol} with ${newLastTimestamp}`
        );
      }

      console.log(`Updated ${stakes.length} stakes for ${assetSymbol}`);
    }
  } catch (error) {
    console.error("Error updating stakes:", error);
  }
}

export async function startStakeUpdateJob() {
  console.log("Database connection established for stake update job");

  // Run the job every 5 minutes
  cron.schedule("*/5 * * * *", updateStakes);

  // Run the job immediately on startup
  updateStakes();
}
