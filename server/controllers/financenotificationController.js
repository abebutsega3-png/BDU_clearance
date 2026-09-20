import Notification from '../models/Notification.js';

const financeNotificationTypes = [
  'NEW_REQUEST',
  'CLEARANCE_READY_FOR_FINANCE',
  'PENDING_REMINDER',
  'REQUEST_RETURNED_TO_FINANCE',
  'EMPLOYEE_UPDATED_REQUEST',
  'FINANCE_APPROVED',
  'FINANCE_RETURNED',
  'CLEARANCE_COMPLETED',
  'FINAL_HR_CLEARANCE_COMPLETED',
  'CERTIFICATE_ISSUED',
];

const getMyNotifications = async (req, res) => {
  try {
    const query = {
      recipientId: req.user._id,
      type: { $in: financeNotificationTypes },
    };
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(100);

    const unreadCount = await Notification.countDocuments({
      recipientId: req.user._id,
      type: { $in: financeNotificationTypes },
      isRead: false,
    });

    res.status(200).json({
      success: true,
      unreadCount,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'ማሳወቂያዎችን መጫን አልተቻለም',
      error: error.message,
    });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user._id, type: { $in: financeNotificationTypes } },
      { isRead: true, readAt: new Date() },
      { returnDocument: 'after' }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'ማሳወቂያው አልተገኘም' });
    }

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'ማሳወቂያውን ማዘመን አልተቻለም',
      error: error.message,
    });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user._id, type: { $in: financeNotificationTypes }, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      message: 'ሁሉም ማሳወቂያዎች ተነቧል ተብለው ተቀይረዋል',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'ማሳወቂያዎችን ማዘመን አልተቻለም',
      error: error.message,
    });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipientId: req.user._id,
      type: { $in: financeNotificationTypes },
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'ማሳወቂያው አልተገኘም' });
    }

    res.status(200).json({ success: true, message: 'ማሳወቂያው ተሰርዟል' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'ማሳወቂያውን መሰረዝ አልተቻለም', error: error.message });
  }
};

export default {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};