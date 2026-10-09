import AuditLog from '../models/AuditLog.js';
import Clearance from '../models/clearance.js';
import Employee from '../models/employee.js';
import Asset from '../models/propertyAsset.js';
import { getTransportStatus, transportReviewableFilter } from '../utils/transportClearance.js';

const decisionActions = ['APPROVE_CLEARANCE', 'RETURN_CLEARANCE'];
const vehicleAssetQuery = {
  $or: [
    { assetName: { $regex: '\\b(vehicle|transport|buses?|pick[- ]?up|sedan|suvs?|cars?|vans?|trucks?)\\b', $options: 'i' } },
    { assetType: { $regex: '\\b(vehicle|transport|buses?|pick[- ]?up|sedan|suvs?|cars?|vans?|trucks?)\\b', $options: 'i' } },
    { category: { $regex: '\\b(vehicle|transport|buses?|pick[- ]?up|sedan|suvs?|cars?|vans?|trucks?)\\b', $options: 'i' } },
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

const getPeriodRange = ({ period, date, year, month, fromDate, toDate }) => {
  if (period === 'custom') {
    const start = dateStart(fromDate);
    const end = dateEnd(toDate);
    return start && end && start <= end ? { start, end } : null;
  }

  if (period === 'today' || period === 'daily') {
    const selectedDate = dateStart(date);
    if (!selectedDate) return null;
    const end = new Date(selectedDate);
    end.setUTCHours(23, 59, 59, 999);
    return { start: selectedDate, end };
  }

  if (period === 'week') {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const day = start.getUTCDay();
    start.setUTCDate(start.getUTCDate() - ((day + 6) % 7));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    end.setUTCMilliseconds(-1);
    return { start, end };
  }

  if (period === 'month') period = 'monthly';
  if (period === 'year') period = 'yearly';

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

const normalizeAssetStatus = (value) => {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'returned') return 'Available';
  if (['assigned', 'outstanding', 'in use', 'unreturned', 'overdue'].includes(status)) return 'Assigned';
  if (['under maintenance', 'maintenance', 'repair', 'damaged'].includes(status)) return 'Under Maintenance';
  if (status === 'lost') return 'Lost';
  return 'Available';
};

const getDocumentStatus = (expiryDate, now = new Date()) => {
  if (!expiryDate) return 'Not Recorded';
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) return 'Not Recorded';
  const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / 86400000);
  if (daysRemaining < 0) return 'Expired';
  if (daysRemaining <= 30) return 'Expiring Soon';
  return 'Valid';
};

