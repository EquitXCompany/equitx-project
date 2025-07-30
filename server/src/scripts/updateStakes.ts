import cron from "node-cron";
import { Staker } from "../entity/Staker";
import dotenv from "dotenv";
import { AssetService } from "../services/assetService";
import { StakerService } from "../services/stakerService";
import { LastQueriedTimestampService } from "../services/lastQueriedTimestampService";
import { TableType } from "../entity/LastQueriedTimestamp";
import { StakerHistoryService } from "../services/stakerHistoryService";
import { StakerHistoryAction } from "../entity/StakerHistory";
import BigNumber from "bignumber.js";
import { StakePositionEventService } from "../services/stakePositionEventService";
import { StakePositionEvent } from "../entity/StakePositionEvent";

dotenv.config();

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
  stakeEvents: StakePositionEvent[],
  assetSymbol: string
): Promise<void> {
  const stakerService = await StakerService.create();
  const stakerHistoryService = await StakerHistoryService.create();
  const assetService = await AssetService.create();
  const asset = await assetService.findOne(assetSymbol);

  if (!asset) {
    throw new Error(`Asset ${assetSymbol} not found`);
  }

  for (const stakeEvent of stakeEvents) {
    console.log(`processing stake event at timestamp ${stakeEvent.timestamp}`);
    const oldStaker = await stakerService.findOne(
      assetSymbol,
      stakeEvent.address
    );
    const newStaker = await stakerService.upsert(
      assetSymbol,
      stakeEvent.address,
      {
        address: stakeEvent.address,
        xasset_deposit: stakeEvent.xasset_deposit,
        product_constant: stakeEvent.product_constant,
        compounded_constant: stakeEvent.compounded_constant,
        total_rewards_claimed: BigNumber(oldStaker?.total_rewards_claimed ?? 0)
          .plus(BigNumber(stakeEvent.rewards_claimed))
          .toString(),
        epoch: stakeEvent.epoch,
        asset,
        updated_at: new Date(Number(stakeEvent.timestamp * 1000)),
        created_at: oldStaker
          ? oldStaker.created_at
          : new Date(Number(stakeEvent.timestamp * 1000)),
      }
    );

    const action = await determineStakeAction(
      oldStaker,
      newStaker,
      stakeEvent.rewards_claimed
    );
    await stakerHistoryService.createHistoryEntry(
      newStaker.id,
      newStaker,
      action,
      oldStaker,
      stakeEvent.rewards_claimed
    );
  }
}

async function getLastQueriedTimestamp(): Promise<number> {
  const timestampService = await LastQueriedTimestampService.create();
  return timestampService.getTimestamp(TableType.STAKE);
}

async function updateLastQueriedTimestamp(timestamp: number): Promise<void> {
  const timestampService = await LastQueriedTimestampService.create();
  await timestampService.updateTimestamp(TableType.STAKE, timestamp);
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

async function updateStakes() {
  const assetService = await AssetService.create();
  const stakePositionEventService = await StakePositionEventService.create();

  try {
    const contractMapping = await getPoolSymbolMapping(assetService);

    const lastTimestamp = await getLastQueriedTimestamp();
    console.log(
      `Querying stakes from local events with timestamp ${lastTimestamp}`
    );

    const stakeEvents =
      await stakePositionEventService.findEventsAfterTimestamp(lastTimestamp);

    // Group events by asset symbol based on contract_id
    const eventsByAsset = new Map<string, StakePositionEvent[]>();
    for (const stakeEvent of stakeEvents) {
      const assetSymbol = contractMapping.get(stakeEvent.contract_id);
      if (!assetSymbol) {
        console.warn(
          `No asset found for contract ID ${stakeEvent.contract_id}`
        );
        continue;
      }

      if (!eventsByAsset.has(assetSymbol)) {
        eventsByAsset.set(assetSymbol, []);
      }
      eventsByAsset.get(assetSymbol)!.push(stakeEvent);
    }

    // Process events for each asset
    for (const [assetSymbol, events] of eventsByAsset) {
      await updateStakesInDatabase(events, assetSymbol);
    }

    if (stakeEvents.length > 0) {
      const newLastTimestamp = Math.max(
        ...stakeEvents.map((event) => Number(event.timestamp))
      );
      await updateLastQueriedTimestamp(newLastTimestamp);
      console.log(`Updated last queried timestamp with ${newLastTimestamp}`);
    }

    console.log(`Updated ${stakeEvents.length} stakes`);
  } catch (error) {
    console.error("Error updating stakes:", error);
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
