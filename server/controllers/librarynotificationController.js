const Notification = require('../models/Notification');

// 1. Get all notifications for Library Officer
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientRole: 'Library Officer' })
      .sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Mark a single notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { returnDocument: 'after' }
    );
    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientRole: 'Library Officer', isRead: false },
      { $set: { isRead: true } }
    );
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. Clear (delete) all read notifications
exports.clearReadNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ recipientRole: 'Library Officer', isRead: true });
    res.status(200).json({ message: 'Read notifications cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};