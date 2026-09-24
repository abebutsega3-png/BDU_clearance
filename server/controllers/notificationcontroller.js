import Notification from '../models/Notification.js';
import ClearanceRequest from '../models/clearance.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

const hrClearanceTypes = [
  'NEW_CLEARANCE_REQUEST', 'CLEARANCE_REQUEST_RETURNED', 'CLEARANCE_RESUBMITTED',
  'CLEARANCE_IN_PROGRESS', 'CLEARANCE_PROGRESS_UPDATED', 'CLEARANCE_REQUEST',
  'CLEARANCE_UPDATED', 'CLEARANCE_INFORMATION_UPDATED', 'CLEARANCE_RESUBMITTED',
  'CLEARANCE_IN_PROGRESS', 'CLEARANCE_REQUEST_RETURNED', 'ICT_CLEARANCE_APPROVED',
  'ICT_CLEARANCE_RETURNED', 'FINANCE_APPROVED', 'FINANCE_RETURNED', 'dept_completed',
  'ready_review', 'certificate_available', 'final_completed', 'CERTIFICATE_ISSUED',
  'NEW_REQUEST', 'REQUEST_SUBMITTED', 'REQUEST_ASSIGNED', 'CLEARANCE_INFO_UPDATED',
  'PENDING_REMINDER', 'PENDING_CLEARANCE_REMINDER', 'CLEARANCE_FOLLOW_UP',
];

const propertyNotificationTypes = [
  'NEW_CLEARANCE_REQUEST',
  'CLEARANCE_READY_FOR_PROPERTY',
  'CLEARANCE_RESUBMITTED',
  'PROPERTY_PENDING_REMINDER',
  'ACTION_REQUIRED',
  'OBLIGATION_FOUND'
];

const ictNotificationTypes = [
  'NEW_CLEARANCE_REQUEST',
  'NEW_ICT_CLEARANCE_REQUEST',
  'CLEARANCE_READY_FOR_ICT',
  'CLEARANCE_RESUBMITTED',
  'PENDING_CLEARANCE_REMINDER',
  'PENDING_REVIEW_REMINDER',
  'ACTION_REQUIRED',
];

const departmentNotificationTypes = [
  'NEW_CLEARANCE_REQUEST',
  'REQUEST_ASSIGNED',
  'CLEARANCE_RESUBMITTED',
  'PENDING_CLEARANCE_REMINDER',
  'CLEARANCE_UPDATED',
  'CLEARANCE_REQUEST_RETURNED',
  'CLEARANCE_APPROVED',
  'CLEARANCE_READY_FOR_REVIEW',
  'CLEARANCE_READY_FOR_LIBRARY',
  'CLEARANCE_READY_FOR_ICT',
  'REVIEW_REMINDER',
  'EMPLOYEE_UPDATED_REQUEST_DEPARTMENT',
  'CLEARANCE_RETURNED',
  'ALL_DEPARTMENT_TASKS_COMPLETED',
  'FINAL_HR_CLEARANCE_UPDATE',
];

export const systemAdminNotificationTypes = [
  'SYSTEM_USER_CREATED',
  'SYSTEM_DEPARTMENT_ADDED',
  'SYSTEM_DEPARTMENT_UPDATED',
  'SYSTEM_POSITION_CREATED',
  'SYSTEM_POSITION_UPDATED',
  'SYSTEM_POSITION_DELETED',
  'SYSTEM_SETTINGS_UPDATED',
  'SYSTEM_PASSWORD_RESET',
  'SYSTEM_ACCOUNT_DISABLED',
  'SYSTEM_SECURITY_EVENT',
  'SYSTEM_ERROR',
  'SYSTEM_AUDIT_EVENT',
];

const departmentPreferenceForType = (type) => ({
  NEW_CLEARANCE_REQUEST: ['newClearanceRequest', 'inSystemNewRequest'],
  REQUEST_ASSIGNED: ['newClearanceRequest', 'inSystemNewRequest'],
  CLEARANCE_RESUBMITTED: ['requestResubmitted', 'inSystemRequestResubmitted'],
  PENDING_CLEARANCE_REMINDER: ['pendingReviewReminder'],
  CLEARANCE_UPDATED: ['hrClearanceUpdate'],
  CLEARANCE_REQUEST_RETURNED: ['importantUpdates'],
  CLEARANCE_APPROVED: ['importantUpdates'],
}[type]);

