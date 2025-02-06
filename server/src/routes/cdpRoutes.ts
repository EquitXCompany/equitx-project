import { Router } from "express";
import { CDPController } from "../controllers/cdpController";
import { apiLimiter } from "../middleware/rateLimiter";

const router = Router();

async function initializeRoutes() {
  const cdpController = await CDPController.create();

  router.get("/", apiLimiter, cdpController.getAllCDPs.bind(cdpController));
  router.get("/:asset_symbol/lender/:lender", apiLimiter, cdpController.getCDPByAssetSymbolAndAddr.bind(cdpController));
  router.get("/:asset_symbol", apiLimiter, cdpController.getAllCDPsByAssetSymbol.bind(cdpController)); // New route

  return router;
}

export default initializeRoutes;