const getVehicleDocumentStatus = (asset, now = new Date()) => {
  const insurance = getDocumentStatus(asset.insuranceExpiryDate, now);
  const registration = getDocumentStatus(asset.registrationExpiryDate, now);
  const alerts = [insurance, registration];
  if (alerts.includes('Expired')) return 'Expired';
  if (alerts.includes('Expiring Soon')) return 'Expiring Soon';
  if (alerts.every((status) => status === 'Not Recorded')) return 'Not Recorded';
  return 'Valid';
};

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
      period = 'today',
      reportType = 'summary',
      date = '',
      year = new Date().getUTCFullYear(),
      month = new Date().getUTCMonth() + 1,
      fromDate = '',
      toDate = '',
      department = 'All',
      status = 'All',
      vehicle = 'All',
      vehicleType = 'All',
      employee = '',
    } = req.query;
    const validReportTypes = ['summary', 'inventory', 'clearance', 'maintenance', 'assignment', 'insurance'];
    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({ success: false, message: 'Choose a valid Transport report.' });
    }
    let range = getPeriodRange({ period, date, year, month, fromDate, toDate });
    if (!range) return res.status(400).json({ success: false, message: 'Choose a valid report period.' });

    const customStart = period === 'custom' ? null : fromDate ? dateStart(String(fromDate)) : null;
    const customEnd = period === 'custom' ? null : toDate ? dateEnd(String(toDate)) : null;
    if (period !== 'custom' && ((fromDate && !customStart) || (toDate && !customEnd))) {
      return res.status(400).json({ success: false, message: 'Enter valid From Date and To Date values.' });
    }
    if (customStart && customStart > range.start) range.start = customStart;
    if (customEnd && customEnd < range.end) range.end = customEnd;
    if (range.start > range.end) {
      return res.status(400).json({ success: false, message: 'The custom dates do not overlap the selected report period.' });
    }
    const validStatuses = ['All', 'Approved', 'Cleared', 'Returned', 'Pending', 'Available', 'Assigned', 'Under Maintenance', 'Lost', 'Expired', 'Expiring Soon', 'Valid', 'Not Recorded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Choose a valid status filter.' });
    }

    const dateFilter = { $gte: range.start, $lte: range.end };
    const [createdRequests, auditEvents, assets, openRequests] = await Promise.all([
      Clearance.find({
        $and: [transportReviewableFilter, { createdAt: dateFilter }],
      }).sort({ createdAt: -1 }).limit(5000).lean(),
      AuditLog.find({
        module: { $regex: '^Transport Clearance$', $options: 'i' },
        action: { $in: decisionActions },
        createdAt: dateFilter,
      }).sort({ createdAt: -1 }).limit(5000).lean(),
      Asset.find(vehicleAssetQuery)
        .select('assetId assetName assetType category vehicleNumber plateNumber make model manufacturingYear serialNumber chassisNumber engineNumber employeeId employeeName department assignedDate returnDate assignmentHistory history status condition purchaseValue lastMaintenanceDate nextMaintenanceDate insuranceExpiryDate registrationDate registrationExpiryDate')
        .lean(),
      Clearance.find(transportReviewableFilter).select('status transportStatus transportReview workflow').lean(),
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
      const matchesVehicle = vehicle === 'All' || requestVehicles.some((asset) => vehicleNumber(asset).toLowerCase().includes(String(vehicle).toLowerCase()));
      const matchesVehicleType = vehicleType === 'All' || requestVehicles.some((asset) => String(asset.assetType || asset.category || '').toLowerCase().includes(String(vehicleType).toLowerCase()));
      return matchesDepartment && matchesEmployee && matchesVehicle && matchesVehicleType;
    };

    const clearanceStatusFilter = reportType !== 'clearance' ? 'All' : status === 'Approved' ? 'Cleared' : status;
    const pendingRecords = createdRequests.filter((request) => {
      const currentStatus = getTransportStatus(request);
      return ['Pending', 'Under Review'].includes(currentStatus)
        && (clearanceStatusFilter === 'All' || clearanceStatusFilter === 'Pending')
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
      const decisionStatus = event.action === 'APPROVE_CLEARANCE' ? 'Cleared' : 'Returned';
      return clearanceStatusFilter === 'All' || clearanceStatusFilter === decisionStatus;
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
        status: event.action === 'APPROVE_CLEARANCE' ? 'Cleared' : 'Returned',
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
      approved: decisionRecords.filter((record) => record.status === 'Cleared').length,
      returned: decisionRecords.filter((record) => record.status === 'Returned').length,
      pending: pendingRecords.length,
      vehicleAssignments: vehicleActivity.assignments,
      vehicleReturns: vehicleActivity.returns,
    };

    const currentDate = new Date();
    const withinRange = (value) => dateInRange(value, range.start, range.end);
    const matchesVehicleFilters = (asset) => {
      const plate = vehicleNumber(asset);
      const matchesDepartment = department === 'All' || asset.department === department;
      const matchesVehicle = vehicle === 'All' || plate.toLowerCase().includes(String(vehicle).toLowerCase());
      const assetType = asset.assetType || asset.category || asset.assetName || '';
      const matchesVehicleType = vehicleType === 'All' || String(assetType).toLowerCase().includes(String(vehicleType).toLowerCase());
      const matchesEmployee = !String(employee).trim()
        || [asset.employeeName, asset.employeeId].some((value) => String(value || '').toLowerCase().includes(String(employee).trim().toLowerCase()));
      const matchesStatus = status === 'All'
        || (reportType === 'insurance'
          ? getVehicleDocumentStatus(asset, currentDate) === status
          : normalizeAssetStatus(asset.status) === status);
      return matchesDepartment && matchesVehicle && matchesVehicleType && matchesEmployee && matchesStatus;
    };
    const inventoryRows = assets.filter(matchesVehicleFilters);
    const vehicleSummary = {
      totalVehicles: inventoryRows.length,
      availableVehicles: inventoryRows.filter((asset) => normalizeAssetStatus(asset.status) === 'Available').length,
      assignedVehicles: inventoryRows.filter((asset) => normalizeAssetStatus(asset.status) === 'Assigned').length,
      underMaintenance: inventoryRows.filter((asset) => normalizeAssetStatus(asset.status) === 'Under Maintenance').length,
      pendingClearance: openRequests.filter((request) => ['Pending', 'Under Review'].includes(getTransportStatus(request))).length,
      completedClearances: decisionRecords.filter((record) => record.status === 'Cleared').length,
    };
    const baseVehicleColumns = [
      { key: 'plateNumber', label: 'Plate Number' },
      { key: 'vehicleType', label: 'Vehicle Type' },
      { key: 'makeModel', label: 'Vehicle Details' },
      { key: 'department', label: 'Department' },
      { key: 'status', label: 'Status' },
    ];
    const asVehicleRow = (asset) => ({
      plateNumber: vehicleNumber(asset),
      vehicleType: asset.vehicleType || asset.assetType || asset.category || 'Vehicle',
      makeModel: [asset.make, asset.model, asset.manufacturingYear].filter(Boolean).join(' ') || 'N/A',
      department: asset.department || 'N/A',
      status: normalizeAssetStatus(asset.status),
      employeeName: asset.employeeName || 'N/A',
      employeeId: asset.employeeId || 'N/A',
      assignedDate: asset.assignedDate || null,
      returnDate: asset.returnDate || null,
      condition: asset.condition || 'N/A',
      purchaseValue: asset.purchaseValue ?? 0,
      lastMaintenanceDate: asset.lastMaintenanceDate || null,
      nextMaintenanceDate: asset.nextMaintenanceDate || null,
      maintenanceHistory: (Array.isArray(asset.history) ? asset.history : [])
        .filter((entry) => /maintenance|repair|service/i.test(String(entry.action || '')))
        .map((entry) => `${entry.action} (${entry.date ? new Date(entry.date).toLocaleDateString('en-US') : 'date N/A'})`)
        .join('; ') || 'No maintenance history recorded',
      maintenanceCost: 'Not recorded',
      insuranceExpiryDate: asset.insuranceExpiryDate || null,
      registrationDate: asset.registrationDate || null,
      registrationExpiryDate: asset.registrationExpiryDate || null,
      documentStatus: `Insurance: ${getDocumentStatus(asset.insuranceExpiryDate, currentDate)}; Registration: ${getDocumentStatus(asset.registrationExpiryDate, currentDate)}`,
    });
    let reportRecords = records;
    let columns = [
      { key: 'requestId', label: 'Request ID' },
      { key: 'employeeId', label: 'Employee ID' },
      { key: 'employeeName', label: 'Employee Name' },
      { key: 'department', label: 'Department' },
      { key: 'vehicleNumber', label: 'Vehicle' },
      { key: 'requestDate', label: 'Request Date', type: 'date' },
      { key: 'decisionDate', label: 'Verification Date', type: 'date' },
      { key: 'status', label: 'Clearance Status' },
    ];
    let title = 'Transport Clearance Report';
    let reportSummary = { ...summary, ...vehicleSummary };

    if (reportType === 'summary') {
      title = 'Transport Dashboard Summary Report';
      columns = [
        { key: 'metric', label: 'Metric' },
        { key: 'value', label: 'Value' },
      ];
      reportRecords = Object.entries(vehicleSummary).map(([metric, value]) => ({
        metric: metric.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase()),
        value,
      }));
    } else if (reportType === 'inventory') {
      title = 'Vehicle Inventory Report';
      reportRecords = inventoryRows.map(asVehicleRow);
      columns = baseVehicleColumns;
    } else if (reportType === 'clearance') {
      title = 'Transport Clearance Report';
    } else if (reportType === 'maintenance') {
      title = 'Vehicle Maintenance Report';
      reportRecords = inventoryRows
        .filter((asset) => withinRange(asset.lastMaintenanceDate)
          || withinRange(asset.nextMaintenanceDate)
          || normalizeAssetStatus(asset.status) === 'Under Maintenance')
        .map(asVehicleRow);
      columns = [
        { key: 'plateNumber', label: 'Plate Number' },
        { key: 'vehicleType', label: 'Vehicle Type' },
        { key: 'maintenanceHistory', label: 'Maintenance History' },
        { key: 'maintenanceCost', label: 'Maintenance Cost' },
        { key: 'lastMaintenanceDate', label: 'Last Maintenance', type: 'date' },
        { key: 'nextMaintenanceDate', label: 'Next Maintenance', type: 'date' },
        { key: 'status', label: 'Vehicle Status' },
      ];
    } else if (reportType === 'assignment') {
      title = 'Vehicle Assignment Report';
      reportRecords = inventoryRows.flatMap((asset) => {
        const assignments = Array.isArray(asset.assignmentHistory) ? asset.assignmentHistory : [];
        const relevant = assignments.length
          ? assignments.filter((entry) => withinRange(entry.assignedDate) || (!entry.assignedDate && withinRange(asset.assignedDate)))
          : withinRange(asset.assignedDate) || normalizeAssetStatus(asset.status) === 'Assigned' ? [asset] : [];
        return relevant.map((entry) => ({
          ...asVehicleRow(asset),
          employeeName: entry.employeeName || asset.employeeName || 'N/A',
          employeeId: entry.employeeId || asset.employeeId || 'N/A',
          department: entry.department || asset.department || 'N/A',
          assignedDate: entry.assignedDate || asset.assignedDate || null,
          status: entry.status || normalizeAssetStatus(asset.status),
          returnDate: entry.returnedDate || asset.returnDate || null,
        }));
      });
      columns = [
        { key: 'plateNumber', label: 'Vehicle' },
        { key: 'vehicleType', label: 'Vehicle Type' },
        { key: 'employeeName', label: 'Driver / Employee' },
        { key: 'employeeId', label: 'Employee ID' },
        { key: 'department', label: 'Department' },
        { key: 'assignedDate', label: 'Assigned Date', type: 'date' },
        { key: 'returnDate', label: 'Return Date', type: 'date' },
        { key: 'status', label: 'Assignment Status' },
      ];
    } else if (reportType === 'insurance') {
      title = 'Insurance & Registration Report';
      reportRecords = inventoryRows
        .filter((asset) => withinRange(asset.insuranceExpiryDate) || withinRange(asset.registrationExpiryDate) || withinRange(asset.registrationDate))
        .map(asVehicleRow);
      columns = [
        { key: 'plateNumber', label: 'Plate Number' },
        { key: 'vehicleType', label: 'Vehicle Type' },
        { key: 'department', label: 'Department' },
        { key: 'registrationDate', label: 'Registration Date', type: 'date' },
        { key: 'registrationExpiryDate', label: 'Registration Expiry', type: 'date' },
        { key: 'insuranceExpiryDate', label: 'Insurance Expiry', type: 'date' },
        { key: 'documentStatus', label: 'Document Alert' },
      ];
    }

    const monthly = [];
    if (period === 'yearly' || period === 'year') {
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
      departments: [...new Set([
        ...[...createdRequests, ...eventRequests].map((request) => departmentName(request, employeeById.get(request.employeeId))),
        ...assets.map((asset) => asset.department),
      ].filter((value) => value && value !== 'N/A'))].sort(),
      vehicles: [...new Set(assets.map(vehicleNumber).filter(Boolean))].sort(),
      vehicleTypes: [...new Set(assets.map((asset) => asset.assetType || asset.category).filter(Boolean))].sort(),
    };
    const periodLabel = period === 'custom' ? 'Custom Range'
      : period === 'today' ? 'Today'
        : period === 'week' ? 'This Week'
          : period === 'month' ? 'This Month'
            : period === 'year' ? 'This Year' : period;
    const reportRangeTitle = `${title} — ${periodLabel}`;
    return res.status(200).json({
      success: true,
      title: reportRangeTitle,
      reportType,
      period,
      range: { from: range.start, to: range.end },
      summary: reportSummary,
      records: reportRecords,
      columns,
      monthly,
      filters,
      generatedBy: req.user?.fullName || req.user?.name || 'Transport Officer',
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error generating Transport report:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to generate Transport report.' });
  }
};

export { getTransportReport };