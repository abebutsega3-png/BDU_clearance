import AuditLog from '../models/AuditLog.js';
import Clearance from '../models/clearance.js';
import Employee from '../models/employee.js';
import Asset from '../models/propertyAsset.js';
import { getTransportStatus, transportReviewableFilter } from '../utils/transportClearance.js';

const decisionActions = ['APPROVE_CLEARANCE', 'RETURN_CLEARANCE'];
const vehicleAssetQuery = {
  $or: [
    { assetName: { $regex: '\\b(vehicle|transport|buses?|pickup|sedan|cars?|vans?|trucks?)\\b', $options: 'i' } },
    { assetType: { $regex: '\\b(vehicle|transport|buses?|pickup|sedan|cars?|vans?|trucks?)\\b', $options: 'i' } },
    { category: { $regex: '\\b(vehicle|transport|buses?|pickup|sedan|cars?|vans?|trucks?)\\b', $options: 'i' } },
  ],
};

const isTransportOfficer = (user) => {
  const role = String(user?.role || '').trim().toLowerCase();
  return role.includes('transport') && role.includes('officer');
};

const dateStart = (value) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateEnd = (value) => {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getPeriodRange = ({ period, date, year, month }) => {
  if (period === 'daily') {
    const selectedDate = dateStart(date);
    if (!selectedDate) return null;
    const end = new Date(selectedDate);
    end.setUTCHours(23, 59, 59, 999);
    return { start: selectedDate, end };
  }

  if (period === 'monthly') {
    const selectedYear = Number(year);
    const selectedMonth = Number(month);
    if (!Number.isInteger(selectedYear) || selectedYear < 2000 || selectedYear > 2100 || !Number.isInteger(selectedMonth) || selectedMonth < 1 || selectedMonth > 12) return null;
    return {
      start: new Date(Date.UTC(selectedYear, selectedMonth - 1, 1)),
      end: new Date(Date.UTC(selectedYear, selectedMonth, 0, 23, 59, 59, 999)),
    };
  }

  if (period === 'yearly') {
    const selectedYear = Number(year);
    if (!Number.isInteger(selectedYear) || selectedYear < 2000 || selectedYear > 2100) return null;
    return {
      start: new Date(Date.UTC(selectedYear, 0, 1)),
      end: new Date(Date.UTC(selectedYear, 11, 31, 23, 59, 59, 999)),
    };
  }

  return null;
};

const departmentName = (request, employee) => {
  const department = request?.department && typeof request.department === 'object'
    ? request.department.departmentName || request.department.name
    : request?.department;
  return employee?.department || department || request?.employee?.department || 'N/A';
};

const employeeName = (request, employee) => {
  const embedded = request?.employee && typeof request.employee === 'object' ? request.employee : {};
  return employee?.fullName || embedded.fullName || embedded.name || request?.employeeName || 'Unknown Employee';
};

const vehicleNumber = (asset) => asset.vehicleNumber || asset.plateNumber || asset.assetId || '';

const dateInRange = (value, start, end) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date >= start && date <= end;
};

const getVehicleActivities = (assets, start, end, filters) => {
  let assignments = 0;
  let returns = 0;
  const employeeSearch = String(filters.employee || '').trim().toLowerCase();

  assets.forEach((asset) => {
    if (filters.department !== 'All' && asset.department !== filters.department) return;
    if (filters.vehicle !== 'All' && vehicleNumber(asset) !== filters.vehicle) return;
    if (employeeSearch && ![asset.employeeName, asset.employeeId].some((value) => String(value || '').toLowerCase().includes(employeeSearch))) return;

    const assignmentHistory = Array.isArray(asset.assignmentHistory) ? asset.assignmentHistory : [];
    if (assignmentHistory.length) {
      assignmentHistory.forEach((assignment) => {
        if (dateInRange(assignment.assignedDate, start, end)) assignments += 1;
        if (dateInRange(assignment.returnedDate, start, end)) returns += 1;
      });
      return;
    }

    const history = Array.isArray(asset.history) ? asset.history : [];
    let hasAssignmentHistory = false;
    history.forEach((entry) => {
      const action = String(entry.action || '').toLowerCase();
      if (/assign/.test(action) && dateInRange(entry.date, start, end)) {
        assignments += 1;
        hasAssignmentHistory = true;
      }
      if (/return/.test(action) && dateInRange(entry.date, start, end)) {
        returns += 1;
        hasAssignmentHistory = true;
      }
    });
    if (!hasAssignmentHistory) {
      if (dateInRange(asset.assignedDate, start, end)) assignments += 1;
      if (dateInRange(asset.returnDate, start, end)) returns += 1;
    }
  });

  return { assignments, returns };
};

