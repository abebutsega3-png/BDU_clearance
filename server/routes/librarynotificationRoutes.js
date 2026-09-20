import express from 'express';
import Notification from '../models/Notification.js';
import authMiddleware from '../middleware/authMiddleware.js';

const LIBRARY_NOTIFICATION_TYPES = new Set([
  'New Clearance Request',
  'CLEARANCE_READY_FOR_LIBRARY',
  'Clearance Awaiting Your Review',
  'Clearance Resubmitted',
  'Outstanding Library Material',
  'Outstanding Library Fine',
  'Library Action Required'
]);

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { filter } = req.query;
    const query = { recipientId: req.user._id, type: { $in: [...LIBRARY_NOTIFICATION_TYPES] } };

    if (filter === 'Unread') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query).sort({ createdAt: -1 }).lean();
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
});

router.patch('/mark-all-read', authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user._id, type: { $in: [...LIBRARY_NOTIFICATION_TYPES] }, isRead: false },
      { $set: { isRead: true } }
    );
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking all as read', error: error.message });
  }
});

router.delete('/clear-read', authMiddleware, async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      recipientId: req.user._id,
      type: { $in: [...LIBRARY_NOTIFICATION_TYPES] },
      isRead: true
    });
    res.status(200).json({
      message: 'Read notifications cleared successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error clearing read notifications', error: error.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipientId: req.user._id,
      type: { $in: [...LIBRARY_NOTIFICATION_TYPES] }
    });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.status(200).json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting notification', error: error.message });
  }
});

router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      { _id: req.params.id, recipientId: req.user._id, type: { $in: [...LIBRARY_NOTIFICATION_TYPES] } },
      { isRead: true },
      { returnDocument: 'after' }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Error marking notification as read', error: error.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, message, type, requestId, actionText = 'View Request', actionLink = '/library-office/clearance-requests' } = req.body;

    if (!LIBRARY_NOTIFICATION_TYPES.has(type)) {
      return res.status(400).json({
        message: 'Rejected: only employee clearance and library report notifications are allowed for Library Officer.'
      });
    }

    const newNotification = new Notification({
      recipientId: req.user._id,
      title,
      message,
      type,
      relatedRequestId: requestId,
      clearanceRequestId: requestId,
      actionText,
      actionLink
    });

    const savedNotification = await newNotification.save();
    res.status(201).json(savedNotification);
  } catch (error) {
    res.status(400).json({ message: 'Error creating notification', error: error.message });
  }
});

export default router;