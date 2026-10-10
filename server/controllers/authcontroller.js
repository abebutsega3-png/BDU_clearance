import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { recordAuditLog } from './auditLogger.js';
import { sendNotificationEmail } from '../utils/emailService.js';

const refreshCookieName = 'bdu_refresh_token';
const refreshTokenSecret = () => process.env.JWT_REFRESH_KEY || process.env.JWT_KEY;
const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000
});
const clearRefreshCookie = (res) => {
  const { maxAge, ...options } = refreshCookieOptions();
  res.clearCookie(refreshCookieName, options);
};
const getRefreshToken = (req) => {
  const cookieHeader = req.headers.cookie || '';
  const cookie = cookieHeader.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${refreshCookieName}=`));
  return cookie ? cookie.slice(refreshCookieName.length + 1) : '';
};
const createAccessToken = (user) => jwt.sign(
  {
    _id: user._id,
    role: user.activeRole || user.role || (Array.isArray(user.roles) ? user.roles[0] : 'Employee'),
    roles: Array.isArray(user.roles) ? user.roles : [user.role || 'Employee'],
    activeRole: user.activeRole || user.role || (Array.isArray(user.roles) ? user.roles[0] : 'Employee'),
    tokenVersion: user.tokenVersion || 0,
    tokenUse: 'access'
  },
  process.env.JWT_KEY,
  { expiresIn: '12h' }
);

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
      .select('_id name username email employeeId role roles activeRole department password tokenVersion notificationPreferences.emailNotifications')
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

    const token = createAccessToken(user);
    const refreshToken = jwt.sign(
      { _id: user._id, tokenVersion: user.tokenVersion || 0, tokenUse: 'refresh' },
      refreshTokenSecret(),
      { expiresIn: '30d' }
    );
    res.cookie(refreshCookieName, refreshToken, refreshCookieOptions());

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

    const activeRole = user.activeRole || user.role || (Array.isArray(user.roles) ? user.roles[0] : 'Employee');
    return res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        employeeId: user.employeeId,
        role: activeRole,
        roles: Array.isArray(user.roles) ? user.roles : [user.role || activeRole],
        activeRole,
        department: user.department,
      },
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const refresh = async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database unavailable. Please try again.',
    });
  }

  const refreshToken = getRefreshToken(req);
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Sign-in session expired. Please sign in again.' });
  }

  try {
    const decoded = jwt.verify(refreshToken, refreshTokenSecret());
    if (decoded.tokenUse !== 'refresh' || !decoded._id) {
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: 'Sign-in session is invalid. Please sign in again.' });
    }

    const user = await User.findById(decoded._id)
      .select('_id role status tokenVersion')
      .maxTimeMS(5000)
      .lean();
    if (!user || user.status !== 'Active' || (decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: 'Sign-in session expired. Please sign in again.' });
    }

    return res.status(200).json({ success: true, token: createAccessToken(user) });
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: 'Sign-in session expired. Please sign in again.' });
    }

    console.error('Session refresh failed:', error.message);
    return res.status(503).json({ success: false, message: 'Unable to refresh your session. Please try again.' });
  }
};

const logout = (req, res) => {
  clearRefreshCookie(res);
  return res.status(200).json({ success: true });
};

const verify = async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authenticated user was not found.' });
  }

  const activeRole = user.activeRole || user.role || (Array.isArray(user.roles) ? user.roles[0] : 'Employee');
  return res.status(200).json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      employeeId: user.employeeId,
      role: activeRole,
      roles: Array.isArray(user.roles) ? user.roles : [user.role || activeRole],
      activeRole,
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

    const activeRole = user.activeRole || user.role || (Array.isArray(user.roles) ? user.roles[0] : 'Employee');
    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        employeeId: user.employeeId,
        role: activeRole,
        roles: Array.isArray(user.roles) ? user.roles : [user.role || activeRole],
        activeRole,
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

export { login, refresh, logout, verify, getProfile };