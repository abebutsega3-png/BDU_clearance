import express from 'express';
import { getICTReports } from '../controllers/ictReportController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/reports', authMiddleware, getICTReports);

export default router;