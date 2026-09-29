import Notification from '../models/Notification.js';
import User from '../models/User.js';

export const TRANSPORT_NOTIFICATION_TYPES = [
  'TRANSPORT_NEW_CLEARANCE_REQUEST',
  'TRANSPORT_CLEARANCE_RESUBMITTED',
  'TRANSPORT_EMPLOYEE_RESUBMISSION',
  'TRANSPORT_CLEARANCE_RETURNED',
  'TRANSPORT_CLEARANCE_APPROVED',
  'TRANSPORT_VEHICLE_ASSIGNMENT',
  'TRANSPORT_VEHICLE_RETURNED',
  'TRANSPORT_VEHICLE_MAINTENANCE',
  'TRANSPORT_PENDING_REMINDER',
];

export const notifyTransportOfficers = async ({
  type,
  title,
  message,
  employeeName = '',
  employeeId = '',
  requestId = null,
  assetId = null,
  eventDate = new Date(),
  actionLink = '/transport-office/notifications',
  actionText = 'View Notification',
}) => {
  if (!TRANSPORT_NOTIFICATION_TYPES.includes(type)) return;

  try {
    const officers = await User.find({ role: { $regex: '^transport[ _]?officer$', $options: 'i' } })
      .select('_id name notificationPreferences')
      .lean();
    const createdAt = new Date(eventDate);
    const notifications = [];

    for (const officer of officers) {
      const dedupeFilter = {
        recipientId: officer._id,
        type,
        createdAt,
        ...(requestId ? { relatedRequestId: requestId } : {}),
        ...(assetId ? { relatedAssetId: assetId } : {}),
      };
      if (await Notification.exists(dedupeFilter)) continue;
      notifications.push({
        recipientId: officer._id,
        targetName: employeeName || officer.name || 'Transport Officer',
        employeeId,
        title,
        message,
        type,
        actionText,
        actionLink,
        relatedRequestId: requestId,
        clearanceRequestId: requestId,
        relatedAssetId: assetId,
        isRead: false,
        createdAt,
      });
    }

    if (notifications.length) await Notification.insertMany(notifications);
  } catch (error) {
    console.warn(`Unable to create Transport notification (${type}):`, error.message);
  }
};