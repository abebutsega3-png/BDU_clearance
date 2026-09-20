import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Employee from '../models/employee.js';
import { recordAuditLog } from './auditLogger.js';

const getUsers = async (_req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.error('Error in getUsers:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching users.' });
  }
};

const getUser = async (req, res) => {
  try {
    const identifier = req.params.id;
    const lookup = mongoose.isValidObjectId(identifier)
      ? { _id: identifier }
      : { $or: [{ employeeId: identifier }, { username: identifier }] };
    let user = await User.findOne(lookup).select('-password').lean();
    if (!user && mongoose.isValidObjectId(identifier)) {
      user = await User.findOne({ $or: [{ employeeId: identifier }, { username: identifier }] })
        .select('-password')
        .lean();
    }
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Invalid user id.' });
  }
};

const addUser = async (req, res) => {
  try {
    const { username, employeeId, password, confirmPassword, role, status } = req.body;
    if (!username?.trim() || !employeeId?.trim() || !password || !role) {
      return res.status(400).json({ success: false, message: 'Username, employee ID, password, and role are required.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Password and confirm password must match.' });
    }

    const employee = await Employee.findOne({ employeeId: employeeId.trim() }).lean();
    if (!employee) return res.status(404).json({ success: false, message: 'Linked employee was not found.' });

    const duplicateQuery = [{ username: username.trim() }, { employeeId: employee.employeeId }];
    if (employee.email?.trim()) duplicateQuery.push({ email: employee.email.trim().toLowerCase() });
    const duplicate = await User.findOne({ $or: duplicateQuery }).select('username employeeId email').lean();
    if (duplicate) {
      const duplicateField = duplicate.username === username.trim()
        ? 'Username'
        : duplicate.employeeId === employee.employeeId
          ? 'Employee ID'
          : 'Email';
      return res.status(409).json({ success: false, message: `${duplicateField} already exists.` });
    }

    const user = await User.create({
      username: username.trim(),
      employeeId: employee.employeeId,
      name: employee.fullName,
      email: employee.email?.trim().toLowerCase() || '',
      department: employee.department,
      password: await bcrypt.hash(password, 10),
      role,
      status: status || 'Active',
    });

    await recordAuditLog({
      req,
      user: req.user,
      action: 'CREATE_USER',
      module: 'Users',
      description: `Created a new user account for ${user.name} (${user.role}).`,
      newValues: {
        userId: user._id,
        username: user.username,
        employeeId: user.employeeId,
        role: user.role,
        status: user.status,
      },
    });

    return res.status(201).json({ success: true, message: 'User created successfully.', user: { id: user._id, username: user.username } });
  } catch (error) {
    console.error('Error in addUser:', error);
    return res.status(500).json({ success: false, message: 'Server error while creating user.' });
  }
};

const resetUserPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    if (!password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Password and confirm password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Password and confirm password must match.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const oldPasswordHash = user.password;
    user.password = await bcrypt.hash(password, 10);
    user.updatedAt = new Date();
    await user.save();

    await recordAuditLog({
      req,
      user: req.user,
      action: 'PASSWORD_RESET',
      module: 'Authentication',
      description: `Reset password for ${user.name || user.username}.`,
      oldValues: { userId: user._id, passwordHashPresent: Boolean(oldPasswordHash) },
      newValues: { userId: user._id, passwordUpdated: true },
    });

    return res.status(200).json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Error in resetUserPassword:', error);
    return res.status(500).json({ success: false, message: 'Server error while resetting password.' });
  }
};

export { getUsers, getUser, addUser, resetUserPassword };
