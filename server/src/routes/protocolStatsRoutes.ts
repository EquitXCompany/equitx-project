import { Router } from "express";
import { ProtocolStatsController } from "../controllers/protocolStatsController";
import { apiLimiter } from "../middleware/rateLimiter";

const router = Router();

async function initializeRoutes() {
  const protocolStatsController = await ProtocolStatsController.create();

  router.get(
    "/latest",
    apiLimiter,
    protocolStatsController.getLatestStats.bind(protocolStatsController)
  );

  router.get(
    "/history",
    apiLimiter,
    protocolStatsController.getStatsHistory.bind(protocolStatsController)
  );

  return router;
}

export default initializeRoutes;
