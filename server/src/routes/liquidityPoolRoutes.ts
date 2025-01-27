import { Router } from "express";
import { LiquidityPoolController } from "../controllers/liquidityPoolController";
import { apiLimiter } from "../middleware/rateLimiter";

const router = Router();

async function initializeRoutes() {
  const liquidityPoolController = await LiquidityPoolController.create();

  router.get("/", apiLimiter, liquidityPoolController.getAllLiquidityPools.bind(liquidityPoolController));
  router.get("/:asset_symbol", apiLimiter, liquidityPoolController.getLiquidityPoolByAssetSymbol.bind(liquidityPoolController));

  return router;
}

export default initializeRoutes;
