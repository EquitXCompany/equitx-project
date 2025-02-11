import { Router } from "express";
import { TVLMetricsController } from "../controllers/tvlMetricsController";
import { apiLimiter } from "../middleware/rateLimiter";

const router = Router();

async function initializeRoutes() {
  const tvlMetricsController = await TVLMetricsController.create();

  router.get(
    "/:asset_symbol/latest",
    apiLimiter,
    tvlMetricsController.getLatestTVLByAsset.bind(tvlMetricsController)
  );

  router.get(
    "/:asset_symbol/history",
    apiLimiter,
    tvlMetricsController.getTVLHistoryByAsset.bind(tvlMetricsController)
  );

  return router;
}

export default initializeRoutes;
