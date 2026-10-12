import AcademicRecord from '../models/registerAcademicRecord.js';

const canManageAcademicRecords = (user) => {
  const assignedRoles = [
    user?.role,
    user?.activeRole,
    ...(Array.isArray(user?.roles) ? user.roles : []),
  ];
  const normalizedRoles = assignedRoles.map((role) => String(role?.name || role || '')
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[\/_&-]+/g, ' ')
    .replace(/\s+/g, ' '));

  return normalizedRoles.some((role) => [
    'registrar officer',
    'registrar office',
    'registrar',
    'admin',
    'administrator',
    'system admin',
    'system administrator',
  ].includes(role));
};

export const requireAcademicRecordsAccess = (req, res, next) => {
  if (!canManageAcademicRecords(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Registrar Officer access is required.',
    });
  }
  return next();
};

export const getAcademicRecords = async (_req, res) => {
  try {
    const [records, totalEmployees, verifiedRecords, pendingVerifications, returnedMissing] = await Promise.all([
      AcademicRecord.find().sort({ createdAt: -1 }).lean(),
      AcademicRecord.countDocuments(),
      AcademicRecord.countDocuments({ documentStatus: 'Verified' }),
      AcademicRecord.countDocuments({ documentStatus: 'Pending' }),
      AcademicRecord.countDocuments({ documentStatus: { $in: ['Returned', 'Missing Document'] } }),
    ]);

    return res.status(200).json({
      success: true,
      records,
      overview: { totalEmployees, verifiedRecords, pendingVerifications, returnedMissing },
    });
  } catch (error) {
    console.error('Unable to load academic records:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to load academic records.',
    });
  }
};

export const addAcademicRecord = async (req, res) => {
  try {
    const {
      employeeId,
      fullName,
      department,
      degreeLevel,
      gradYear,
      gradInstitution,
      documentStatus,
      gradeSubmissionStatus,
    } = req.body;

    if (!employeeId || !fullName || !department || !degreeLevel || !gradYear || !gradInstitution) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, name, department, degree, graduation year, and institution are required.',
      });
    }

    const record = await AcademicRecord.create({
      employeeId: String(employeeId).trim(),
      fullName: String(fullName).trim(),
      department: String(department).trim(),
      degreeLevel,
      gradYear: Number(gradYear),
      gradInstitution: String(gradInstitution).trim(),
      documentStatus,
      gradeSubmissionStatus,
    });

    return res.status(201).json({
      success: true,
      message: 'Academic record added successfully.',
      data: record,
    });
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Unable to add academic record:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to add academic record.',
    });
  }
};
