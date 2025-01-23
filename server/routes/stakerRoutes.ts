import { Router } from "express";
import { StakerController } from "../controllers/stakerController";
import { apiLimiter } from "../middleware/rateLimiter";

const router = Router();
const stakerController = new StakerController();

router.get("/", apiLimiter, stakerController.getAllStakers.bind(stakerController));
router.get("/:asset_symbol/:addr", apiLimiter, stakerController.getStakerByAssetSymbolAndAddr.bind(stakerController));

export default router;