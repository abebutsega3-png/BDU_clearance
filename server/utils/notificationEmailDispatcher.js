import Employee from '../models/employee.js';
import User from '../models/User.js';
import LibraryOfficerSettings from '../models/LibraryOfficerSettings.js';
import { sendNotificationEmail } from './emailService.js';

const libraryNotificationPreferenceKey = (type) => {
  if (type === 'Clearance Resubmitted') return 'resubmittedClearance';
  if (['CLEARANCE_READY_FOR_LIBRARY', 'Clearance Awaiting Your Review'].includes(type)) return 'newClearanceRequest';
  if (['Outstanding Library Material', 'Outstanding Library Fine', 'Library Action Required'].includes(type)) return 'clearanceStatusUpdated';
  return null;
};

const emailPreferenceByType = {
  NEW_CLEARANCE_REQUEST: 'newRequestEmail',
  CLEARANCE_RESUBMITTED: 'returnedRequestEmail',
  ASSET_RETURNED: 'assetReturnEmail',
  CLEARANCE_APPROVED: 'clearanceApprovedEmail',
  CLEARANCE_RETURNED: 'clearanceReturnedEmail',
  CLEARANCE_REQUEST_RETURNED: 'clearanceReturnedEmail',
};

export const dispatchNotificationEmails = async (notifications) => {
  const items = (Array.isArray(notifications) ? notifications : [notifications]).filter(Boolean);
  if (!items.length) return;

  try {
    const userIds = [...new Set(items.map((notification) => notification.recipientId?.toString()).filter(Boolean))];
    const employeeIds = [...new Set(items.map((notification) => String(notification.employeeId || '').trim()).filter(Boolean))];
    const userQueries = [];
    if (userIds.length) userQueries.push({ _id: { $in: userIds } });
    if (employeeIds.length) userQueries.push({ employeeId: { $in: employeeIds } });

    const [users, employees, librarySettings] = await Promise.all([
      userQueries.length
        ? User.find({ $or: userQueries }).select('_id employeeId email notificationPreferences propertySettings.emailPreferences').lean()
        : [],
      employeeIds.length
        ? Employee.find({ employeeId: { $in: employeeIds } }).select('employeeId email').lean()
        : [],
      userIds.length
        ? LibraryOfficerSettings.find({ userId: { $in: userIds } }).select('userId notificationPreferences deliveryPreferences').lean()
        : [],
    ]);
    const usersById = new Map(users.map((user) => [user._id.toString(), user]));
    const usersByEmployeeId = new Map(users.filter((user) => user.employeeId).map((user) => [user.employeeId, user]));
    const employeesById = new Map(employees.map((employee) => [employee.employeeId, employee]));
    const librarySettingsByUserId = new Map(librarySettings.map((settings) => [settings.userId.toString(), settings]));
    await Promise.all(items.map((notification) => {
      const employeeId = String(notification.employeeId || '').trim();
      const user = usersById.get(notification.recipientId?.toString()) || usersByEmployeeId.get(employeeId);
      const employee = employeesById.get(employeeId);
      const librarySettings = librarySettingsByUserId.get(notification.recipientId?.toString());
      const libraryPreferenceKey = libraryNotificationPreferenceKey(notification.type);
      if (libraryPreferenceKey && (
        librarySettings?.notificationPreferences?.[libraryPreferenceKey] === false
        || librarySettings?.deliveryPreferences?.emailNotifications === false
      )) return Promise.resolve();
      const recipient = {
        email: user?.email || employee?.email,
        notificationPreferences: user?.notificationPreferences,
        propertySettings: user?.propertySettings,
      };

      if (!recipient.email) return Promise.resolve();
      return sendNotificationEmail({
        recipient,
        title: notification.title,
        message: notification.message,
        actionLink: notification.actionLink,
        notificationKey: emailPreferenceByType[notification.type],
      });
    }));
  } catch (error) {
    console.error('Unable to dispatch notification emails:', error.message);
  }
};