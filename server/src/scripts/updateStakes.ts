import cron from "node-cron";
import { Staker } from "../entity/Staker";
import dotenv from "dotenv";
import axios, { AxiosError } from "axios";
import { AssetService } from "../services/assetService";
import { StakerService } from "../services/stakerService";
import { LastQueriedTimestampService } from "../services/lastQueriedTimestampService";
import { TableType } from "../entity/LastQueriedTimestamp";
import { X_WASM_HASH } from "../config/constants";

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
  rewards_claimed: string;
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
    const axiosError = error as AxiosError;
    const errorMessage = axiosError.response
      ? `Error fetching stakes: ${axiosError.response.status} - ${axiosError.response.statusText} - - ${axiosError.response.data}`
      : `Error fetching stakes ${axiosError.message || 'Unknown error'}`;
    console.error(errorMessage);
    return [];
  }
}
import { StakerHistoryService } from "../services/stakerHistoryService";
import { StakerHistoryAction } from "../entity/StakerHistory";
import BigNumber from "bignumber.js";

async function determineStakeAction(
  oldStaker: Staker | null,
  newStaker: Staker,
  rewardsClaimed: string
): Promise<StakerHistoryAction> {
  if (!oldStaker) return StakerHistoryAction.STAKE;

  // Check if rewards were claimed in this transaction
  if (new BigNumber(rewardsClaimed).isGreaterThan(0)) {
    return StakerHistoryAction.CLAIM_REWARDS;
  }

  // If xasset_deposit is 0, it's an unstake (complete withdrawal)
  if (new BigNumber(newStaker.xasset_deposit).isZero()) {
    return StakerHistoryAction.UNSTAKE;
  }

  const oldDeposit = new BigNumber(oldStaker.xasset_deposit);
  const newDeposit = new BigNumber(newStaker.xasset_deposit);

  // Compare deposits to determine if it's a deposit or withdrawal
  if (newDeposit.isGreaterThan(oldDeposit)) {
    return StakerHistoryAction.DEPOSIT;
  } else if (newDeposit.isLessThan(oldDeposit)) {
    return StakerHistoryAction.WITHDRAW;
  }

  return StakerHistoryAction.STAKE; // fallback
}

async function updateStakesInDatabase(
  stakes: RetroShadeStake[],
  assetSymbol: string
): Promise<void> {
  const stakerService = await StakerService.create();
  const stakerHistoryService = await StakerHistoryService.create();
  const assetService = await AssetService.create();
  const asset = await assetService.findOne(assetSymbol);

  if (!asset) {
    throw new Error(`Asset ${assetSymbol} not found`);
  }

  for (const stake of stakes) {
    const oldStaker = await stakerService.findOne(assetSymbol, stake.id);
    const newStaker = await stakerService.upsert(assetSymbol, stake.id, {
      address: stake.id,
      xasset_deposit: stake.xasset_deposit,
      product_constant: stake.product_constant,
      compounded_constant: stake.compounded_constant,
      total_rewards_claimed:
        (oldStaker?.total_rewards_claimed ?? 0) + stake.rewards_claimed,
      epoch: stake.epoch,
      asset,
      updated_at: new Date(stake.timestamp * 1000),
      created_at: oldStaker ? oldStaker.created_at : new Date(stake.timestamp * 1000),
    });

    const action = await determineStakeAction(oldStaker, newStaker, stake.rewards_claimed);
    await stakerHistoryService.createHistoryEntry(
      newStaker.id,
      newStaker,
      action,
      oldStaker,
      stake.rewards_claimed
    );
  }
}

async function getLastQueriedTimestamp(wasmHash: string): Promise<number> {
  const timestampService = await LastQueriedTimestampService.create();
  return timestampService.getTimestamp(wasmHash, TableType.STAKE);
}

async function updateLastQueriedTimestamp(
  wasmHash: string,
  timestamp: number
): Promise<void> {
  const timestampService = await LastQueriedTimestampService.create();
  await timestampService.updateTimestamp(wasmHash, TableType.STAKE, timestamp);
}

async function getWasmHashToLiquidityPoolMapping(assetService: any): Promise<Map<string, Map<string, string>>> {
  const mapping = new Map<string, Map<string, string>>();
  mapping.set(X_WASM_HASH, new Map());
  const assets = await assetService.findAllWithPools();
  assets.forEach((asset: any) => {
    if (!asset.liquidityPool) {
      console.warn(`No pool address found for asset ${asset.symbol} in updateStakes`);
      return;
    }
    mapping.get(X_WASM_HASH)!.set(asset.liquidityPool.pool_address, asset.symbol);
  });

  return mapping;
}

async function updateStakes() {
  const assetService = await AssetService.create();
  try {
    const wasmHashMapping = await getWasmHashToLiquidityPoolMapping(assetService);

    for (const [wasmHash, contractMapping] of wasmHashMapping) {
      const lastTimestamp = await getLastQueriedTimestamp(wasmHash);
      console.log(
        `Querying stakes from reflector with timestamp ${lastTimestamp}`
      );

      const stakes = await fetchStakes(
        `stake_position${wasmHash}`,
        lastTimestamp
      );

      for (const stake of stakes) {
        const assetSymbol = contractMapping.get(stake.contract_id);
        if (!assetSymbol) {
          console.warn(`No asset found for contract ID ${stake.contract_id}`);
          continue;
        }

        await updateStakesInDatabase([stake], assetSymbol);
      }

      if (stakes.length > 0) {
        const newLastTimestamp = Math.max(
          ...stakes.map((stake) => stake.timestamp)
        );
        await updateLastQueriedTimestamp(wasmHash, newLastTimestamp);
        console.log(
          `Updated last queried timestamp for wasm hash ${wasmHash} with ${newLastTimestamp}`
        );
      }

      console.log(`Updated ${stakes.length} stakes for wasm hash ${wasmHash}`);
    }
  } catch (error) {
    const axiosError = error as AxiosError;
    const errorMessage = axiosError.response
      ? `Error updating stakes: ${axiosError.response.status} - ${axiosError.response.statusText} - - ${axiosError.response.data}`
      : `Error updating stakes ${axiosError.message || 'Unknown error'}`;
    console.error(errorMessage);
    throw error;
  }
}

export async function startStakeUpdateJob() {
  console.log("Database connection established for stake update job");

  // Run the job every 5 minutes
  cron.schedule("*/5 * * * *", updateStakes);

  // Run the job immediately on startup
  updateStakes();
}
