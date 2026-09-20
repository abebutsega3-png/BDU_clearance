import mongoose from 'mongoose';
import ClearanceStep from '../models/ClearanceStep.js';

const formatStep = (step) => ({
  id: step._id,
  name: step.name,
  department: step.department?.name || step.department?.departmentName || step.department,
  departmentId: step.department?._id || step.department,
  type: step.type,
  order: step.order,
  required: step.required,
  status: step.status,
  description: step.description,
  role: step.role?.name || step.role,
  roleId: step.role?._id || step.role,
  approver: step.approver,
  allowRejection: step.allowRejection,
  allowComments: step.allowComments,
});

export const getClearanceSteps = async (_req, res) => {
  try {
    const steps = await ClearanceStep.find()
      .populate('department', 'name departmentName')
      .populate('role', 'name')
      .sort({ order: 1 })
      .lean();
    return res.json({ success: true, steps: steps.map(formatStep) });
  } catch (error) {
    console.error('Error fetching clearance steps:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching clearance steps.' });
  }
};

export const createClearanceStep = async (req, res) => {
  try {
    const body = req.body || {};
    const missingField = ['name', 'department', 'type', 'order', 'role']
      .find((field) => !String(body[field] ?? '').trim());
    if (missingField) return res.status(400).json({ success: false, message: `${missingField} is required.` });

    if (!mongoose.Types.ObjectId.isValid(body.department) || !mongoose.Types.ObjectId.isValid(body.role)) {
      return res.status(400).json({ success: false, message: 'A valid department and role are required.' });
    }

    const order = Number(body.order);
    if (!Number.isInteger(order) || order < 1) {
      return res.status(400).json({ success: false, message: 'Step order must be a positive whole number.' });
    }

    const step = await ClearanceStep.create({
      name: body.name.trim(), department: body.department, type: body.type.trim(), order,
      required: body.required === 'No' ? 'No' : 'Yes', status: body.status === 'Inactive' ? 'Inactive' : 'Active',
      description: body.description?.trim() || '', role: body.role, approver: body.approver?.trim() || '',
      allowRejection: body.allowRejection === 'No' ? 'No' : 'Yes', allowComments: body.allowComments === 'No' ? 'No' : 'Yes',
    });
    const populatedStep = await step.populate([
      { path: 'department', select: 'name departmentName' }, { path: 'role', select: 'name' },
    ]);
    return res.status(201).json({ success: true, message: 'Clearance step added successfully.', step: formatStep(populatedStep) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'A clearance step with this name or order already exists.' });
    console.error('Error adding clearance step:', error);
    return res.status(500).json({ success: false, message: 'Server error while adding clearance step.' });
  }
};