import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

const systemNotificationByAction = {
  CREATE_USER: ['SYSTEM_USER_CREATED', 'New User Created', (description) => description],
  CREATE_DEPARTMENT: ['SYSTEM_DEPARTMENT_ADDED', 'Department Added', (description) => description],
  UPDATE_DEPARTMENT: ['SYSTEM_DEPARTMENT_UPDATED', 'Department Updated', (description) => description],
  CREATE_POSITION: ['SYSTEM_POSITION_CREATED', 'Office Configuration Added', (description) => description],
  UPDATE_POSITION: ['SYSTEM_POSITION_UPDATED', 'Office Configuration Updated', (description) => description],
  DELETE_POSITION: ['SYSTEM_POSITION_DELETED', 'Office Configuration Removed', (description) => description],
  UPDATE_SYSTEM_SETTINGS: ['SYSTEM_SETTINGS_UPDATED', 'System Settings Updated', (description) => description],
  PASSWORD_RESET: ['SYSTEM_PASSWORD_RESET', 'Password / Security Event', (description) => description],
};

export const recordAuditLog = async ({
  req,
  user,
  action,
  module,
  description,
  oldValues = null,
  newValues = null,
}) => {
  try {
    const actor = user || req?.user || null;
    const normalizedAction = String(action || 'SYSTEM_ACTION').trim().toUpperCase();

    await AuditLog.create({
      userId: actor?._id || null,
      actorRole: actor?.role || 'System',
      action: normalizedAction,
      module: module || 'System',
      description: description || '',
      ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || '',
      userAgent: req?.get?.('user-agent') || '',
      oldValues,
      newValues,
    });

    const notification = systemNotificationByAction[normalizedAction];
    if (notification) {
      const admins = await User.find({ role: { $regex: '^(admin|administrator|system admin|system administrator)$', $options: 'i' } }).select('_id').lean();
      if (admins.length) {
        await Notification.insertMany(admins.map((admin) => ({
          recipientId: admin._id,
          title: notification[1],
          message: notification[2](description),
          type: notification[0],
          actionText: 'View Audit Log',
          actionLink: '/admin/audit-logs',
          isRead: false,
        })));
      }
    }
  } catch (error) {
    console.warn(`Unable to record audit log for ${action || 'SYSTEM_ACTION'}:`, error.message);
  }
};
