import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  getAssessmentQueue,
  getRequestDetails,
  saveAssessmentDraft,
} from '../controllers/hrAssessmentController.js';

const router = express.Router();

router.get('/queue', authMiddleware, getAssessmentQueue);
router.get('/:id', authMiddleware, getRequestDetails);
router.put('/:id/draft', authMiddleware, saveAssessmentDraft);

export default router;
