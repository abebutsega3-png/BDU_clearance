import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getClearanceHistory, recordClearanceAction } from '../controllers/ictClearanceHistoryController.js';

const router = express.Router();

router.get('/', authMiddleware, getClearanceHistory);
router.get('/record/:id', authMiddleware, recordClearanceAction);

export default router;