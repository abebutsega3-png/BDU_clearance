import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { createClearanceStep, getClearanceSteps } from '../controllers/clearanceStepController.js';

const router = express.Router();

router.get('/', authMiddleware, getClearanceSteps);
router.post('/', authMiddleware, createClearanceStep);

export default router;