import ClearanceReport from '../models/Report.js';
import Clearance from '../models/clearance.js';
import DepartmentReport from '../models/departmentreport.js';

const getRole = (user) => String(user?.role?.name || user?.role || '').toLowerCase();

export const submitDepartmentReport = async (req, res) => {
  try {
    if (!['department head', 'departmenthead'].includes(getRole(req.user))) return res.status(403).json({ success: false, message: 'Only Department Heads can submit reports.' });
    const department = req.user?.department?.trim();
    if (!department) return res.status(400).json({ success: false, message: 'Your account is not assigned to a department.' });
    const { period, summary, rows } = req.body || {};
    if (!period) return res.status(400).json({ success: false, message: 'Report period is required.' });
    const report = await DepartmentReport.create({ department, period, submittedBy: req.user.name || 'Department Head', submittedById: req.user._id, summary: summary || {}, rows: Array.isArray(rows) ? rows : [] });
    return res.status(201).json({ success: true, report });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getDepartmentReports = async (req, res) => {
  try {
    if (!['hr officer', 'admin'].includes(getRole(req.user))) return res.status(403).json({ success: false, message: 'Only HR Officers can view department reports.' });
    const reports = await DepartmentReport.find({}).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, reports });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 1. Get Aggregated Summary Statistics
export const getReportSummary = async (req, res) => {
  try {
    const totalRequests = await ClearanceReport.countDocuments();
    const completed = await ClearanceReport.countDocuments({ status: 'Completed' });
    const pending = await ClearanceReport.countDocuments({ status: 'Pending' });
    const inProgress = await ClearanceReport.countDocuments({ status: 'In Progress' });
    const rejected = await ClearanceReport.countDocuments({ status: 'Rejected' });
    const returned = await ClearanceReport.countDocuments({ status: 'Returned' });

    // Grouping by Reason
    const byReason = await ClearanceReport.aggregate([
      { $group: { _id: '$reason', count: { $sum: 1 } } }
    ]);

    // Grouping by Campus
    const byCampus = await ClearanceReport.aggregate([
      { $group: { _id: '$campus', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      summary: {
        totalEmployees: 1245, // Static/Dynamic based on Employee Collection
        activeEmployees: 1180,
        totalRequests,
        completed,
        pending,
        inProgress,
        rejected,
        returned
      },
      charts: {
        byReason,
        byCampus
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. Filter Recent Clearance Requests
export const getFilteredReports = async (req, res) => {
  try {
    const { fromDate, toDate, campus, department, reportType } = req.query;
    let query = {};

    if (campus && campus !== 'All Campuses') query.campus = campus;
    if (department && department !== 'All Departments') query.department = department;
    if (reportType && reportType !== 'All Types') query.status = reportType;
    if (fromDate && toDate) {
      query.requestedDate = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate)
      };
    }

    const reports = await ClearanceReport.find(query).sort({ requestedDate: -1 }).limit(10);
    res.status(200).json({ success: true, data: reports, reports });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const HR_OFFICES = ['Department Head', 'Finance Office', 'Property / Asset Office', 'ICT Office', 'Library'];
const completedStatuses = new Set(['approved', 'completed', 'cleared']);

const employeeValue = (clearance, key, fallback = '-') => {
  const employee = clearance.employee && typeof clearance.employee === 'object' ? clearance.employee : {};
  return clearance[key] || employee[key] || fallback;
};

const officeName = (step) => String(step?.office || step?.name || step?.department || '').trim().toLowerCase();
const normalizeOfficeKey = (value) => String(value || '').trim().toLowerCase();
const officeAliases = {
  'department head': ['department head', 'department'],
  'finance office': ['finance office', 'finance'],
  'property / asset office': ['property / asset office', 'property office', 'property', 'asset'],
  'ict office': ['ict office', 'ict', 'ict center'],
  'library': ['library office', 'library'],
  'library office': ['library office', 'library']
};

const officeProgress = (clearance) => {
  const workflow = [
    ...(Array.isArray(clearance.workflow) ? clearance.workflow : []),
    ...(Array.isArray(clearance.departmentClearances) ? clearance.departmentClearances : [])
  ];
  const statusFields = {
    'Finance Office': clearance.financeStatus,
    'ICT Office': clearance.ictStatus,
    'Property / Asset Office': clearance.propertyStatus,
    'Department Head': clearance.departmentStatus,
    Library: clearance.libraryStatus
  };

  return HR_OFFICES.map((office) => {
    const aliasKey = normalizeOfficeKey(office);
    const aliases = officeAliases[aliasKey] || officeAliases[aliasKey.replace(/\s+/g, ' ')] || [];
    const matches = workflow.filter((step) => aliases.some((alias) => officeName(step).includes(alias)));
    const step = matches[matches.length - 1] || {};
    const status = statusFields[office] || step.status || 'Pending';
    return { office, status };
  });
};

const reportRow = (clearance) => {
  const offices = officeProgress(clearance);
  const completedOffices = offices.filter((office) => completedStatuses.has(String(office.status).toLowerCase())).length;
  const currentOffice = offices.find((office) => !completedStatuses.has(String(office.status).toLowerCase()))?.office || 'Final HR Clearance';
  const returnedStep = [...(clearance.workflow || []), ...(clearance.departmentClearances || [])]
    .reverse().find((step) => String(step.status || '').toLowerCase() === 'returned');
  const requestDate = clearance.requestDate || clearance.createdAt;
  return {
    id: clearance._id,
    requestId: clearance.requestId || clearance._id,
    employeeName: employeeValue(clearance, 'employeeName', 'Unknown employee'),
    employeeId: employeeValue(clearance, 'employeeId'),
    department: typeof clearance.department === 'object' ? clearance.department.name : employeeValue(clearance, 'department'),
    campus: employeeValue(clearance, 'campus'),
    clearanceType: clearance.clearanceType || clearance.reason || 'Resignation',
    requestDate,
    lastWorkingDate: clearance.lastWorkingDate || '-',
    status: clearance.status || 'Pending',
    currentOffice,
    progress: `${completedOffices}/${HR_OFFICES.length}`,
    returnedBy: returnedStep?.performedBy || returnedStep?.returnedBy || '-',
    returnedOffice: returnedStep?.office || currentOffice,
    returnedDate: returnedStep?.timestamp || returnedStep?.updatedAt || '-',
    returnReason: returnedStep?.returnReason || returnedStep?.remarks || clearance.libraryReturnReason || clearance.hrRemarks || '-',
    completionDate: clearance.status === 'Completed' ? clearance.updatedAt : '-',
    finalHRApprovedBy: clearance.finalHRApproval ? (clearance.finalHRApprovedBy || 'HR Officer') : '-',
    certificateStatus: clearance.certificate ? 'Generated' : 'Not generated'
  };
};

export const getHRClearanceReports = async (req, res) => {
  try {
    const { fromDate, toDate, campus, department, status, clearanceType, reportType } = req.query;
    const query = {};
    if (status && status !== 'All Statuses') query.status = status;
    if (clearanceType && clearanceType !== 'All Types') {
      query.$and = [{ $or: [{ clearanceType }, { reason: clearanceType }] }];
    }
    if (campus && campus !== 'All Campuses') query.$or = [{ campus }, { 'employee.campus': campus }];
    if (department && department !== 'All Departments') {
      query.$and = [
        ...(query.$and || []),
        { $or: [{ department }, { 'department.name': department }, { 'employee.department': department }] }
      ];
    }
    if (fromDate || toDate) {
      const requestDateQuery = {};
      const createdAtQuery = {};
      if (fromDate) {
        requestDateQuery.$gte = fromDate;
        createdAtQuery.$gte = new Date(`${fromDate}T00:00:00.000Z`);
      }
      if (toDate) {
        requestDateQuery.$lte = `${toDate}T23:59:59.999Z`;
        createdAtQuery.$lte = new Date(`${toDate}T23:59:59.999Z`);
      }
      query.$and = [
        ...(query.$and || []),
        { $or: [{ requestDate: requestDateQuery }, { createdAt: createdAtQuery }] }
      ];
    }
    const clearances = await Clearance.find(query).sort({ createdAt: -1 }).lean();
    const rows = clearances.map(reportRow);
    const visibleRows = reportType === 'Returned'
      ? rows.filter((row) => row.status === 'Returned')
      : reportType === 'Completed'
        ? rows.filter((row) => row.status === 'Completed')
        : rows;
    const summary = visibleRows.reduce((counts, row) => {
      const key = row.status === 'In Progress' ? 'inProgress' : row.status.toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
      counts.total += 1;
      return counts;
    }, { total: 0, pending: 0, inProgress: 0, returned: 0, completed: 0, cancelled: 0 });
    return res.json({ success: true, reportType: reportType || 'Summary', summary, rows: visibleRows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};