const getTransportReport = async (req, res) => {
  if (!isTransportOfficer(req.user)) {
    return res.status(403).json({ success: false, message: 'Transport Officer access is required.' });
  }

  try {
    const {
      period = 'daily',
      date = '',
      year = new Date().getUTCFullYear(),
      month = new Date().getUTCMonth() + 1,
      fromDate = '',
      toDate = '',
      department = 'All',
      status = 'All',
      vehicle = 'All',
      employee = '',
    } = req.query;
    let range = getPeriodRange({ period, date, year, month });
    if (!range) return res.status(400).json({ success: false, message: 'Choose a valid report period.' });

    const customStart = fromDate ? dateStart(String(fromDate)) : null;
    const customEnd = toDate ? dateEnd(String(toDate)) : null;
    if ((fromDate && !customStart) || (toDate && !customEnd)) {
      return res.status(400).json({ success: false, message: 'Enter valid From Date and To Date values.' });
    }
    if (customStart && customStart > range.start) range.start = customStart;
    if (customEnd && customEnd < range.end) range.end = customEnd;
    if (range.start > range.end) {
      return res.status(400).json({ success: false, message: 'The custom dates do not overlap the selected report period.' });
    }
    if (!['All', 'Approved', 'Returned', 'Pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be All, Approved, Returned, or Pending.' });
    }

    const dateFilter = { $gte: range.start, $lte: range.end };
    const [createdRequests, auditEvents, assets] = await Promise.all([
      Clearance.find({
        $and: [transportReviewableFilter, { createdAt: dateFilter }],
      }).sort({ createdAt: -1 }).limit(5000).lean(),
      AuditLog.find({
        module: { $regex: '^Transport Clearance$', $options: 'i' },
        action: { $in: decisionActions },
        createdAt: dateFilter,
      }).sort({ createdAt: -1 }).limit(5000).lean(),
      Asset.find(vehicleAssetQuery)
        .select('assetId vehicleNumber plateNumber employeeId employeeName department assignedDate returnDate assignmentHistory history')
        .lean(),
    ]);

    const allRequestIds = [...new Set([
      ...createdRequests.map((request) => request.requestId),
      ...auditEvents.map((event) => event.newValues?.requestId),
    ].filter(Boolean))];
    const eventRequests = allRequestIds.length
      ? await Clearance.find({ $and: [transportReviewableFilter, { requestId: { $in: allRequestIds } }] }).lean()
      : [];
    const requestById = new Map([...createdRequests, ...eventRequests].map((request) => [request.requestId, request]));
    const employeeIds = [...new Set([...requestById.values()].map((request) => request.employeeId).filter(Boolean))];
    const employeeRecords = employeeIds.length
      ? await Employee.find({ employeeId: { $in: employeeIds } }).select('employeeId fullName department position').lean()
      : [];
    const employeeById = new Map(employeeRecords.map((employeeRecord) => [employeeRecord.employeeId, employeeRecord]));
    const assetsByEmployee = new Map();
    assets.forEach((asset) => {
      const current = assetsByEmployee.get(asset.employeeId) || [];
      current.push(asset);
      assetsByEmployee.set(asset.employeeId, current);
    });

    const matchesDimensions = (request) => {
      const employeeRecord = employeeById.get(request.employeeId);
      const name = employeeName(request, employeeRecord);
      const id = request.employeeId || request.employee?.employeeId || '';
      const departmentValue = departmentName(request, employeeRecord);
      const requestVehicles = assetsByEmployee.get(id) || [];
      const employeeTerm = String(employee).trim().toLowerCase();
      const matchesDepartment = department === 'All' || departmentValue === department;
      const matchesEmployee = !employeeTerm || [name, id].some((value) => String(value || '').toLowerCase().includes(employeeTerm));
      const matchesVehicle = vehicle === 'All' || requestVehicles.some((asset) => vehicleNumber(asset) === vehicle);
      return matchesDepartment && matchesEmployee && matchesVehicle;
    };

    const pendingRecords = createdRequests.filter((request) => {
      const currentStatus = getTransportStatus(request);
      return ['Pending', 'Under Review'].includes(currentStatus)
        && (status === 'All' || status === 'Pending')
        && matchesDimensions(request);
    }).map((request) => {
      const employeeRecord = employeeById.get(request.employeeId);
      const id = request.employeeId || '';
      return {
        requestId: request.requestId,
        employeeId: id || 'N/A',
        employeeName: employeeName(request, employeeRecord),
        department: departmentName(request, employeeRecord),
        vehicleNumber: (assetsByEmployee.get(id) || []).map(vehicleNumber).filter(Boolean).join(', ') || 'N/A',
        requestDate: request.requestDate || request.submittedDate || request.createdAt,
        decisionDate: null,
        status: 'Pending',
      };
    });

    const decisionRecords = auditEvents.filter((event) => {
      const request = requestById.get(event.newValues?.requestId);
      if (!request || !matchesDimensions(request)) return false;
      const decisionStatus = event.action === 'APPROVE_CLEARANCE' ? 'Approved' : 'Returned';
      return status === 'All' || status === decisionStatus;
    }).map((event) => {
      const request = requestById.get(event.newValues.requestId);
      const employeeRecord = employeeById.get(request.employeeId);
      const id = request.employeeId || '';
      return {
        requestId: request.requestId,
        employeeId: id || 'N/A',
        employeeName: employeeName(request, employeeRecord),
        department: departmentName(request, employeeRecord),
        vehicleNumber: (assetsByEmployee.get(id) || []).map(vehicleNumber).filter(Boolean).join(', ') || 'N/A',
        requestDate: request.requestDate || request.submittedDate || request.createdAt,
        decisionDate: event.createdAt,
        status: event.action === 'APPROVE_CLEARANCE' ? 'Approved' : 'Returned',
        returnReason: event.newValues?.returnReason || '',
        remarks: event.newValues?.officerComment || '',
      };
    });

    const records = [...decisionRecords, ...pendingRecords].sort((left, right) =>
      new Date(right.decisionDate || right.requestDate || 0) - new Date(left.decisionDate || left.requestDate || 0)
    );
    const uniqueRequestIds = new Set(records.map((record) => record.requestId));
    const vehicleActivity = getVehicleActivities(assets, range.start, range.end, { department, vehicle, employee });

    const summary = {
      totalRequests: uniqueRequestIds.size,
      approved: decisionRecords.filter((record) => record.status === 'Approved').length,
      returned: decisionRecords.filter((record) => record.status === 'Returned').length,
      pending: pendingRecords.length,
      vehicleAssignments: vehicleActivity.assignments,
      vehicleReturns: vehicleActivity.returns,
    };

    const monthly = [];
    if (period === 'yearly') {
      const months = Array.from({ length: 12 }, (_, index) => ({
        month: new Date(Date.UTC(Number(year), index, 1)).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' }),
        requests: 0,
        approved: 0,
        returned: 0,
      }));
      createdRequests.filter(matchesDimensions).forEach((request) => {
        months[new Date(request.createdAt).getUTCMonth()].requests += 1;
      });
      auditEvents.forEach((event) => {
        const request = requestById.get(event.newValues?.requestId);
        if (!request || !matchesDimensions(request)) return;
        const monthIndex = new Date(event.createdAt).getUTCMonth();
        if (event.action === 'APPROVE_CLEARANCE') months[monthIndex].approved += 1;
        if (event.action === 'RETURN_CLEARANCE') months[monthIndex].returned += 1;
      });
      monthly.push(...months);
    }

    const filters = {
      departments: [...new Set([...createdRequests, ...eventRequests].map((request) => departmentName(request, employeeById.get(request.employeeId))).filter((value) => value && value !== 'N/A'))].sort(),
      vehicles: [...new Set(assets.map(vehicleNumber).filter(Boolean))].sort(),
    };
    const reportTitle = period === 'daily'
      ? `${range.start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} Daily Transport Report`
      : period === 'monthly'
        ? `${new Date(Date.UTC(Number(year), Number(month) - 1, 1)).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })} ${year} Monthly Transport Report`
        : `${year} Yearly Transport Report`;

    return res.status(200).json({
      success: true,
      title: reportTitle,
      period,
      range: { from: range.start, to: range.end },
      summary,
      records,
      monthly,
      filters,
    });
  } catch (error) {
    console.error('Error generating Transport report:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to generate Transport report.' });
  }
};

export { getTransportReport };