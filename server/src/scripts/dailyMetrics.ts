import { TVLService } from "../services/tvlService";
import { UtilizationMetricsService } from "../services/utilizationMetricsService";
import { UserMetricsService } from "../services/userMetricsService";
import { CDPService } from "../services/cdpService";
import { CDPMetricsService } from "../services/cdpMetricsService";
import { AssetService } from "../services/assetService";
import { ProtocolStatsService } from "../services/protocolStatsService";

async function calculateTVLMetrics() {
  const tvlService = await TVLService.create();
  await tvlService.calculateTVLMetricsForAllAssets();
}

async function calculateUtilizationMetrics() {
  const utilizationMetricsService = await UtilizationMetricsService.create();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await utilizationMetricsService.calculateMetricsForAllAssets(yesterday);
}

async function calculateActiveUserMetrics() {
  const userMetricsService = await UserMetricsService.create();
  const cdpService = await CDPService.create();

  const activeAddresses = await cdpService.getActiveAddresses(30);

  for (const address of activeAddresses) {
    try {
      await userMetricsService.updateForUser(address);
    } catch (error) {
      console.error(`Error updating metrics for user ${address}:`, error);
    }
  }
}

export async function calculateCDPMetrics() {
  const cdpMetricsService = await CDPMetricsService.create();
  const assetService = await AssetService.create();

  const assets = await assetService.findAllWithPools()
  // For assets with liquidity pools (will filter out the special XLM asset)
  assets.filter(asset => asset.liquidityPool != null).forEach(async asset => {
    try {
      await cdpMetricsService.updateForAsset(asset);
    } catch (error) {
      console.error(
        `Error updating CDP metrics for asset ${asset.symbol}:`,
        error
      );
    }
  });
}

async function calculateProtocolStats() {
  const protocolStatsService = await ProtocolStatsService.create();
  try {
    await protocolStatsService.updateStats();
    console.log("Protocol stats updated successfully");
  } catch (error) {
    console.error("Error updating protocol stats:", error);
  }
}

export async function runDailyMetrics() {
  try {
    await calculateTVLMetrics();
    await calculateUtilizationMetrics();
    await calculateActiveUserMetrics();
    await calculateCDPMetrics();
    await calculateProtocolStats();
    console.log("Daily metrics calculation completed successfully");
  } catch (error) {
    console.error("Error calculating daily metrics:", error);
  }
}
