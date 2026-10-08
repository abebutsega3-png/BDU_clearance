import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  createSeparationType,
  deleteSeparationType,
  getAllSeparationTypes,
  toggleStatus,
  updateSeparationType,
} from '../controllers/HRseparationTypeController.js';

const router = express.Router();

router.get('/', authMiddleware, getAllSeparationTypes);
router.post('/', authMiddleware, createSeparationType);
router.put('/:id', authMiddleware, updateSeparationType);
router.patch('/:id/toggle-status', authMiddleware, toggleStatus);
router.delete('/:id', authMiddleware, deleteSeparationType);

export default router;