import { Router } from "express";
import { CDPController } from "../controllers/cdpController";
import { apiLimiter } from "../middleware/rateLimiter";

const router = Router();
const cdpController = new CDPController();

router.get("/", apiLimiter, cdpController.getAllCDPs.bind(cdpController));
router.get("/:asset_symbol/:addr", apiLimiter, cdpController.getCDPByAssetSymbolAndAddr.bind(cdpController));

export default router;