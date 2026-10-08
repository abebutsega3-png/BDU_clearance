import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { recordAuditLog } from './auditLogger.js';
import { sendNotificationEmail } from '../utils/emailService.js';

const login = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database unavailable. Please start MongoDB and try again.',
      });
    }

    const { identifier, email, password } = req.body;
    const normalizedIdentifier = (identifier ?? email)?.trim().toLowerCase();
    if (!normalizedIdentifier || !password) {
      return res.status(400).json({ success: false, message: 'Username/email and password are required' });
    }

    const user = await User.findOne({
      $or: [
        { email: normalizedIdentifier },
        { username: normalizedIdentifier },
      ],
    })
      .select('_id name username email employeeId role department password tokenVersion notificationPreferences.emailNotifications')
      .collation({ locale: 'en', strength: 2 })
      .maxTimeMS(5000)
      .lean();
    if (!user || !(await bcrypt.compare(password, user.password))) {
      void recordAuditLog({
        req,
        user: user || null,
        action: 'FAILED_LOGIN',
        module: 'Authentication',
        description: `Failed login attempt for ${normalizedIdentifier}.`,
      }).catch((error) => console.error('Failed-login audit log failed:', error.message));
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { _id: user._id, role: user.role, tokenVersion: user.tokenVersion || 0 },
      process.env.JWT_KEY,
      { expiresIn: '10d' }
    );

    const loginTimestamp = new Date();
    void User.updateOne(
      { _id: user._id },
      { $set: { lastLogin: loginTimestamp } }
    ).catch((error) => console.error('Login timestamp update failed:', error.message));

    void recordAuditLog({
      req,
      user,
      action: 'LOGIN',
      module: 'Authentication',
      description: `${user.name || user.username} logged in successfully.`,
    }).catch((error) => console.error('Login audit log failed:', error.message));

    void sendNotificationEmail({
      recipient: user,
      title: 'New sign-in to your BDU account',
      message: [
        'A successful login was detected for your account.',
        `Time: ${loginTimestamp.toISOString()}`,
        `IP address: ${req.ip || req.socket?.remoteAddress || 'Unknown'}`,
        `Browser/device: ${req.get('user-agent') || 'Unknown'}`,
      ].join('\n'),
      notificationKey: 'securityAlert',
    }).catch((error) => console.error('Login notification failed:', error.message));

    return res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        employeeId: user.employeeId,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const verify = async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authenticated user was not found.' });
  }

  return res.status(200).json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      employeeId: user.employeeId,
      role: user.role,
      department: user.department,
      profileImage: user.profileImage,
    },
  });
};

const getProfile = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database unavailable. Please start MongoDB and try again.',
      });
    }

    const userId = req.user._id;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        employeeId: user.employeeId,
        role: user.role,
        department: user.department,
        profileImage: user.profileImage,
        status: user.status,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        position: user.position,
        campus: user.campus,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        dateJoined: user.dateJoined,
      },
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export { login, verify, getProfile };