import mongoose from 'mongoose';
import ContactMessage from '../models/ContactMessage.js';
import Employee from '../models/employee.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

const isHrOfficer = (user) => {
  const roles = [user?.role, user?.activeRole, ...(Array.isArray(user?.roles) ? user.roles : [])];
  return roles.some((role) => /^(?:hr(?:[\s_-]?officer)?|human resources)$/i.test(
    String(typeof role === 'object' ? role?.name : role || '').trim(),
  ));
};

const isSystemAdmin = (user) => {
  const roles = [user?.role, user?.activeRole, ...(Array.isArray(user?.roles) ? user.roles : [])];
  return roles.some((role) => /^(?:admin|administrator|system admin|system administrator)$/i.test(
    String(typeof role === 'object' ? role?.name : role || '').trim(),
  ));
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeIdentityValue = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
const hrCategories = new Set([
  'Clearance Status Inquiry',
  'Department Review Issue',
  'Separation & Resignation',
  'General HR Support',
]);
const adminCategories = new Set([
  'Account & Login Issue',
  'System Bug / Technical Error',
  'Role & Permission Request',
  'Other Technical Support',
]);
const hrSubjects = new Set([
  'Clearance Delay',
  'Document Verification Problem',
  'HR Review Status Query',
]);
const adminSubjects = new Set([
  'Cannot Login to Account',
  'Password Reset Issue',
  'System Error / Page Not Loading',
]);

export const submitContactMessage = async (req, res) => {
  try {
    const requiredFields = ['fullName', 'employeeId', 'email', 'subject', 'category', 'message'];
    const fields = {};
    for (const field of requiredFields) {
      if (typeof req.body?.[field] !== 'string' || !req.body[field].trim()) {
        return res.status(400).json({ success: false, message: `${field} is required.` });
      }
      fields[field] = req.body[field].trim();
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    }
    if (fields.message.length > 5000) {
      return res.status(400).json({ success: false, message: 'Message must be 5000 characters or fewer.' });
    }
    if (!hrCategories.has(fields.category) && !adminCategories.has(fields.category)) {
      return res.status(400).json({ success: false, message: 'Select a valid support category.' });
    }
    const targetDepartment = adminCategories.has(fields.category) ? 'Admin' : 'HR';
    const allowedSubjects = targetDepartment === 'Admin' ? adminSubjects : hrSubjects;
    if (!allowedSubjects.has(fields.subject)) {
      return res.status(400).json({
        success: false,
        message: `Select a valid subject for ${targetDepartment === 'Admin' ? 'System Admin' : 'HR Officer'} support.`,
      });
    }

    const employee = await Employee.findOne({
      employeeId: new RegExp(`^${escapeRegex(fields.employeeId)}$`, 'i'),
      status: 'Active',
    }).select('employeeId fullName email').lean();
    if (!employee) {
      return res.status(400).json({
        success: false,
        message: 'Only registered active employees can submit a message. Check your Employee ID.',
      });
    }
    if (normalizeIdentityValue(fields.fullName) !== normalizeIdentityValue(employee.fullName)) {
      return res.status(400).json({
        success: false,
        message: 'The full name does not match the registered employee record. Enter your registered full name.',
      });
    }
    if (fields.email.toLowerCase() !== String(employee.email || '').trim().toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'The email address does not match the registered employee record. Enter your registered email.',
      });
    }

    fields.fullName = employee.fullName;
    fields.employeeId = employee.employeeId;
    fields.email = employee.email;

    let hrOfficers = [];
    let systemAdmins = [];
    if (targetDepartment === 'HR') {
      const hrRole = /^(?:hr(?:[\s_-]?officer)?|human resources)$/i;
      hrOfficers = await User.find({
        status: { $ne: 'Inactive' },
        $or: [{ role: hrRole }, { activeRole: hrRole }, { roles: hrRole }],
      }).select('_id name').lean();
      if (!hrOfficers.length) {
        return res.status(503).json({
          success: false,
          message: 'No active HR Officer account is available to receive your message. Please try again later.',
        });
      }
    } else {
      const adminRole = /^(?:admin|administrator|system admin|system administrator)$/i;
      systemAdmins = await User.find({
        status: { $ne: 'Inactive' },
        $or: [{ role: adminRole }, { activeRole: adminRole }, { roles: adminRole }],
      }).select('_id name').lean();
      if (!systemAdmins.length) {
        return res.status(503).json({
          success: false,
          message: 'No active System Admin account is available to receive your message. Please try again later.',
        });
      }
    }

    const contactMessage = await ContactMessage.create({ ...fields, targetDepartment });
    {
      const recipients = targetDepartment === 'HR' ? hrOfficers : systemAdmins;
      const notificationType = targetDepartment === 'HR' ? 'HR_CONTACT_INQUIRY' : 'ADMIN_CONTACT_INQUIRY';
      const destination = targetDepartment === 'HR' ? '/hr-office/notifications' : '/admin/notifications';
      const notifications = recipients.map((recipient) => ({
        recipientId: recipient._id,
        title: targetDepartment === 'HR' ? 'New Contact Inquiry' : 'New Admin Support Inquiry',
        message: `Category: ${contactMessage.category} | Subject: ${contactMessage.subject} | From ${contactMessage.fullName} (${contactMessage.employeeId}): ${contactMessage.message}`,
        targetName: contactMessage.fullName,
        employeeId: contactMessage.employeeId,
        type: notificationType,
        status: 'Unread',
        actionText: 'View Notification',
        actionLink: destination,
        relatedContactMessageId: contactMessage._id,
        isRead: false,
      }));

      try {
        const createdNotifications = await Notification.insertMany(notifications);
        const io = req.app.get('io');
        for (const notification of createdNotifications) {
          io.to(`user:${String(notification.recipientId)}`).emit('notification:new', notification);
        }
      } catch (error) {
        await Promise.all([
          ContactMessage.deleteOne({ _id: contactMessage._id }),
          Notification.deleteMany({ relatedContactMessageId: contactMessage._id, type: notificationType }),
        ]);
        throw error;
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Your message has been received. The support team will get back to you.',
      data: contactMessage,
    });
  } catch (error) {
    console.error('Unable to submit contact message:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to submit your message.' });
  }
};

