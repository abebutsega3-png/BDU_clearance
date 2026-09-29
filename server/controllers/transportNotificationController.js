import Clearance from '../models/clearance.js';
import Notification from '../models/Notification.js';
import Asset from '../models/propertyAsset.js';
import {
  getTransportStatusFilter,
  transportReviewableFilter,
} from '../utils/transportClearance.js';
import {
  notifyTransportOfficers,
  TRANSPORT_NOTIFICATION_TYPES,
} from '../utils/transportNotifications.js';

const vehicleAssetQuery = {
  $or: [
    { assetName: { $regex: '\\b(vehicle|transport|buses?|pickup|sedan|cars?|vans?|trucks?)\\b', $options: 'i' } },
    { assetType: { $regex: '\\b(vehicle|transport|buses?|pickup|sedan|cars?|vans?|trucks?)\\b', $options: 'i' } },
    { category: { $regex: '\\b(vehicle|transport|buses?|pickup|sedan|cars?|vans?|trucks?)\\b', $options: 'i' } },
  ],
};

const isTransportOfficer = (user) => {
  const role = String(user?.role || '').trim().toLowerCase();
  return role.includes('transport') && role.includes('officer');
};

const requireTransportOfficer = (req, res) => {
  if (isTransportOfficer(req.user)) return false;
  res.status(403).json({ success: false, message: 'Transport Officer access is required.' });
  return true;
};

const notificationDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const synchronizeVehicleNotifications = async () => {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const assets = await Asset.find(vehicleAssetQuery)
    .select('assetId vehicleNumber plateNumber employeeName employeeId assignmentHistory assignedDate returnDate status history updatedAt')
    .lean();

  for (const asset of assets) {
    const assetNumber = asset.vehicleNumber || asset.plateNumber || asset.assetId || 'Vehicle';
    const employee = asset.employeeName && asset.employeeName !== 'Unknown Employee' ? asset.employeeName : 'An employee';
    const employeeId = asset.employeeId && asset.employeeId !== 'N/A' ? asset.employeeId : '';
    const event = async (type, title, message, date) => {
      const eventDate = notificationDate(date);
      if (!eventDate || eventDate < cutoff) return;
      await notifyTransportOfficers({
        type,
        title,
        message,
        employeeName: asset.employeeName,
        employeeId,
        assetId: asset.assetId,
        eventDate,
        actionText: 'View Vehicle Record',
        actionLink: '/transport-office/assigned-vehicles',
      });
    };

    const assignmentHistory = Array.isArray(asset.assignmentHistory) ? asset.assignmentHistory : [];
    for (const assignment of assignmentHistory) {
      const assignedEmployee = assignment.employeeName || employee;
      const assignedEmployeeId = assignment.employeeId || employeeId;
      if (assignment.assignedDate) {
        await event(
          'TRANSPORT_VEHICLE_ASSIGNMENT',
          'Vehicle Assignment',
          `Vehicle ${assetNumber} was assigned to ${assignedEmployee}${assignedEmployeeId ? ` (${assignedEmployeeId})` : ''}.`,
          assignment.assignedDate,
        );
      }
      if (assignment.returnedDate) {
        await event(
          'TRANSPORT_VEHICLE_RETURNED',
          'Vehicle Returned',
          `Vehicle ${assetNumber} was returned by ${assignedEmployee}${assignedEmployeeId ? ` (${assignedEmployeeId})` : ''}.`,
          assignment.returnedDate,
        );
      }
      if (/maintenance|repair/i.test(String(assignment.status || ''))) {
        await event(
          'TRANSPORT_VEHICLE_MAINTENANCE',
          'Vehicle Maintenance',
          `Vehicle ${assetNumber} entered maintenance.`,
          assignment.updatedAt || assignment.date,
        );
      }
    }

    if (!assignmentHistory.length) {
      const status = String(asset.status || '').toLowerCase();
      if (asset.assignedDate) {
        await event(
          'TRANSPORT_VEHICLE_ASSIGNMENT',
          'Vehicle Assignment',
          `Vehicle ${assetNumber} was assigned to ${employee}${employeeId ? ` (${employeeId})` : ''}.`,
          asset.assignedDate,
        );
      }
      if (asset.returnDate) {
        await event(
          'TRANSPORT_VEHICLE_RETURNED',
          'Vehicle Returned',
          `Vehicle ${assetNumber} was returned by ${employee}${employeeId ? ` (${employeeId})` : ''}.`,
          asset.returnDate,
        );
      }
      if (/maintenance|repair|damaged/.test(status)) {
        await event(
          'TRANSPORT_VEHICLE_MAINTENANCE',
          'Vehicle Maintenance',
          `Vehicle ${assetNumber} is marked ${asset.status}.`,
          asset.updatedAt,
        );
      }
    }

    for (const historyEntry of Array.isArray(asset.history) ? asset.history : []) {
      const action = String(historyEntry.action || '').toLowerCase();
      if (/assign/.test(action)) {
        await event('TRANSPORT_VEHICLE_ASSIGNMENT', 'Vehicle Assignment', `Vehicle ${assetNumber}: ${historyEntry.action}.`, historyEntry.date);
      } else if (/return/.test(action)) {
        await event('TRANSPORT_VEHICLE_RETURNED', 'Vehicle Returned', `Vehicle ${assetNumber}: ${historyEntry.action}.`, historyEntry.date);
      } else if (/maintenance|repair/.test(action)) {
        await event('TRANSPORT_VEHICLE_MAINTENANCE', 'Vehicle Maintenance', `Vehicle ${assetNumber}: ${historyEntry.action}.`, historyEntry.date);
      }
    }
  }
};

