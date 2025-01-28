import cron from "node-cron";
import BigNumber from "bignumber.js";
import { AppDataSource } from "../ormconfig";
import { AssetService } from "../services/assetService";
import { PriceHistoryService } from "../services/priceHistoryService";
import { LiquidityPoolService } from "../services/liquidityPoolService";
import { assetConfig } from "../config/AssetConfig";
import {
  getLatestPriceData,
  serverAuthenticatedContractCall,
} from "../utils/serverContractHelpers";
import { PriceHistory } from "../entity/PriceHistory";
import { CDP, CDPStatus } from "../entity/CDP";
import { Asset } from "entity/Asset";

async function checkAndFreezeCDPs(
  asset: Asset,
  xlmPrice: BigNumber,
  assetPrice: BigNumber,
  minimumCollateralizationRatio: number
) {
  const cdpRepository = AppDataSource.getRepository(CDP);
  const liquidityPoolService = await LiquidityPoolService.create();
  const liquidityPool = await liquidityPoolService.findOne(asset.symbol);

  if (!liquidityPool) {
    throw new Error(`No liquidity pool found for ${asset}`);
  }

  const cdps = await cdpRepository.find({
    where: { asset: { id: asset.id }, status: CDPStatus.Open },
  });

  for (const cdp of cdps) {
    const collateralValue = new BigNumber(cdp.xlm_deposited).multipliedBy(
      xlmPrice
    );
    const debtValue = new BigNumber(cdp.asset_lent).multipliedBy(assetPrice);
    const currentRatio = collateralValue.dividedBy(debtValue);

    if (currentRatio.isLessThan(minimumCollateralizationRatio)) {
      console.log(
        `CDP ${
          cdp.address
        } is undercollateralized. Current ratio: ${currentRatio.toString()}, Minimum required: ${minimumCollateralizationRatio}`
      );

      try {
        const result = await serverAuthenticatedContractCall(
          "freeze_cdp",
          { lender: cdp.address },
          liquidityPool.pool_address
        );
        console.log(
          `Successfully frozen CDP for lender: ${cdp.address}. Result: ${result}`
        );

        // Update CDP status in database
        cdp.status = CDPStatus.Frozen;
        await cdpRepository.save(cdp);
      } catch (error) {
        console.error(`Error freezing CDP for lender ${cdp.address}:`, error);
      }
    }
  }
}

async function updatePrices() {
  try {
    const assetService = await AssetService.create();
    const priceHistoryService = await PriceHistoryService.create();
    const liquidityPoolService = await LiquidityPoolService.create();
    for (const [assetSymbol, assetDetails] of Object.entries(assetConfig)) {
      const liquidityPool = await liquidityPoolService.findOne(assetSymbol);
      if (!liquidityPool) {
        console.error(`No liquidity pool found for ${assetSymbol}`);
        continue;
      }

      try {
        // Query price from data feed contract
        const { price: xlmPrice } = await getLatestPriceData(
          "XLM",
          assetDetails.pool_address,
        );
        const { price: priceValue, timestamp } = await getLatestPriceData(
          assetSymbol,
          assetDetails.pool_address
        );
        if (!priceValue) {
          console.error(`No price data found for ${assetSymbol}`);
          continue;
        }
        priceHistoryService.insert(assetSymbol, priceValue, timestamp);

        // Update asset current price
        const asset = await assetService.findOne(assetSymbol);
        if (asset) {
          const oldPrice = new BigNumber(asset.price);
          asset.price = priceValue.toString();
          await assetService.update(asset.id, asset);

          // Check if price ratio has increased
          if (xlmPrice && assetSymbol !== "XLM") {
            const oldPriceRatio = oldPrice.dividedBy(xlmPrice);
            const newPriceRatio = priceValue.dividedBy(xlmPrice);

            if (newPriceRatio.isGreaterThan(oldPriceRatio)) {
              // freeze CDPs that have become insolvent
              await checkAndFreezeCDPs(
                asset,
                xlmPrice,
                priceValue,
                liquidityPool.minimum_collateralization_ratio
              );
            }
          }
        }
      } catch (error) {
        console.error(`Error updating price for ${assetSymbol}:`, error);
      }
    }
  } catch (error) {
    console.error("Error in updatePrices:", error);
  }
}

export async function startPriceUpdateJob() {
  console.log("Starting price update job");

  // Run the job every 5 minutes
  cron.schedule("*/5 * * * *", updatePrices);

  // Run immediately on startup
  updatePrices();
}