export const isDepartmentNotificationEnabled = (user, type) => {
  const preferences = departmentPreferenceForType(type);
  return !preferences || preferences.every((preference) => user?.notificationPreferences?.[preference] !== false);
};

const ensureDepartmentPendingNotifications = async (recipientId, department) => {
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const query = {
    $or: [{ departmentStatus: 'Pending' }, { departmentStatus: { $exists: false }, status: 'Pending' }],
    createdAt: { $lte: cutoff },
  };
  if (department) query.$and = [{ $or: [
    { department: { $regex: `^${String(department).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
    { 'department.name': { $regex: `^${String(department).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
  ] }];
  const pendingRequests = await ClearanceRequest.find(query).select('requestId employeeName department').lean();

  for (const request of pendingRequests) {
    const exists = await Notification.exists({
      recipientId,
      relatedRequestId: request.requestId,
      type: 'PENDING_CLEARANCE_REMINDER',
    });
    if (!exists) {
      if (isDepartmentNotificationEnabled(await User.findById(recipientId).select('notificationPreferences').lean(), 'PENDING_CLEARANCE_REMINDER')) await Notification.create({
        recipientId,
        title: 'Review Reminder',
        message: `${request.requestId || 'A clearance request'} has been waiting for department review.`,
        targetName: request.employeeName || 'Employee',
        type: 'PENDING_CLEARANCE_REMINDER',
        actionText: 'Review Request',
        actionLink: `/department-head/clearance-requests?requestId=${encodeURIComponent(request.requestId || '')}`,
        relatedRequestId: request.requestId,
        clearanceRequestId: request.requestId,
      });
    }
  }
};

const ensureDepartmentNewRequestNotifications = async (recipientId, department) => {
  const requests = await ClearanceRequest.find({ departmentStatus: 'Pending' }).select('requestId employeeName department departmentStatus status').lean();
  const normalizedDepartment = String(department || '').trim().toLowerCase();

  for (const request of requests) {
    const requestDepartment = typeof request.department === 'object'
      ? request.department?.name || request.department?.departmentName || ''
      : request.department;
    if (!normalizedDepartment || String(requestDepartment || '').trim().toLowerCase() !== normalizedDepartment) continue;

    const requestId = request.requestId || null;
    const requestStatus = String(request.departmentStatus || request.status || 'Pending').toLowerCase();
    const type = requestStatus === 'approved' ? 'CLEARANCE_APPROVED'
      : requestStatus === 'returned' || requestStatus === 'rejected' ? 'CLEARANCE_RETURNED'
        : requestStatus === 'completed' ? 'ALL_DEPARTMENT_TASKS_COMPLETED' : 'NEW_CLEARANCE_REQUEST';
    const exists = await Notification.exists({ recipientId, relatedRequestId: requestId, type });
    if (!exists) {
      const title = type === 'CLEARANCE_APPROVED' ? 'Clearance Approved'
        : type === 'CLEARANCE_RETURNED' ? 'Clearance Returned'
          : type === 'ALL_DEPARTMENT_TASKS_COMPLETED' ? 'All Department Tasks Completed' : 'New Clearance Request';
      await Notification.create({
        recipientId,
        targetName: request.employeeName || 'Employee',
        title,
        message: type === 'CLEARANCE_APPROVED'
          ? `Department clearance for ${request.employeeName || 'the employee'} was successfully approved.`
          : type === 'CLEARANCE_RETURNED'
            ? `${request.employeeName || 'The employee'}'s clearance request was returned for correction.`
            : type === 'ALL_DEPARTMENT_TASKS_COMPLETED'
              ? `All required clearance tasks for ${request.employeeName || 'the employee'} have been completed.`
              : `${request.employeeName || 'An employee'} submitted a clearance request for your department review.`,
        type,
        actionText: 'Review Request',
        actionLink: `/department-head/clearance-requests?requestId=${encodeURIComponent(requestId || '')}`,
        relatedRequestId: requestId,
        clearanceRequestId: requestId,
        isRead: false,
      });
    }
  }
};

const ensurePropertyPendingNotifications = async (recipientId) => {
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const pendingRequests = await ClearanceRequest.find({
    departmentStatus: 'Approved',
    financeStatus: 'Approved',
    $or: [
      { propertyStatus: { $in: ['Pending', 'In Progress'] } },
      { propertyStatus: { $exists: false }, status: 'Pending' }
    ],
    createdAt: { $lte: cutoff }
  }).select('requestId').lean();

  if (!pendingRequests.length) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exists = await Notification.exists({
    recipientId,
    type: 'PROPERTY_PENDING_REMINDER',
    relatedRequestId: null,
    createdAt: { $gte: today }
  });
  if (!exists) {
    await Notification.create({
      recipientId,
      title: 'Pending Clearance Reminder',
      message: `${pendingRequests.length} clearance request${pendingRequests.length === 1 ? '' : 's'} ${pendingRequests.length === 1 ? 'is' : 'are'} waiting for Property review.`,
      targetName: 'Property Officer',
      type: 'PROPERTY_PENDING_REMINDER',
      actionText: 'View Pending Requests',
      actionLink: '/property/clearance-requests'
    });
  }
};

const ensurePropertyNewRequestNotifications = async (recipientId) => {
  const pendingRequests = await ClearanceRequest.find({
    departmentStatus: 'Approved',
    financeStatus: 'Approved',
    $or: [
      { propertyStatus: { $in: ['Pending', 'In Progress'] } },
      {
        propertyStatus: { $exists: false },
        $or: [
          { status: { $in: ['Pending', 'In Progress'] } },
          { workflow: { $elemMatch: { office: /property/i, status: { $in: ['Pending', 'In Progress'] } } } },
        ],
      },
    ],
  }).select('requestId employeeName').lean();

  for (const request of pendingRequests) {
    const exists = await Notification.exists({
      recipientId,
      relatedRequestId: request.requestId,
      type: 'NEW_CLEARANCE_REQUEST',
    });
    if (exists) continue;
    await Notification.create({
      recipientId,
      targetName: 'Property Officer',
      title: 'New Clearance Request',
      message: `${request.employeeName || 'An employee'} submitted a clearance request that requires Property review.`,
      type: 'NEW_CLEARANCE_REQUEST',
      actionText: 'View Request',
      actionLink: '/property/clearance-requests',
      relatedRequestId: request.requestId,
      clearanceRequestId: request.requestId,
      isRead: false,
    });
  }
};

const normalizeNotificationPayload = (payload = {}) => {
  const { clearanceRequestId, relatedRequestId, ...rest } = payload;
  const requestId = clearanceRequestId || relatedRequestId || null;
  return {
    ...rest,
    clearanceRequestId: requestId,
    relatedRequestId: requestId,
  };
};

export const getAllNotifications = async (req, res) => {
  try {
    const filter = req.user?._id
      ? { $or: [{ recipientId: req.user._id }, ...(req.user.employeeId ? [{ employeeId: req.user.employeeId }] : [])] }
      : {};
    const role = String(req.user?.role || '').trim();
    if (/^(?:admin|administrator|system admin|system administrator)$/i.test(role) && req.user?._id) {
      filter.$or = [{ recipientId: req.user._id }];
      filter.type = { $in: systemAdminNotificationTypes };
    } else if (/^property(?:\s*\/\s*asset)? officer$/i.test(role) && req.user?._id) {
      await ensurePropertyNewRequestNotifications(req.user._id);
      await ensurePropertyPendingNotifications(req.user._id);
      filter.type = { $in: propertyNotificationTypes };
    } else if (/^hr[ _]?officer$/i.test(role)) {
      filter.type = { $in: hrClearanceTypes };
    } else if (/^ict(?:[ _]?officer)?$/i.test(role)) {
      filter.type = { $in: ictNotificationTypes };
    } else if (/^department[ _]?head$/i.test(role) && req.user?._id) {
      await ensureDepartmentNewRequestNotifications(req.user._id, req.user.department);
      await ensureDepartmentPendingNotifications(req.user._id, req.user.department);
      filter.type = { $in: departmentNotificationTypes };
    }
    const notifications = await Notification.find(filter).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
      notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unable to load notifications.',
      error: error.message
    });
  }
};

export const createNotification = async (req, res) => {
  try {
    const payload = normalizeNotificationPayload(req.body);
    const { recipientId, title, message, targetName, type, actionText, actionLink, relatedAssetId } = payload;

    const recipient = recipientId ? await User.findById(recipientId).select('role notificationPreferences').lean() : null;
    if (/^department[ _]?head$/i.test(String(recipient?.role || '')) && !isDepartmentNotificationEnabled(recipient, type)) {
      return res.status(201).json({ success: true, data: null, skipped: true });
    }
    const newNotification = await Notification.create({
      title,
      message,
      targetName: targetName || '',
      type,
      actionText,
      actionLink,
      recipientId: recipientId || null,
      relatedRequestId: payload.relatedRequestId,
      clearanceRequestId: payload.clearanceRequestId,
      relatedAssetId
    });

    res.status(201).json({ success: true, data: newNotification });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Unable to create notification.',
      error: error.message
    });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const filter = req.user?._id ? { recipientId: req.user._id, isRead: false } : { isRead: false };
    await Notification.updateMany(filter, { isRead: true });

    res.status(200).json({
      success: true,
      message: 'All notifications were marked as read.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unable to update notification status.',
      error: error.message
    });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const filter = req.user?._id ? { _id: req.params.id, recipientId: req.user._id } : { _id: req.params.id };
    const notification = await Notification.findOneAndUpdate(
      filter,
      { isRead: true },
      { returnDocument: 'after' }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.'
      });
    }

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getUnreadSummary = async (req, res) => {
  try {
    const unreadFilter = { isRead: false };
    const newRequests = await Notification.countDocuments({ ...unreadFilter, type: { $in: ['new_request', 'NEW_CLEARANCE_REQUEST'] } });
    const deptCompleted = await Notification.countDocuments({ ...unreadFilter, type: { $in: ['dept_completed', 'FINANCE_APPROVED', 'CLEARANCE_IN_PROGRESS'] } });
    const pending = await Notification.countDocuments({ ...unreadFilter, type: 'pending' });
    const returned = await Notification.countDocuments({ ...unreadFilter, type: { $in: ['returned', 'CLEARANCE_REQUEST_RETURNED', 'FINANCE_RETURNED'] } });
    const readyForFinalReview = await Notification.countDocuments({ ...unreadFilter, type: { $in: ['ready_review', 'certificate_available'] } });

    const totalUnread = newRequests + deptCompleted + pending + returned + readyForFinalReview;

    res.status(200).json({
      success: true,
      summary: {
        newRequests,
        deptCompleted,
        pending,
        returned,
        readyForFinalReview,
        totalUnread
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unable to load summary.',
      error: error.message
    });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification id.' });
    }

    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    const userId = String(req.user?._id || req.user?.id || '');
    const recipientId = String(notification.recipientId || '');
    const employeeId = String(req.user?.employeeId || '').trim();
    const notificationEmployeeId = String(notification.employeeId || '').trim();
    let isOwner = Boolean(userId && recipientId && userId === recipientId);
    isOwner = isOwner || Boolean(employeeId && notificationEmployeeId && employeeId === notificationEmployeeId);

    if (!isOwner && employeeId && notification.relatedRequestId) {
      const clearance = await ClearanceRequest.findOne({ requestId: notification.relatedRequestId })
        .select('employeeId employeeName').lean();
      isOwner = Boolean(clearance && (
        (clearance.employeeId && String(clearance.employeeId) === employeeId) ||
        (req.user?.name && clearance.employeeName && String(clearance.employeeName).toLowerCase() === String(req.user.name).toLowerCase())
      ));
    }

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'You cannot delete this notification.' });
    }

    await Notification.deleteOne({ _id: notification._id });

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully.'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};