import { Router } from "express";
import { LiquidationController } from "../controllers/liquidationController";
import { apiLimiter } from "../middleware/rateLimiter";

const router = Router();

async function initializeRoutes() {
  const liquidationController = await LiquidationController.create();

  router.get(
    "/",
    apiLimiter,
    liquidationController.getAllLiquidations.bind(liquidationController)
  );

  router.get(
    "/asset/:asset_symbol",
    apiLimiter,
    liquidationController.getLiquidationsByAsset.bind(liquidationController)
  );

  router.get(
    "/cdp/:cdp_id",
    apiLimiter,
    liquidationController.getLiquidationsByCDP.bind(liquidationController)
  );

  return router;
}

export default initializeRoutes;
