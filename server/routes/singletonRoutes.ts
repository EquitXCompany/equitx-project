import { Router } from "express";
import { SingletonController } from "../controllers/singletonController";
import { apiLimiter } from "../middleware/rateLimiter";

const router = Router();
const singletonController = new SingletonController();

router.get("/", apiLimiter, singletonController.getAllSingletons.bind(singletonController));
router.get("/:key", apiLimiter, singletonController.getSingletonByKey.bind(singletonController));

export default router;