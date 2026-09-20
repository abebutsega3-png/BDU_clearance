import bcrypt from 'bcrypt';
import multer from 'multer';
import Employee from '../models/employee.js';
import Clearance from '../models/clearance.js';

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

const requiredFields = [
  'employeeId', 'fullName', 'gender', 'nationality',
  'phone', 'email', 'employmentType', 'employmentDate', 'status', 'position',
  'department', 'campus', 'educationLevel',
];

const addEmployee = async (req, res) => {
  try {
    const body = req.body || {};
    const missingField = requiredFields.find((field) => !String(body[field] ?? '').trim());
    if (missingField) {
      return res.status(400).json({ success: false, message: `${missingField} is required.` });
    }

    if (body.password && body.password !== body.confirmPassword) {
      return res.status(400).json({ success: false, message: 'Password and confirm password must match.' });
    }

    const duplicateQuery = [{ employeeId: body.employeeId.trim() }];
    if (body.email?.trim()) duplicateQuery.push({ email: body.email.trim().toLowerCase() });
    const duplicate = await Employee.findOne({ $or: duplicateQuery }).select('_id employeeId email');
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'Employee ID or email already exists.' });
    }

    const employeeData = {
      ...body,
      fullName: body.fullName.trim(),
      employeeId: body.employeeId.trim(),
      hireDate: body.employmentDate,
      qualification: body.educationLevel,
      email: body.email?.trim().toLowerCase() || '',
      createdBy: req.user?._id || null,
      photo: req.file?.originalname || '',
    };
    delete employeeData.confirmPassword;

    const employee = await Employee.create(employeeData);
    return res.status(201).json({
      success: true,
      message: 'Employee added successfully.',
      employee: { id: employee._id, employeeId: employee.employeeId, fullName: employee.fullName },
    });
  } catch (error) {
    console.error('Error in addEmployee:', error);
    return res.status(500).json({ success: false, message: 'Server error while adding employee.' });
  }
};

const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({}).select('-password').sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, employees });
  } catch (error) {
    console.error('Error in getEmployees:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching employees.' });
  }
};

const getDepartmentEmployees = async (req, res) => {
  try {
    const department = req.user?.department?.trim();
    if (!department) return res.status(400).json({ success: false, message: 'Your account is not assigned to a department.' });

    const departmentRegex = { $regex: `^${escapeRegExp(department)}$`, $options: 'i' };
    const employees = await Employee.find({ department: departmentRegex }).select('-password').sort({ fullName: 1 }).lean();
    const clearances = await Clearance.find({ department: departmentRegex, employeeId: { $in: employees.map((employee) => employee.employeeId) } })
      .sort({ createdAt: -1 }).lean();
    const latestByEmployee = new Map();
    clearances.forEach((clearance) => {
      if (!latestByEmployee.has(clearance.employeeId)) latestByEmployee.set(clearance.employeeId, clearance);
    });

    return res.status(200).json({
      success: true,
      department,
      departmentHead: req.user.name,
      employees: employees.map((employee) => ({
        ...employee,
        clearance: latestByEmployee.get(employee.employeeId) || null,
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error while fetching department employees.' });
  }
};

const getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).select('-password').lean();
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found.' });
    return res.status(200).json({ success: true, employee });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Invalid employee id.' });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.confirmPassword;
    if (updates.password) updates.password = await bcrypt.hash(updates.password, 10);
    const employee = await Employee.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after', runValidators: true }).select('-password').lean();
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found.' });
    return res.status(200).json({ success: true, message: 'Employee updated successfully.', employee });
  } catch (error) {
    console.error('Error in updateEmployee:', error);
    return res.status(400).json({ success: false, message: 'Unable to update employee.' });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found.' });
    return res.status(200).json({ success: true, message: 'Employee deleted successfully.' });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Invalid employee id.' });
  }
};

export { addEmployee, getEmployees, getDepartmentEmployees, getEmployee, updateEmployee, deleteEmployee, upload };
