import bcrypt from 'bcrypt';
import multer from 'multer';
import Employee from '../models/employee.js';
import Clearance from '../models/clearance.js';

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isValidFullName = (value) => /^[\p{L}]+(?:[\s'-]+[\p{L}]+)*$/u.test(value);
const isValidAddressName = (value) => /^[\p{L}]+(?:[\s'-]+[\p{L}]+)*$/u.test(value);
const isValidHouseNumber = (value) => /^[\p{L}\p{N}]+(?:[\s/#-]*[\p{L}\p{N}]+)*$/u.test(value);
const isValidGmailAddress = (value) => /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?@gmail\.com$/i.test(value);
const isValidPhoneNumber = (value) => /^(?:09\d{8}|\+2519\d{8})$/.test(value);
const normalizePhoneNumber = (value) => value.startsWith('+251') ? `0${value.slice(4)}` : value;
const isValidDateOfBirth = (value) => {
  if (!value) return true;

  const dateOfBirth = new Date(value);
  if (Number.isNaN(dateOfBirth.getTime())) return false;

  const today = new Date();
  const minimumDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  return dateOfBirth <= today && dateOfBirth <= minimumDate;
};
const isValidEmploymentDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const employmentDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(employmentDate.getTime())) return false;

  const [year, month, day] = value.split('-').map(Number);
  if (employmentDate.getFullYear() !== year || employmentDate.getMonth() !== month - 1 || employmentDate.getDate() !== day) return false;

  const today = new Date();
  const todayValue = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return employmentDate <= todayValue;
};

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

    if (!isValidFullName(body.fullName.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Full name may contain letters, spaces, apostrophes, and hyphens only.',
      });
    }

    for (const field of ['region', 'city', 'subCity', 'woreda', 'kebele', 'emergencyContactName']) {
      if (body[field]?.trim() && !isValidAddressName(body[field].trim())) {
        return res.status(400).json({
          success: false,
          message: `${field} may contain letters, spaces, apostrophes, and hyphens only.`,
        });
      }
    }

    if (body.houseNumber?.trim() && !isValidHouseNumber(body.houseNumber.trim())) {
      return res.status(400).json({
        success: false,
        message: 'House Number may contain letters, numbers, spaces, hyphens, slashes, and # only.',
      });
    }

    if (!isValidDateOfBirth(body.dateOfBirth)) {
          if (!isValidEmploymentDate(body.employmentDate.trim())) {
            return res.status(400).json({
              success: false,
              message: 'Employment Date must be a valid date and cannot be in the future.',
            });
          }
      return res.status(400).json({
        success: false,
        message: 'Date of Birth must be valid and the employee must be at least 18 years old.',
      });
    }

    if (!isValidGmailAddress(body.email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Email address must use the format name@gmail.com or name123@gmail.com.',
      });
    }

    if (!isValidPhoneNumber(body.phone.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be 10 digits starting with 09, or use the +2519xxxxxxxx format.',
      });
    }

    if (body.alternativePhone?.trim() && !isValidPhoneNumber(body.alternativePhone.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Alternative phone number must be numeric and use the 09xxxxxxxx or +2519xxxxxxxx format.',
      });
    }

    if (body.emergencyPhone?.trim() && !isValidPhoneNumber(body.emergencyPhone.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Emergency contact phone number must be numeric and use the 09xxxxxxxx or +2519xxxxxxxx format.',
      });
    }

    if (body.alternativePhone?.trim() && normalizePhoneNumber(body.phone.trim()) === normalizePhoneNumber(body.alternativePhone.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Phone Number and Alternative Phone must be different numbers.',
      });
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
      phone: normalizePhoneNumber(body.phone.trim()),
      alternativePhone: body.alternativePhone?.trim() ? normalizePhoneNumber(body.alternativePhone.trim()) : '',
      emergencyPhone: body.emergencyPhone?.trim() ? normalizePhoneNumber(body.emergencyPhone.trim()) : '',
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
    if (updates.fullName !== undefined) {
      const normalizedFullName = String(updates.fullName).trim();
      if (!isValidFullName(normalizedFullName)) {
        return res.status(400).json({
          success: false,
          message: 'Full name may contain letters, spaces, apostrophes, and hyphens only.',
        });
      }
      updates.fullName = normalizedFullName;
    }
    for (const field of ['region', 'city', 'subCity', 'woreda', 'kebele', 'emergencyContactName']) {
      if (updates[field] !== undefined && String(updates[field]).trim() && !isValidAddressName(String(updates[field]).trim())) {
        return res.status(400).json({
          success: false,
          message: `${field} may contain letters, spaces, apostrophes, and hyphens only.`,
        });
      }
    }
    if (updates.houseNumber !== undefined && String(updates.houseNumber).trim() && !isValidHouseNumber(String(updates.houseNumber).trim())) {
      return res.status(400).json({
        success: false,
        message: 'House Number may contain letters, numbers, spaces, hyphens, slashes, and # only.',
      });
    }
    if (updates.dateOfBirth !== undefined && !isValidDateOfBirth(updates.dateOfBirth)) {
      return res.status(400).json({
        success: false,
        message: 'Date of Birth must be valid and the employee must be at least 18 years old.',
      });
    }
    for (const field of ['phone', 'alternativePhone', 'emergencyPhone']) {
      if (updates[field] !== undefined && String(updates[field]).trim()) {
        const value = String(updates[field]).trim();
        if (!isValidPhoneNumber(value)) {
          return res.status(400).json({
            success: false,
            message: `${field === 'phone' ? 'Phone' : field === 'alternativePhone' ? 'Alternative phone' : 'Emergency contact phone'} number must be numeric and use the 09xxxxxxxx or +2519xxxxxxxx format.`,
          });
        }
        updates[field] = normalizePhoneNumber(value);
      }
    }
    if (updates.phone && updates.alternativePhone && updates.phone === updates.alternativePhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone Number and Alternative Phone must be different numbers.',
      });
    }
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
