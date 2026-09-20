import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getDashboardSummary, getRequests } from '../controllers/departmentclearanceController.js';

const router = express.Router();

router.get('/', authMiddleware, getRequests);
router.get('/summary', authMiddleware, getDashboardSummary);

export default router;