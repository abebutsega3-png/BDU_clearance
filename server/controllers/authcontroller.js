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

    const escapedIdentifier = normalizedIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({
      $or: [
        { email: normalizedIdentifier },
        { username: { $regex: `^${escapedIdentifier}$`, $options: 'i' } },
      ],
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      await recordAuditLog({
        req,
        user: user || null,
        action: 'FAILED_LOGIN',
        module: 'Authentication',
        description: `Failed login attempt for ${normalizedIdentifier}.`,
      });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_KEY,
      { expiresIn: '10d' }
    );

    // Update lastLogin
    const loginTimestamp = new Date();
    user.lastLogin = loginTimestamp;
    await user.save();

    await recordAuditLog({
      req,
      user,
      action: 'LOGIN',
      module: 'Authentication',
      description: `${user.name || user.username} logged in successfully.`,
    });

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
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database unavailable. Please start MongoDB and try again.',
      });
    }

    const authorization = req.headers.authorization;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Missing token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const user = await User.findById(decoded._id).select('_id name username email employeeId role department');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
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