import express from 'express';
import { getDashboardData, startReview } from '../controllers/propertyDashboardController.js';
import { getPropertyAssetRecords, getPropertyAssetById } from '../controllers/propertyassestcontroller.js';

const router = express.Router();

router.get('/dashboard', getDashboardData);
router.get('/assets', getPropertyAssetRecords);
router.get('/assets/:assetId', getPropertyAssetById);
router.patch('/requests/:requestId/start-review', startReview);

export default router;