import { Router } from "express";
import { PriceHistoryController } from "../controllers/priceHistoryController";
import { apiLimiter } from "../middleware/rateLimiter";

const router = Router();

async function initializeRoutes() {
  const priceHistoryController = await PriceHistoryController.create();

  router.get(
    "/:asset_symbol/:start_timestamp/:end_timestamp",
    apiLimiter,
    priceHistoryController.getPriceHistoryForAsset.bind(priceHistoryController)
  );

  router.get(
    "/latest/:asset_symbol",
    apiLimiter,
    priceHistoryController.getLatestPriceForAsset.bind(priceHistoryController)
  );

  return router;
}
export default initializeRoutes;
