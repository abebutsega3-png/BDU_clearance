import express from 'express';
import financeNotificationController from '../controllers/financenotificationController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, financeNotificationController.getMyNotifications);
router.patch('/:id/read', authMiddleware, financeNotificationController.markAsRead);
router.patch('/read-all', authMiddleware, financeNotificationController.markAllAsRead);
router.delete('/:id', authMiddleware, financeNotificationController.deleteNotification);

export default router;