import { AppDataSource } from "../ormconfig";
import { AssetService } from "../services/assetService";
import { LiquidityPoolService } from "../services/liquidityPoolService";
import { LastQueriedTimestamp } from "../entity/LastQueriedTimestamp";
import { AssetConfig } from "../config/AssetConfig";
import { Asset } from "../entity/Asset";
import { LiquidityPool } from "../entity/LiquidityPool";

export async function createAssetsIfNotExist(assetConfig: AssetConfig) {
  const assetService = await AssetService.create();
  const liquidityPoolService = await LiquidityPoolService.create();

  try {
    for (const [symbol, config] of Object.entries(assetConfig)) {
      let asset = await assetService.findOne(symbol);

      if (!asset) {
        // Create Asset
        asset = new Asset();
        asset.symbol = symbol;
        asset.feed_address = config.feed_address;
        asset = await assetService.insert(asset);
        // Create LiquidityPool
        const liquidityPool = new LiquidityPool();
        liquidityPool.asset = asset;
        liquidityPool.pool_address = config.pool_address;
        await liquidityPoolService.insert(liquidityPool);

        // Create LastQueriedTimestamp
        const lastQueriedTimestamp = new LastQueriedTimestamp();
        lastQueriedTimestamp.asset = asset;
        lastQueriedTimestamp.timestamp = 0; // Initial timestamp set to 0
        await AppDataSource.manager.save(lastQueriedTimestamp);

        console.log(`Created asset ${symbol} with associated tables`);
      } else {
        console.log(`Asset ${symbol} already exists, skipping`);
      }
    }
  } catch (error) {
    console.error("Error creating assets:", error);
  } finally {
    await AppDataSource.destroy();
  }
}
