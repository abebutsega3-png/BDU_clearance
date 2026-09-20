import express from 'express';
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
router.patch('/requests/:id/start-review', startFinanceReview);
router.patch('/requests/:id/approve', approveFinanceClearance);
router.patch('/requests/:id/return', returnFinanceRequest);

export default router;
