import { Router } from "express";
import { UserMetricsController } from "../controllers/userMetricsController";
import { apiLimiter } from "../middleware/rateLimiter";

const router = Router();

async function initializeRoutes() {
  const userMetricsController = await UserMetricsController.create();

  router.get(
    "/:address",
    apiLimiter,
    userMetricsController.getUserMetrics.bind(userMetricsController)
  );

  router.get(
    "/:address/history",
    apiLimiter,
    userMetricsController.getUserMetricsHistory.bind(userMetricsController)
  );

  return router;
}

export default initializeRoutes;
