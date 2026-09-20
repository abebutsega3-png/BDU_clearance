import express from 'express';
import { 
  getICTNotifications, 
  markAsRead, 
  markAllAsRead 
} from '../controllers/ictNotificationController.js';

const router = express.Router();

router.get('/', getICTNotifications);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);

export default router;