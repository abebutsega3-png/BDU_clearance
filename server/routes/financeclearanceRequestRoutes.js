import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  getFinanceRequests,
  getFinanceRequestById,
  startFinanceReview,
  approveFinanceClearance,
  returnFinanceRequest,
} from '../controllers/financeclearancerequestController.js';

const router = express.Router();

router.get('/requests', getFinanceRequests);
router.get('/requests/:id', getFinanceRequestById);
router.patch('/requests/:id/start-review', authMiddleware, startFinanceReview);
router.patch('/requests/:id/approve', authMiddleware, approveFinanceClearance);
router.patch('/requests/:id/return', authMiddleware, returnFinanceRequest);

export default router;
