import { Router } from "express";
import { SingletonController } from "../controllers/singletonController";
import { apiLimiter } from "../middleware/rateLimiter";

const router = Router();

async function initializeRoutes() {
  const singletonController = await SingletonController.create();

  router.get("/:asset_symbol", apiLimiter, singletonController.getAllSingletons.bind(singletonController));
  router.get("/:asset_symbol/:key", apiLimiter, singletonController.getSingletonByKey.bind(singletonController));

  return router;
}

export default initializeRoutes;
