import Notification from '../models/Notification.js';

// 1. ሁሉንም ማስታወቂያዎች ማምጣት (Get All Notifications)
export const getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
};

// 2. ነጠላ ማስታወቂያን "Read" ማድረግ (Mark Single Notification as Read)
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedNotification = await Notification.findByIdAndUpdate(
      id,
      { status: 'Read' },
      { returnDocument: 'after' }
    );

    if (!updatedNotification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json(updatedNotification);
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification status', error: error.message });
  }
};

// 3. ሁሉንም ማስታወቂያዎች በአንድ ላይ "Read" ማድረግ (Mark All Notifications as Read)
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ status: 'Unread' }, { status: 'Read' });
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating all notifications', error: error.message });
  }
};

// 4. አዲስ ማስታወቂያ መፍጠር (Create New Notification)
export const createNotification = async (req, res) => {
  try {
    const { title, description, relatedTo, type } = req.body;
    
    const newNotification = new Notification({
      title,
      description,
      relatedTo,
      type
    });

    await newNotification.save();
    res.status(201).json(newNotification);
  } catch (error) {
    res.status(500).json({ message: 'Error creating notification', error: error.message });
  }
};