export const getHrContactMessages = async (req, res) => {
  if (!isHrOfficer(req.user)) {
    return res.status(403).json({ success: false, message: 'Only HR Officers can view contact messages.' });
  }

  try {
    const messages = await ContactMessage.find({ targetDepartment: 'HR' })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ success: true, count: messages.length, data: messages });
  } catch (error) {
    console.error('Unable to load HR contact messages:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load contact messages.' });
  }
};

export const markHrContactMessageRead = async (req, res) => {
  if (!isHrOfficer(req.user)) {
    return res.status(403).json({ success: false, message: 'Only HR Officers can update contact messages.' });
  }
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid contact message id.' });
  }

  try {
    const message = await ContactMessage.findOneAndUpdate({
      _id: req.params.id,
      targetDepartment: 'HR',
      status: 'Unread',
    }, {
      $set: { status: 'Read' },
    }, { new: true });
    if (!message) {
      const existing = await ContactMessage.findOne({ _id: req.params.id, targetDepartment: 'HR' }).lean();
      if (!existing) return res.status(404).json({ success: false, message: 'HR contact message not found.' });
      return res.status(200).json({ success: true, data: existing });
    }
    return res.status(200).json({ success: true, data: message });
  } catch (error) {
    console.error('Unable to mark HR contact message as read:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update contact message status.' });
  }
};

export const replyToContactMessage = async (req, res) => {
  if (!isHrOfficer(req.user)) {
    return res.status(403).json({ success: false, message: 'Only HR Officers can reply to contact messages.' });
  }
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid contact message id.' });
  }

  const replyMessage = typeof req.body?.replyMessage === 'string'
    ? req.body.replyMessage.trim()
    : '';
  if (!replyMessage || replyMessage.length > 2000) {
    return res.status(400).json({ success: false, message: 'Reply must contain between 1 and 2000 characters.' });
  }

  try {
    const contactMessage = await ContactMessage.findOne({
      _id: req.params.id,
      targetDepartment: 'HR',
    }).lean();
    if (!contactMessage) {
      return res.status(404).json({ success: false, message: 'HR contact message not found.' });
    }
    if (contactMessage.status === 'Replied') {
      return res.status(409).json({ success: false, message: 'A reply has already been sent for this message.' });
    }

    const employee = await User.findOne({
      employeeId: new RegExp(`^${escapeRegex(contactMessage.employeeId)}$`, 'i'),
      email: new RegExp(`^${escapeRegex(contactMessage.email)}$`, 'i'),
    }).select('_id employeeId').lean();
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'No employee account matches the employee ID and email on this message.',
      });
    }

    const repliedAt = new Date();
    const updatedMessage = await ContactMessage.findOneAndUpdate({
      _id: contactMessage._id,
      targetDepartment: 'HR',
      status: { $ne: 'Replied' },
    }, {
      $set: { replyMessage, repliedAt, status: 'Replied' },
    }, { new: true });
    if (!updatedMessage) {
      return res.status(409).json({ success: false, message: 'A reply has already been sent for this message.' });
    }

    let notification;
    try {
      notification = await Notification.create({
        recipientId: employee._id,
        employeeId: employee.employeeId || contactMessage.employeeId,
        targetName: req.user.name || 'HR Officer',
        title: 'HR Replied to Your Inquiry',
        message: replyMessage,
        type: 'HR_CONTACT_REPLY',
        status: 'Unread',
        actionText: 'View Notifications',
        actionLink: '/employee/notifications',
        isRead: false,
      });
    } catch (error) {
      await ContactMessage.updateOne({
        _id: updatedMessage._id,
        status: 'Replied',
        repliedAt,
      }, {
        $set: { status: contactMessage.status, replyMessage: contactMessage.replyMessage || '', repliedAt: contactMessage.repliedAt || null },
      });
      throw error;
    }

    req.app.get('io').to(`user:${String(employee._id)}`).emit('notification:new', notification);
    return res.status(200).json({ success: true, data: updatedMessage });
  } catch (error) {
    console.error('Unable to reply to HR contact message:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to send your reply.' });
  }
};

