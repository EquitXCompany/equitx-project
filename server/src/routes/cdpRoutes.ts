import { Router } from "express";
import { CDPController } from "../controllers/cdpController";
import { apiLimiter } from "../middleware/rateLimiter";

const router = Router();

async function initializeRoutes() {
  const cdpController = await CDPController.create();

  router.get("/", apiLimiter, cdpController.getAllCDPs.bind(cdpController));
  router.get("/:asset_symbol/:address", apiLimiter, cdpController.getCDPByAssetSymbolAndAddr.bind(cdpController));

  return router;
}

export default initializeRoutes;