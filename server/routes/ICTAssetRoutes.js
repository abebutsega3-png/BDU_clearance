import express from 'express';
import {
  getAllAssets,
  registerAsset,
  assignAsset,
  returnAsset,
  getOutstandingAssets
} from '../controllers/ictAssetController.js';

const router = express.Router();

// 1. Specific routes first
router.get('/outstanding', getOutstandingAssets);

// 2. Base routes
router.get('/', getAllAssets);
router.post('/register', registerAsset);
router.post('/assign', assignAsset);
router.post('/return', returnAsset);

export default router;