import Role from '../models/role.js';
import mongoose from 'mongoose';

const isAdmin = (req) => req.user?.role?.toLowerCase() === 'admin' || req.user?.role?.toLowerCase() === 'administrator';

const validatePermissions = (permissions) => {
  if (!Array.isArray(permissions)) return [];
  return permissions.filter((item) => item?.module && Array.isArray(item.actions)).map((item) => ({
    module: item.module,
    actions: item.actions.filter((action) => ['view', 'create', 'edit', 'delete', 'submit', 'approve', 'reject', 'cancel', 'export'].includes(action)),
  }));
};

export const getRoles = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'Admin access required.' });
  const roles = await Role.find().sort({ createdAt: -1 }).lean();
  return res.json({ success: true, roles });
};

export const getRole = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'Admin access required.' });
  const role = await Role.findById(req.params.id).lean();
  if (!role) return res.status(404).json({ success: false, message: 'Role not found.' });
  return res.json({ success: true, role });
};

export const createRole = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'Admin access required.' });
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ success: false, message: 'Database unavailable. Please start MongoDB and try again.' });
  }
  const { name, description, status, permissions } = req.body;
  if (!name?.trim()) return res.status(400).json({ success: false, message: 'Role name is required.' });
  try {
    const role = await Role.create({ name: name.trim(), description: description?.trim() || '', isActive: status !== 'Inactive', permissions: validatePermissions(permissions) });
    return res.status(201).json({ success: true, message: 'Role created successfully.', role });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'A role with this name already exists.' });
    console.error('Unable to create role:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while creating role.' });
  }
};

export const updateRole = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'Admin access required.' });
  const { name, description, status, permissions } = req.body;
  const role = await Role.findByIdAndUpdate(req.params.id, { name: name?.trim(), description: description?.trim() || '', isActive: status !== 'Inactive', permissions: validatePermissions(permissions) }, { returnDocument: 'after', runValidators: true });
  if (!role) return res.status(404).json({ success: false, message: 'Role not found.' });
  return res.json({ success: true, message: 'Role updated successfully.', role });
};

export const deleteRole = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'Admin access required.' });
  const role = await Role.findByIdAndDelete(req.params.id);
  if (!role) return res.status(404).json({ success: false, message: 'Role not found.' });
  return res.json({ success: true, message: 'Role deleted successfully.' });
};