import express from 'express';
import { getDashboardData, startReview } from '../controllers/propertyDashboardController.js';
import {
  createPropertyAsset,
  getPropertyAssetRecords,
  getPropertyAssetById,
  returnPropertyAssetToStore,
  updatePropertyAsset
} from '../controllers/propertyassestcontroller.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/dashboard', getDashboardData);
router.get('/assets', getPropertyAssetRecords);
router.get('/assets/:assetId', getPropertyAssetById);
router.post('/assets', authMiddleware, createPropertyAsset);
router.patch('/assets/:assetId', authMiddleware, updatePropertyAsset);
router.patch('/assets/:assetId/return-to-store', authMiddleware, returnPropertyAssetToStore);
router.patch('/requests/:requestId/start-review', startReview);

export default router;