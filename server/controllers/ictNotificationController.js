import Notification from '../models/ictNotification.js';

// 1. Get all ICT Notifications with filters
export const getICTNotifications = async (req, res) => {
  try {
    const { category, isRead } = req.query;
    
    // ለ ICT Officer ከተመደቡ ክፍሎች ብቻ የሚመጡ ኖቲፊኬሽኖችን ማጣሪያ
    let query = { recipientRole: 'ICT_Officer' };

    if (category && category !== 'All') {
      query.category = category; // Clearance, Asset, Reminder, System
    }
    if (isRead !== undefined && isRead !== 'All') {
      query.isRead = isRead === 'read';
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ 
      recipientRole: 'ICT_Officer', 
      isRead: false 
    });

    res.status(200).json({
      success: true,
      unreadCount,
      notifications
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Mark single notification as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { isRead: true });
    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipientRole: 'ICT_Officer', isRead: false }, { isRead: true });
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};