import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  getRegistrarDashboardData,
  getRegistrarRequests,
  verifyRegistrarRequest,
  rejectRegistrarRequest,
  returnRegistrarRequest,
  commentRegistrarRequest,
} from '../controllers/registrarController.js';

const router = express.Router();

router.get('/dashboard', authMiddleware, getRegistrarDashboardData);
router.get('/requests', authMiddleware, getRegistrarRequests);
router.post('/requests/:id/verify', authMiddleware, verifyRegistrarRequest);
router.post('/requests/:id/reject', authMiddleware, rejectRegistrarRequest);
router.post('/requests/:id/return', authMiddleware, returnRegistrarRequest);
router.post('/requests/:id/comment', authMiddleware, commentRegistrarRequest);

export default router;