import { Router } from "express";
import { StakerController } from "../controllers/stakerController";
import { apiLimiter } from "../middleware/rateLimiter";

const router = Router();

async function initializeRoutes() {
  const stakerController = await StakerController.create();

  router.get("/", apiLimiter, stakerController.getAllStakers.bind(stakerController));
  router.get("/asset/:asset_symbol/address/:address", apiLimiter, stakerController.getStakerByAssetSymbolAndAddr.bind(stakerController));
  router.get("/address/:address", apiLimiter, stakerController.getStakersByAddress.bind(stakerController));

  return router;
}

export default initializeRoutes;
