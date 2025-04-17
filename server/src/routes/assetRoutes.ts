import { Router } from "express";
import { AssetController } from "../controllers/assetController";
import { apiLimiter } from "../middleware/rateLimiter";

const router = Router();

async function initializeRoutes() {
  const assetController = await AssetController.create();

  router.get(
    "/",
    apiLimiter,
    assetController.getAllAssets.bind(assetController)
  );
  router.get(
    "/mapping",
    apiLimiter,
    assetController.getAllAssetContracts.bind(assetController)
  );
  router.get(
    "/:symbol",
    apiLimiter,
    assetController.getAssetBySymbol.bind(assetController)
  );

  return router;
}

export default initializeRoutes;