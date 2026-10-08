import mongoose from 'mongoose';
import SeparationType from '../models/HRSeparationType.js';

export const getAllSeparationTypes = async (req, res) => {
  try {
    const types = await SeparationType.find()
      .populate('requiredDepartments', 'departmentName')
      .sort({ name: 1 });
    res.status(200).json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createSeparationType = async (req, res) => {
  try {
    const newType = new SeparationType(req.body);
    const savedType = await newType.save();
    const populatedType = await savedType.populate('requiredDepartments', 'departmentName');
    res.status(201).json({ success: true, message: 'Separation type created successfully', data: populatedType });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updateSeparationType = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid separation type id.' });
    }
    const updated = await SeparationType.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).populate('requiredDepartments', 'departmentName');
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Separation type not found.' });
    }
    res.status(200).json({ success: true, message: 'Updated successfully', data: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid separation type id.' });
    }
    const type = await SeparationType.findById(id);
    if (!type) return res.status(404).json({ success: false, message: 'Separation type not found.' });

    type.isActive = !type.isActive;
    await type.save();
    res.status(200).json({ success: true, message: `Status changed to ${type.isActive ? 'Active' : 'Inactive'}`, data: type });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteSeparationType = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid separation type id.' });
    }
    const deleted = await SeparationType.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Separation type not found.' });
    }
    res.status(200).json({ success: true, message: 'Separation type deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};