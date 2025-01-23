import { Router } from "express";
import { PricefeedController } from "../controllers/pricefeedController";
import { apiLimiter } from "../middleware/rateLimiter";

const router = Router();
const pricefeedController = new PricefeedController();

router.get("/", apiLimiter, pricefeedController.getAllPricefeeds.bind(pricefeedController));
router.get("/:asset_symbol", apiLimiter, pricefeedController.getPricefeedByAssetSymbol.bind(pricefeedController));

export default router;