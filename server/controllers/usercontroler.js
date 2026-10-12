import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Employee from '../models/employee.js';
import Department from '../models/department.js';
import { recordAuditLog } from './auditLogger.js';
import { selectActiveRole } from '../utils/userRoleState.js';

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getUsers = async (req, res) => {
  try {
    const requestedPage = Number.parseInt(typeof req.query.page === 'string' ? req.query.page : '1', 10);
    const requestedLimit = Number.parseInt(typeof req.query.limit === 'string' ? req.query.limit : '10', 10);
    const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
    const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 10;
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
    const filter = {};

    if (search) {
      const searchPattern = new RegExp(escapeRegExp(search), 'i');
      filter.$or = [
        { name: searchPattern },
        { username: searchPattern },
        { email: searchPattern },
      ];
    }
    if (typeof req.query.role === 'string' && req.query.role !== 'All') {
      filter.$and = [
        ...(filter.$and || []),
        { $or: [{ roles: req.query.role }, { role: req.query.role }] },
      ];
    }
    if (typeof req.query.department === 'string' && req.query.department !== 'All Departments') {
      filter.department = req.query.department;
    }
    if (typeof req.query.status === 'string' && req.query.status !== 'All') {
      filter.status = req.query.status === 'Deactivated' ? 'Inactive' : req.query.status;
    }

    const total = await User.countDocuments(filter).maxTimeMS(5000);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(page, totalPages);
    const [users, departments] = await Promise.all([
      User.find(filter)
        .select('username name email role roles activeRole department employeeId status createdAt')
        .sort({ createdAt: -1, _id: -1 })
        .skip((currentPage - 1) * limit)
        .limit(limit)
        .maxTimeMS(5000)
        .lean(),
      User.distinct('department').maxTimeMS(5000),
    ]);

    return res.status(200).json({
      success: true,
      users,
      total,
      page: currentPage,
      limit,
      departments: departments.filter((department) => typeof department === 'string' && department.trim()).sort(),
    });
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

const parseUserRoles = (value) => {
  const nextRoles = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  return [...new Set(nextRoles
    .map((role) => String(role).trim())
    .filter(Boolean))];
};

const addUser = async (req, res) => {
  try {
    const { username, employeeId, password, confirmPassword, role, roles, status, activeRole } = req.body;
    const selectedRoles = parseUserRoles(roles?.length ? roles : role);
    if (!username?.trim() || !employeeId?.trim() || !selectedRoles.length) {
      return res.status(400).json({ success: false, message: 'Username, employee ID, and at least one role are required.' });
    }
    if (password && password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Password and confirm password must match.' });
    }

    const employee = await Employee.findOne({ employeeId: employeeId.trim() }).lean();
    if (!employee) return res.status(404).json({ success: false, message: 'Linked employee was not found.' });
    const departmentRecord = employee.departmentId
      ? null
      : await Department.findOne({ departmentName: { $regex: `^${escapeRegExp(employee.department)}$`, $options: 'i' } }).select('_id').lean();

    const normalizedUsername = username.trim();
    const normalizedEmployeeId = employee.employeeId.trim();
    const normalizedEmail = employee.email?.trim().toLowerCase() || '';
    const existingEmployeeUser = await User.findOne({ employeeId: normalizedEmployeeId }).select('_id username employeeId email roles role activeRole status').lean();

    if (!existingEmployeeUser && !password) {
      return res.status(400).json({ success: false, message: 'A password is required to create a new user account.' });
    }

    const duplicateUsername = await User.findOne({ username: normalizedUsername }).select('_id username employeeId').lean();
    if (duplicateUsername && (!existingEmployeeUser || String(duplicateUsername._id) !== String(existingEmployeeUser._id))) {
      return res.status(409).json({ success: false, message: 'Username already exists.' });
    }

    if (normalizedEmail) {
      const duplicateEmail = await User.findOne({ email: normalizedEmail }).select('_id email employeeId').lean();
      if (duplicateEmail && (!existingEmployeeUser || String(duplicateEmail._id) !== String(existingEmployeeUser._id))) {
        return res.status(409).json({ success: false, message: 'Email already exists.' });
      }
    }

    const resolvedRoles = [...new Set(selectedRoles)];
    const resolvedActiveRole = activeRole || resolvedRoles[0] || 'Employee';

    if (existingEmployeeUser) {
      const currentUser = await User.findById(existingEmployeeUser._id);
      if (!currentUser) {
        return res.status(404).json({ success: false, message: 'Existing user account could not be found.' });
      }

      currentUser.username = normalizedUsername;
      currentUser.employeeId = normalizedEmployeeId;
      currentUser.name = employee.fullName;
      currentUser.email = normalizedEmail;
      currentUser.department = employee.department;
      currentUser.departmentId = employee.departmentId || departmentRecord?._id || currentUser.departmentId || null;
      currentUser.roles = [...new Set([
        ...(currentUser.roles || []),
        currentUser.role,
        currentUser.activeRole,
        ...resolvedRoles,
      ].filter(Boolean))];
      currentUser.activeRole = selectActiveRole(currentUser.roles, [
        activeRole,
        currentUser.activeRole,
        currentUser.role,
      ]);
      currentUser.role = currentUser.activeRole;
      currentUser.status = status || currentUser.status || 'Active';
      if (password) currentUser.password = await bcrypt.hash(password, 10);
      await currentUser.save();

      await recordAuditLog({
        req,
        user: req.user,
        action: 'UPDATE_USER_ROLES',
        module: 'Users',
        description: `Updated roles for ${currentUser.name} to ${currentUser.roles.join(', ')}.`,
        newValues: {
          userId: currentUser._id,
          username: currentUser.username,
          employeeId: currentUser.employeeId,
          roles: currentUser.roles,
          activeRole: currentUser.activeRole,
          status: currentUser.status,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'User roles updated successfully.',
        user: { id: currentUser._id, username: currentUser.username, roles: currentUser.roles, activeRole: currentUser.activeRole },
      });
    }

    const user = await User.create({
      username: normalizedUsername,
      employeeId: normalizedEmployeeId,
      name: employee.fullName,
      email: normalizedEmail,
      department: employee.department,
      departmentId: employee.departmentId || departmentRecord?._id || null,
      password: await bcrypt.hash(password, 10),
      role: resolvedActiveRole,
      roles: resolvedRoles,
      activeRole: resolvedActiveRole,
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

const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { username, employeeId, password, confirmPassword, role, roles, status, activeRole } = req.body;
    const selectedRoles = parseUserRoles(roles?.length ? roles : role);

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    if (!username?.trim() || !employeeId?.trim() || !selectedRoles.length) {
      return res.status(400).json({ success: false, message: 'Username, employee ID, and at least one role are required.' });
    }
    if (password && password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Password and confirm password must match.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const currentUserIsTargetUser = req.user && user._id && req.user._id && String(req.user._id) === String(user._id);
    const existingRoleValues = [...new Set([...(user.roles || []), user.role, user.activeRole].filter(Boolean))];
    const targetHasAdminRole = existingRoleValues.some((roleValue) => String(roleValue).toLowerCase().includes('admin') || String(roleValue).toLowerCase() === 'administrator');
    const selectedHasAdminRole = selectedRoles.some((roleValue) => String(roleValue).toLowerCase().includes('admin') || String(roleValue).toLowerCase() === 'administrator');
    if (currentUserIsTargetUser && targetHasAdminRole && !selectedHasAdminRole) {
      return res.status(403).json({ success: false, message: 'You cannot remove your Administrator role from your own account.' });
    }

    const employee = await Employee.findOne({ employeeId: employeeId.trim() }).lean();
    if (!employee) return res.status(404).json({ success: false, message: 'Linked employee was not found.' });

    const normalizedUsername = username.trim();
    const normalizedEmployeeId = employee.employeeId.trim();
    const normalizedEmail = employee.email?.trim().toLowerCase() || '';

    const duplicateUsername = await User.findOne({ username: normalizedUsername, _id: { $ne: user._id } }).select('_id username employeeId').lean();
    if (duplicateUsername) {
      return res.status(409).json({ success: false, message: 'Username already exists.' });
    }

    if (normalizedEmail) {
      const duplicateEmail = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } }).select('_id email employeeId').lean();
      if (duplicateEmail) {
        return res.status(409).json({ success: false, message: 'Email already exists.' });
      }
    }

    const duplicateEmployeeUser = await User.findOne({ employeeId: normalizedEmployeeId, _id: { $ne: user._id } }).select('_id employeeId').lean();
    if (duplicateEmployeeUser) {
      return res.status(409).json({ success: false, message: 'This employee is already linked to another user account.' });
    }

    const resolvedRoles = [...new Set(selectedRoles)];
    const resolvedActiveRole = activeRole || resolvedRoles[0] || user.activeRole || user.role || 'Employee';
    const previousValues = {
      userId: user._id,
      username: user.username,
      employeeId: user.employeeId,
      roles: [...(user.roles || [])],
      activeRole: user.activeRole,
      status: user.status,
    };

    user.username = normalizedUsername;
    user.employeeId = normalizedEmployeeId;
    user.name = employee.fullName;
    user.email = normalizedEmail;
    user.department = employee.department;
    user.departmentId = employee.departmentId || user.departmentId || null;
    user.roles = resolvedRoles;
    user.role = resolvedActiveRole;
    user.activeRole = resolvedActiveRole;
    user.status = status || user.status || 'Active';

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    await recordAuditLog({
      req,
      user: req.user,
      action: 'UPDATE_USER',
      module: 'Users',
      description: `Updated user details for ${user.name}.`,
      oldValues: previousValues,
      newValues: {
        userId: user._id,
        username: normalizedUsername,
        employeeId: normalizedEmployeeId,
        roles: resolvedRoles,
        activeRole: resolvedActiveRole,
        status: user.status,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      user: {
        id: user._id,
        username: user.username,
        employeeId: user.employeeId,
        roles: user.roles,
        activeRole: user.activeRole,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Error in updateUser:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating user.' });
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

export { getUsers, getUser, addUser, updateUser, resetUserPassword };
