import { Router } from "express";
import { ContractStateController } from "../controllers/contractStateController";
import { apiLimiter } from "../middleware/rateLimiter";

const router = Router();

async function initializeRoutes() {
  const singletonController = await ContractStateController.create();

  router.get("/:asset_symbol", apiLimiter, singletonController.getAllSingletons.bind(singletonController));
  router.get("/:asset_symbol/:key", apiLimiter, singletonController.getSingletonByKey.bind(singletonController));

  return router;
}

export default initializeRoutes;
