import { AppDataSource } from "../ormconfig";
import { AssetService } from "../services/assetService";
import { LiquidityPoolService } from "../services/liquidityPoolService";
import { AssetConfig, XLM_FEED_ADDRESS } from "../config/AssetConfig";
import { Asset } from "../entity/Asset";
import { LiquidityPool } from "../entity/LiquidityPool";
import { getLatestPriceData, getMinimumCollateralizationRatio } from "../utils/serverContractHelpers";

export async function createAssetsIfNotExist(assetConfig: AssetConfig) {
  const assetService = await AssetService.create();
  const liquidityPoolService = await LiquidityPoolService.create();

  try {
    for (const [symbol, config] of Object.entries(assetConfig)) {
      let asset = await assetService.findOne(symbol);

      if (!asset) {
        const { price } = await getLatestPriceData(
          symbol,
          config.pool_address
        );
        const { price: xlmPrice } = await getLatestPriceData(
          "XLM",
          config.pool_address
        );
        const minRatio = await getMinimumCollateralizationRatio(config.pool_address);
        // Create Asset
        asset = new Asset();
        asset.symbol = symbol;
        asset.feed_address = config.feed_address;
        asset.price = price.toString();
        asset.last_xlm_price= xlmPrice.toString();
        asset = await assetService.insert(asset);
        // Create LiquidityPool
        const liquidityPool = new LiquidityPool();
        liquidityPool.asset = asset;
        liquidityPool.pool_address = config.pool_address;
        liquidityPool.minimum_collateralization_ratio = minRatio;
        await liquidityPoolService.insert(liquidityPool);

        console.log(`Created asset ${symbol} with associated tables`);
      } else {
        console.log(`Asset ${symbol} already exists in database, skipping`);
      }
    }
    //create special XLM asset for tracking XLM price
    let asset = await assetService.findOne("XLM");
    if(!asset){
      asset = new Asset();
      const { price: xlmPrice } = await getLatestPriceData(
        "XLM",
        assetConfig.xBTC.pool_address
      );
      asset.symbol = "XLM";
      asset.feed_address = XLM_FEED_ADDRESS;
      asset.price = xlmPrice.toString();
      asset.last_xlm_price= xlmPrice.toString();
      asset = await assetService.insert(asset);
      console.log(`Created asset special XLM asset`);
    }
  } catch (error) {
    console.error("Error creating assets:", error);
  } finally {
    await AppDataSource.destroy();
  }
}
