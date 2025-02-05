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
  minimumCollateralizationRatio = minimumCollateralizationRatio / 1e4;

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
    console.log(`info for cdp: ${cdp.lender}`);
    console.log(`debt value is ${debtValue}, collateral value is ${collateralValue}`);
    console.log(`current ratio is ${currentRatio}`);
    console.log(`minimum collateralization ratio is ${minimumCollateralizationRatio}`);

    if (currentRatio.isLessThan(minimumCollateralizationRatio)) {
      console.log(
        `CDP ${
          cdp.lender
        } is undercollateralized. Current ratio: ${currentRatio.toString()}, Minimum required: ${minimumCollateralizationRatio}`
      );

      try {
        const result = await serverAuthenticatedContractCall(
          "freeze_cdp",
          { lender: cdp.lender },
          liquidityPool.pool_address
        );
        console.log(
          `Successfully frozen CDP for lender: ${cdp.lender}. Result: ${result}`
        );

        // Update CDP status in database
        cdp.status = CDPStatus.Frozen;
        await cdpRepository.save(cdp);
      } catch (error) {
        console.error(`Error freezing CDP for lender ${cdp.lender}:`, error);
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
          const oldAssetPrice = new BigNumber(asset.price);
          const oldXlmPrice = new BigNumber(asset.last_xlm_price || xlmPrice);
          const oldPriceRatio = oldAssetPrice.dividedBy(oldXlmPrice);
          const newPriceRatio = priceValue.dividedBy(xlmPrice);
          asset.price = priceValue.toString();
          asset.last_xlm_price = xlmPrice.toString();
          await assetService.update(asset.id, asset);

          // Check if price ratio has increased
          console.log(`XLM price is ${xlmPrice}, price is ${priceValue}`);
          if (xlmPrice) {
            if (newPriceRatio.isGreaterThan(oldPriceRatio)) {
              console.log(`New price ratio is ${newPriceRatio} which is greater than ${oldPriceRatio} so checking for CDPs that need to be liquidated.`);
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
        else{
          console.log(`Could not find asset for ${assetSymbol}`);
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