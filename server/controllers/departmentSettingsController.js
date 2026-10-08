import User from '../models/User.js';
import Department from '../models/department.js';
import AuditLog from '../models/AuditLog.js';
import { recordAuditLog } from './auditLogger.js';

const defaultSettings = {
  notificationPreferences: {
    emailNotifications: true,
    newClearanceRequest: true,
    requestResubmitted: true,
    pendingReviewReminder: true,
    hrClearanceUpdate: true,
    importantUpdates: true,
    approvalNotifications: true,
    inSystemNewRequest: true,
    inSystemRequestResubmitted: true,
  },
  displayPreferences: { theme: 'system', language: 'English' },
};

export const getDepartmentSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('name role department departmentId position campus lastLogin notificationPreferences displayPreferences')
      .lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const escapedDepartment = String(user.department || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const department = user.departmentId
      ? await Department.findById(user.departmentId).select('departmentName departmentHead').lean()
      : escapedDepartment
        ? await Department.findOne({ departmentName: { $regex: `^${escapedDepartment}$`, $options: 'i' } })
          .select('departmentName departmentHead')
          .lean()
        : null;
    const securityActivity = await AuditLog.find({
      userId: user._id,
      module: 'Authentication',
      action: 'LOGIN',
    }).sort({ createdAt: -1 }).limit(5).select('createdAt ipAddress userAgent').lean();

    res.json({ success: true, settings: {
      notificationPreferences: { ...defaultSettings.notificationPreferences, ...user.notificationPreferences },
      displayPreferences: { ...defaultSettings.displayPreferences, ...user.displayPreferences },
      departmentInformation: {
        departmentName: department?.departmentName || user.department || '',
        departmentHead: department?.departmentHead || user.name || '',
        position: user.position || user.role || '',
      },
      security: {
        lastLogin: user.lastLogin || null,
        activity: securityActivity.map((item) => ({
          date: item.createdAt,
          ipAddress: item.ipAddress || '',
          userAgent: item.userAgent || '',
        })),
      },
    } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load settings.', error: error.message });
  }
};

export const updateDepartmentSettings = async (req, res) => {
  try {
    const notificationKeys = Object.keys(defaultSettings.notificationPreferences);
    const preferences = Object.fromEntries(notificationKeys
      .filter((key) => typeof req.body?.notificationPreferences?.[key] === 'boolean')
      .map((key) => [key, req.body.notificationPreferences[key]]));
    const display = req.body?.displayPreferences || {};
    const updates = Object.fromEntries(
      Object.entries(preferences).map(([key, value]) => [`notificationPreferences.${key}`, value]),
    );
    if (display.theme !== undefined) {
      updates['displayPreferences.theme'] = ['system', 'light', 'dark'].includes(display.theme)
        ? display.theme
        : 'system';
    }
    if (display.language !== undefined) {
      updates['displayPreferences.language'] = typeof display.language === 'string' && display.language
        ? display.language
        : 'English';
    }
    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { returnDocument: 'after', runValidators: true })
      .select('notificationPreferences displayPreferences').lean();
    res.json({ success: true, message: 'Settings saved successfully.', settings: user });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Unable to save settings.', error: error.message });
  }
};

export const logoutAllDevices = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { tokenVersion: 1 } },
      { new: true },
    ).select('_id name');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    await recordAuditLog({
      req,
      user,
      action: 'LOGOUT_ALL_DEVICES',
      module: 'Authentication',
      description: `${user.name || 'Department Head'} revoked all active sessions.`,
    });

    return res.json({ success: true, message: 'All active sessions have been signed out.' });
  } catch (error) {
    console.error('Unable to sign out all department head sessions:', error);
    return res.status(500).json({ success: false, message: 'Unable to sign out all devices.' });
  }
};