const synchronizePendingReminders = async () => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const pendingFilter = getTransportStatusFilter('Pending');
  const pendingRequests = await Clearance.find({
    $and: [transportReviewableFilter, pendingFilter, { createdAt: { $lte: cutoff } }],
  }).select('requestId employeeName employeeId createdAt updatedAt').lean();
  const reminderDate = new Date();
  reminderDate.setHours(0, 0, 0, 0);

  for (const request of pendingRequests) {
    await notifyTransportOfficers({
      type: 'TRANSPORT_PENDING_REMINDER',
      title: 'Pending Clearance Reminder',
      message: `Transport clearance for ${request.employeeName || request.employeeId || 'an employee'} is still pending.`,
      employeeName: request.employeeName,
      employeeId: request.employeeId,
      requestId: request.requestId,
      eventDate: reminderDate,
      actionText: 'Review Request',
      actionLink: '/transport-office/requests',
    });
  }
};

export const getTransportNotifications = async (req, res) => {
  if (requireTransportOfficer(req, res)) return;

  try {
    await Promise.all([synchronizeVehicleNotifications(), synchronizePendingReminders()]);
    const notifications = await Notification.find({
      recipientId: req.user._id,
      type: { $in: TRANSPORT_NOTIFICATION_TYPES },
    }).sort({ createdAt: -1 }).limit(150).lean();

    return res.status(200).json({
      success: true,
      total: notifications.length,
      unreadCount: notifications.filter((notification) => !notification.isRead).length,
      notifications,
    });
  } catch (error) {
    console.error('Error fetching Transport notifications:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load Transport notifications.' });
  }
};

export const markTransportNotificationRead = async (req, res) => {
  if (requireTransportOfficer(req, res)) return;

  try {
    const notification = await Notification.findOneAndUpdate({
      _id: req.params.id,
      recipientId: req.user._id,
      type: { $in: TRANSPORT_NOTIFICATION_TYPES },
    }, { isRead: true }, { returnDocument: 'after' });
    if (!notification) return res.status(404).json({ success: false, message: 'Transport notification not found.' });
    return res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error('Error marking Transport notification read:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update the notification.' });
  }
};

export const markAllTransportNotificationsRead = async (req, res) => {
  if (requireTransportOfficer(req, res)) return;

  try {
    await Notification.updateMany({
      recipientId: req.user._id,
      type: { $in: TRANSPORT_NOTIFICATION_TYPES },
      isRead: false,
    }, { isRead: true });
    return res.status(200).json({ success: true, message: 'Transport notifications marked as read.' });
  } catch (error) {
    console.error('Error marking all Transport notifications read:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update Transport notifications.' });
  }
};