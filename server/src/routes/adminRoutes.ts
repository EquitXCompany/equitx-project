import express from 'express';
import { deployAsset } from '../controllers/adminController';
import { authenticateAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// Apply admin authentication middleware to all admin routes
router.use(authenticateAdmin);

// Admin routes
router.post('/deploy', deployAsset);

export default router;
