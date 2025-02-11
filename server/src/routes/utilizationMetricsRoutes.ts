import { Router } from "express";
import { UtilizationMetricsController } from "../controllers/utilizationMetricsController";
import { apiLimiter } from "../middleware/rateLimiter";

const router = Router();

async function initializeRoutes() {
  const utilizationMetricsController = await UtilizationMetricsController.create();

  router.get(
    "/:asset_symbol/latest",
    apiLimiter,
    utilizationMetricsController.getLatestUtilizationByAsset.bind(utilizationMetricsController)
  );

  router.get(
    "/:asset_symbol/history",
    apiLimiter,
    utilizationMetricsController.getUtilizationHistoryByAsset.bind(utilizationMetricsController)
  );

  return router;
}

export default initializeRoutes;
