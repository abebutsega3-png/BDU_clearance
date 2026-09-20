import express from 'express';
import {
  getAllNotifications,
  createNotification,
  markAllAsRead,
  markAsRead,
  getUnreadSummary,
  deleteNotification
} from '../controllers/notificationcontroller.js';
import authMiddleware from '../middleware/authMiddleware.js';
const router = express.Router();

router.route('/')
  .get(authMiddleware, getAllNotifications)
  .post(createNotification);

router.get('/my', authMiddleware, getAllNotifications);
router.get('/summary', getUnreadSummary);
router.patch('/mark-all-read', authMiddleware, markAllAsRead);

router.route('/:id')
  .patch(authMiddleware, markAsRead)
  .delete(authMiddleware, deleteNotification);

export default router;