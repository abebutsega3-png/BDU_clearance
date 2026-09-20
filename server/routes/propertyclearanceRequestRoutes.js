import express from 'express';
import {
  getAllRequests,
  getRequestById,
  startReview,
  approveClearance,
  returnRequest
} from '../controllers/propertyclearanceRequestController.js';

const router = express.Router();

router.get('/requests', getAllRequests);
router.get('/requests/:requestId', getRequestById);
router.patch('/requests/:requestId/start-review', startReview);
router.patch('/requests/:requestId/approve', approveClearance);
router.patch('/requests/:requestId/return', returnRequest);

export default router;