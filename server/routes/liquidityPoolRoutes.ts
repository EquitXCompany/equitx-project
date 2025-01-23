import { Router } from "express";
import { LiquidityPoolController } from "../controllers/liquidityPoolController";
import { apiLimiter } from "../middleware/rateLimiter";

const router = Router();
const liquidityPoolController = new LiquidityPoolController();

router.get("/", apiLimiter, liquidityPoolController.getAllLiquidityPools.bind(liquidityPoolController));
router.get("/:asset_symbol", apiLimiter, liquidityPoolController.getLiquidityPoolByAssetSymbol.bind(liquidityPoolController));

export default router;