export const getAdminContactMessage = async (req, res) => {
  if (!isSystemAdmin(req.user)) {
    return res.status(403).json({ success: false, message: 'Only System Admins can view admin contact messages.' });
  }
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid contact message id.' });
  }

  try {
    const message = await ContactMessage.findOne({
      _id: req.params.id,
      targetDepartment: 'Admin',
    }).lean();
    if (!message) {
      return res.status(404).json({ success: false, message: 'Admin contact message not found.' });
    }
    return res.status(200).json({ success: true, data: message });
  } catch (error) {
    console.error('Unable to load admin contact message:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load contact message.' });
  }
};

export const replyToAdminContactMessage = async (req, res) => {
  if (!isSystemAdmin(req.user)) {
    return res.status(403).json({ success: false, message: 'Only System Admins can reply to admin contact messages.' });
  }
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid contact message id.' });
  }

  const replyMessage = typeof req.body?.replyMessage === 'string'
    ? req.body.replyMessage.trim()
    : '';
  if (!replyMessage || replyMessage.length > 2000) {
    return res.status(400).json({ success: false, message: 'Reply must contain between 1 and 2000 characters.' });
  }

  try {
    const contactMessage = await ContactMessage.findOne({
      _id: req.params.id,
      targetDepartment: 'Admin',
    }).lean();
    if (!contactMessage) {
      return res.status(404).json({ success: false, message: 'Admin contact message not found.' });
    }
    if (contactMessage.status === 'Replied') {
      return res.status(409).json({ success: false, message: 'A reply has already been sent for this message.' });
    }

    const employee = await User.findOne({
      employeeId: new RegExp(`^${escapeRegex(contactMessage.employeeId)}$`, 'i'),
      email: new RegExp(`^${escapeRegex(contactMessage.email)}$`, 'i'),
    }).select('_id employeeId').lean();
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'No employee account matches the employee ID and email on this message.',
      });
    }

    const repliedAt = new Date();
    const updatedMessage = await ContactMessage.findOneAndUpdate({
      _id: contactMessage._id,
      targetDepartment: 'Admin',
      status: { $ne: 'Replied' },
    }, {
      $set: { replyMessage, repliedAt, status: 'Replied' },
    }, { new: true });
    if (!updatedMessage) {
      return res.status(409).json({ success: false, message: 'A reply has already been sent for this message.' });
    }

    let notification;
    try {
      notification = await Notification.create({
        recipientId: employee._id,
        employeeId: employee.employeeId || contactMessage.employeeId,
        targetName: req.user.name || 'System Admin',
        title: 'System Admin Replied to Your Inquiry',
        message: replyMessage,
        type: 'ADMIN_CONTACT_REPLY',
        status: 'Unread',
        actionText: 'View Notifications',
        actionLink: '/employee/notifications',
        isRead: false,
      });
    } catch (error) {
      await ContactMessage.updateOne({
        _id: updatedMessage._id,
        status: 'Replied',
        repliedAt,
      }, {
        $set: {
          status: contactMessage.status,
          replyMessage: contactMessage.replyMessage || '',
          repliedAt: contactMessage.repliedAt || null,
        },
      });
      throw error;
    }

    req.app.get('io').to(`user:${String(employee._id)}`).emit('notification:new', notification);
    return res.status(200).json({ success: true, data: updatedMessage });
  } catch (error) {
    console.error('Unable to reply to admin contact message:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to send your reply.' });
  }
};
