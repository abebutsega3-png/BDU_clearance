import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  getIctClearanceRequests,
  processIctClearanceRequest,
} from '../controllers/ictClearanceController.js';

const router = express.Router();

router.get('/clearance-requests', authMiddleware, getIctClearanceRequests);
router.put('/clearance-requests/:id/process', authMiddleware, processIctClearanceRequest);

export default router;