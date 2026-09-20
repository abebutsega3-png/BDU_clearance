const Notification = require('../models/Notification');

// GET /api/notifications/my -> Retrieve notifications for logged-in user
exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id; // Get logged-in Property Officer ID from JWT/Auth middleware

    const notifications = await Notification.find({ recipientId: userId })
      .sort({ createdAt: -1 });

    const unreadCount = await Notification.countDocuments({ 
      recipientId: userId, 
      isRead: false 
    });

    return res.status(200).json({
      success: true,
      unreadCount,
      data: notifications
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve notifications', 
      error: error.message 
    });
  }
};

// PUT /api/notifications/:id/read -> Mark single notification as Read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientId: userId },
      { isRead: true },
      { returnDocument: 'after' }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    return res.status(200).json({ success: true, data: notification });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update notification status' });
  }
};

// Helper Service function: Call this when Employee submits request, returns asset, etc.
exports.createNotification = async (recipientId, type, title, message, relatedRequestId = null, relatedAssetId = null) => {
  try {
    await Notification.create({
      recipientId,
      type,
      title,
      message,
      relatedRequestId,
      relatedAssetId
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};