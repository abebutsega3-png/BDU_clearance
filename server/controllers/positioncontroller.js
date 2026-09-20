import Position from '../models/position.js';
import mongoose from 'mongoose';
import { recordAuditLog } from './auditLogger.js';

const isValidPositionTitle = (value) => /^[\p{L}]+(?:[\s'-]+[\p{L}]+)*$/u.test(value);

const validatePosition = (payload) => {
  if (!payload?.title?.trim()) {
    return 'Position title is required.';
  }

  if (!isValidPositionTitle(payload.title.trim())) {
    return 'Position title may contain letters, spaces, apostrophes, and hyphens only.';
  }

  if (!payload?.department?.trim()) {
    return 'Department/Office is required.';
  }

  if (payload.status && !['Active', 'Inactive'].includes(payload.status)) {
    return 'Status must be Active or Inactive.';
  }

  return null;
};

export const createPosition = async (req, res) => {
  try {
    const error = validatePosition(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const position = await Position.create({
      title: req.body.title.trim(),
      code: req.body.code?.trim() || '',
      department: req.body.department.trim(),
      description: req.body.description?.trim() || '',
      status: req.body.status === 'Inactive' ? 'Inactive' : 'Active',
    });

    await recordAuditLog({
      req,
      user: req.user,
      action: 'CREATE_POSITION',
      module: 'System Settings',
      description: `Created position ${position.title} for ${position.department}.`,
      newValues: {
        positionId: position._id,
        title: position.title,
        department: position.department,
        status: position.status,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Position created successfully.',
      position,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'A position with this title already exists.' });
    }
    console.error('Error creating position:', err);
    return res.status(500).json({ success: false, message: 'Server error while creating position.' });
  }
};

export const getPositions = async (req, res) => {
  try {
    const positions = await Position.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      positions: positions.map((position) => ({
        id: position._id,
        title: position.title,
        code: position.code,
        department: position.department,
        description: position.description,
        status: position.status,
        createdAt: position.createdAt,
      })),
    });
  } catch (err) {
    console.error('Error fetching positions:', err);
    return res.status(500).json({ success: false, message: 'Server error while fetching positions.' });
  }
};

export const getPosition = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid position id.' });
    }

    const position = await Position.findById(req.params.id).lean();
    if (!position) {
      return res.status(404).json({ success: false, message: 'Position not found.' });
    }

    return res.status(200).json({ success: true, position });
  } catch (err) {
    console.error('Error fetching position:', err);
    return res.status(500).json({ success: false, message: 'Server error while fetching position.' });
  }
};

export const updatePosition = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid position id.' });
    }

    const error = validatePosition(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const position = await Position.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title.trim(),
        code: req.body.code?.trim() || '',
        department: req.body.department.trim(),
        description: req.body.description?.trim() || '',
        status: req.body.status === 'Inactive' ? 'Inactive' : 'Active',
        updatedAt: new Date(),
      },
      { returnDocument: 'after', runValidators: true }
    );

    if (!position) {
      return res.status(404).json({ success: false, message: 'Position not found.' });
    }

    await recordAuditLog({
      req,
      user: req.user,
      action: 'UPDATE_POSITION',
      module: 'System Settings',
      description: `Updated position ${position.title}.`,
      oldValues: { positionId: req.params.id },
      newValues: {
        positionId: position._id,
        title: position.title,
        department: position.department,
        status: position.status,
      },
    });

    return res.status(200).json({ success: true, message: 'Position updated successfully.', position });
  } catch (err) {
    console.error('Error updating position:', err);
    return res.status(500).json({ success: false, message: 'Server error while updating position.' });
  }
};

export const deletePosition = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid position id.' });
    }

    const position = await Position.findByIdAndDelete(req.params.id);
    if (!position) {
      return res.status(404).json({ success: false, message: 'Position not found.' });
    }

    await recordAuditLog({
      req,
      user: req.user,
      action: 'DELETE_POSITION',
      module: 'System Settings',
      description: `Deleted position ${position.title}.`,
      oldValues: { positionId: position._id, title: position.title, department: position.department },
    });

    return res.status(200).json({ success: true, message: 'Position deleted successfully.' });
  } catch (err) {
    console.error('Error deleting position:', err);
    return res.status(500).json({ success: false, message: 'Server error while deleting position.' });
  }
};
