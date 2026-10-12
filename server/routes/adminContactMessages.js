import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  getAdminContactMessage,
  replyToAdminContactMessage,
} from '../controllers/contactController.js';

const router = express.Router();

router.get('/:id', authMiddleware, getAdminContactMessage);
router.put('/:id/reply', authMiddleware, replyToAdminContactMessage);

export default router;
