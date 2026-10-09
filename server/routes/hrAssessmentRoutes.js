import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  getAssessmentQueue,
  getClearanceOffices,
  getRequestDetails,
  completeInitialHRAssessment,
  saveAssessmentDraft,
} from '../controllers/hrAssessmentController.js';

const router = express.Router();

router.get('/queue', authMiddleware, getAssessmentQueue);
router.get('/offices', authMiddleware, getClearanceOffices);
router.get('/:id', authMiddleware, getRequestDetails);
router.put('/:id/draft', authMiddleware, saveAssessmentDraft);
router.put('/:id/complete', authMiddleware, completeInitialHRAssessment);

export default router;
