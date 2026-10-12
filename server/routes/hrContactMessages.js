import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  getHrContactMessages,
  markHrContactMessageRead,
  replyToContactMessage,
} from '../controllers/contactController.js';

const router = express.Router();

router.get('/', authMiddleware, getHrContactMessages);
router.patch('/:id/read', authMiddleware, markHrContactMessageRead);
router.put('/:id/reply', authMiddleware, replyToContactMessage);

export default router;
