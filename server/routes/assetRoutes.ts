import { Router } from "express";
import { AssetController } from "../controllers/assetController";
import { apiLimiter } from "../middleware/rateLimiter";

const router = Router();
const assetController = new AssetController();

router.get("/", apiLimiter, assetController.getAllAssets.bind(assetController));
router.get("/:symbol", apiLimiter, assetController.getAssetBySymbol.bind(assetController));

export default router;