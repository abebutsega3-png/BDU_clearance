import Department from '../models/department.js';
import mongoose from 'mongoose';
import { recordAuditLog } from './auditLogger.js';

const isValidDepartmentName = (value) => /^[\p{L}]+(?:[\s'-]+[\p{L}]+)*$/u.test(value);

const addDepartment = async (req, res) => {
  try {
    const {
      departmentName,
      departmentCode,
      description,
      departmentType,
      campus,
      collegeInstitute,
      building,
      office,
      departmentHead,
      delegatedAssistant,
      isApprovingDepartment,
      status,
    } = req.body;

    if (
      !departmentName?.trim() ||
      !departmentCode?.trim() ||
      !departmentType ||
      !status
    ) {
      return res.status(400).json({
        success: false,
        message: 'Department name, code, type, and status are required.',
      });
    }

    const normalizedName = String(departmentName).trim();
    const normalizedCode = String(departmentCode).trim();

    if (!isValidDepartmentName(normalizedName)) {
      return res.status(400).json({
        success: false,
        message: 'Department name may contain letters, spaces, apostrophes, and hyphens only.',
      });
    }

    const existingCode = await Department.findOne({ departmentCode: normalizedCode });
    const existingName = await Department.findOne({ departmentName: normalizedName });

    if (existingCode || existingName) {
      return res.status(409).json({
        success: false,
        message: existingCode
          ? `Department code "${normalizedCode}" already exists.`
          : `Department name "${normalizedName}" already exists.`,
      });
    }

    const newDepartment = new Department({
      departmentName: normalizedName,
      departmentCode: normalizedCode,
      description: description || '',
      departmentType,
      campus,
      collegeInstitute: collegeInstitute || '',
      building: building || '',
      office: office || '',
      departmentHead: departmentHead?.trim() || '',
      delegatedAssistant: delegatedAssistant || '',
      status: status === 'Inactive' ? 'Inactive' : 'Active',
      isApprovingDepartment: status ? status === 'Active' : Boolean(isApprovingDepartment),
    });

    await newDepartment.save();

    await recordAuditLog({
      req,
      user: req.user,
      action: 'CREATE_DEPARTMENT',
      module: 'Organization',
      description: `Created department ${newDepartment.departmentName}.`,
      newValues: {
        departmentId: newDepartment._id,
        departmentName: newDepartment.departmentName,
        departmentCode: newDepartment.departmentCode,
        status: newDepartment.status,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Department added successfully',
    });
  } catch (error) {
    console.error('Error in addDepartment:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while adding department',
    });
  }
};

const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({}).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      departments: departments.map((department) => ({
        id: department._id,
        name: department.departmentName,
        code: department.departmentCode,
        type: department.departmentType,
        campus: department.campus,
        head: department.departmentHead,
        role: department.departmentType,
        status: department.status || (department.isApprovingDepartment ? 'Active' : 'Inactive'),
      })),
    });
  } catch (error) {
    console.error('Error in getDepartments:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching departments',
    });
  }
};

const getDepartment = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid department id.' });
    }

    const department = await Department.findById(req.params.id).lean();
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    return res.status(200).json({ success: true, department });
  } catch (error) {
    console.error('Error in getDepartment:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching department.' });
  }
};

const updateDepartment = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid department id.' });
    }

    const { departmentName, departmentCode, departmentType, campus, departmentHead } = req.body;
    if (!departmentName?.trim() || !departmentCode?.trim() || !departmentType || !campus || !departmentHead?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Department name, code, type, campus, and head are required.',
      });
    }

    const currentDepartment = await Department.findById(req.params.id).select('_id').lean();
    if (!currentDepartment) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    const normalizedName = departmentName.trim();
    const normalizedCode = departmentCode.trim();

    if (!isValidDepartmentName(normalizedName)) {
      return res.status(400).json({
        success: false,
        message: 'Department name may contain letters, spaces, apostrophes, and hyphens only.',
      });
    }

    const escapedName = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedCode = normalizedCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const duplicate = await Department.findOne({
      _id: { $ne: currentDepartment._id },
      $or: [
        { departmentCode: { $regex: `^${escapedCode}$`, $options: 'i' } },
        { departmentName: { $regex: `^${escapedName}$`, $options: 'i' } },
      ],
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'Another department already uses this name or code.',
      });
    }

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      {
        departmentName: normalizedName,
        departmentCode: normalizedCode,
        description: req.body.description || '',
        departmentType,
        campus,
        collegeInstitute: req.body.collegeInstitute || '',
        building: req.body.building || '',
        office: req.body.office || '',
        departmentHead: departmentHead.trim(),
        delegatedAssistant: req.body.delegatedAssistant || '',
        status: req.body.status === 'Inactive' ? 'Inactive' : 'Active',
        isApprovingDepartment: req.body.status
          ? req.body.status === 'Active'
          : Boolean(req.body.isApprovingDepartment),
        updatedAt: new Date(),
      },
      { returnDocument: 'after', runValidators: true }
    ).lean();

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    await recordAuditLog({
      req,
      user: req.user,
      action: 'UPDATE_DEPARTMENT',
      module: 'Organization',
      description: `Updated department ${department.departmentName}.`,
      oldValues: { departmentId: req.params.id },
      newValues: {
        departmentId: department._id,
        departmentName: department.departmentName,
        departmentCode: department.departmentCode,
        campus: department.campus,
      },
    });

    return res.status(200).json({ success: true, department, message: 'Department updated successfully.' });
  } catch (error) {
    console.error('Error in updateDepartment:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating department.' });
  }
};

export { addDepartment, getDepartments, getDepartment, updateDepartment };
