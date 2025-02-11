import { Router } from "express";
import { CDPMetricsController } from "../controllers/cdpMetricsController";
import { apiLimiter } from "../middleware/rateLimiter";

const router = Router();

async function initializeRoutes() {
  const cdpMetricsController = await CDPMetricsController.create();

  router.get(
    "/:asset_symbol/latest",
    apiLimiter,
    cdpMetricsController.getLatestMetricsByAsset.bind(cdpMetricsController)
  );

  router.get(
    "/:asset_symbol/history",
    apiLimiter,
    cdpMetricsController.getMetricsHistory.bind(cdpMetricsController)
  );

  return router;
}

export default initializeRoutes;
