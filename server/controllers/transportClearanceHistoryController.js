import AuditLog from '../models/AuditLog.js';
import Clearance from '../models/clearance.js';
import Employee from '../models/employee.js';
import User from '../models/User.js';
import Asset from '../models/propertyAsset.js';

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

const rejectNonTransportOfficer = (req, res) => {
  if (isTransportOfficer(req.user)) return false;
  res.status(403).json({ success: false, message: 'Transport Officer access is required.' });
  return true;
};

const parseDateBound = (value, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getReturnReason = (audit, request) => {
  if (audit.newValues?.returnReason) return audit.newValues.returnReason;
  const description = String(audit.description || '');
  const requestId = audit.newValues?.requestId;
  const marker = requestId ? `${requestId}:` : 'returned for';
  const markerIndex = description.indexOf(marker);
  if (markerIndex >= 0) return description.slice(markerIndex + marker.length).trim();
  return request?.transportStatus === 'Returned'
    ? request.transportReturnReason || request.returnedReason || request.returnReason || ''
    : '';
};

const mapHistoryEntry = ({ audit, request, employee, reviewer, vehicleNumber }) => {
  const embeddedEmployee = request?.employee && typeof request.employee === 'object' ? request.employee : {};
  const department = request?.department && typeof request.department === 'object'
    ? request.department.departmentName || request.department.name
    : request?.department;
  const status = audit.newValues?.status
    || (audit.action === 'APPROVE_CLEARANCE' ? 'Approved' : 'Returned');

  return {
    id: String(audit._id),
    requestId: audit.newValues?.requestId || request?.requestId || 'N/A',
    employeeName: employee?.fullName || embeddedEmployee.fullName || embeddedEmployee.name || request?.employeeName || 'Unknown Employee',
    employeeId: employee?.employeeId || embeddedEmployee.employeeId || request?.employeeId || 'N/A',
    department: employee?.department || department || embeddedEmployee.department || 'N/A',
    position: employee?.position || embeddedEmployee.position || request?.position || 'N/A',
    vehicleNumber: vehicleNumber || 'N/A',
    requestDate: request?.requestDate || request?.submittedDate || request?.createdAt || null,
    lastWorkingDate: request?.lastWorkingDate || request?.relievingDate || null,
    decisionDate: audit.createdAt,
    status,
    reviewedBy: reviewer?.fullName || reviewer?.name || 'Transport Officer',
    returnReason: status === 'Returned' ? getReturnReason(audit, request) : '',
    remarks: audit.newValues?.officerComment
      || (request?.transportStatus === status ? request.transportOfficerComment || request.transportReview?.officerNotes : '')
      || '',
  };
};

const getHistorySource = async (fromDate, toDate) => {
  const createdAt = {};
  if (fromDate) createdAt.$gte = fromDate;
  if (toDate) createdAt.$lte = toDate;
  return AuditLog.find({
    module: { $regex: '^Transport Clearance$', $options: 'i' },
    action: { $in: decisionActions },
    ...(Object.keys(createdAt).length ? { createdAt } : {}),
  })
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();
};

const enrichHistory = async (auditLogs) => {
  const requestIds = [...new Set(auditLogs.map((audit) => audit.newValues?.requestId).filter(Boolean))];
  const reviewerIds = [...new Set(auditLogs.map((audit) => audit.userId).filter(Boolean).map(String))];
  const requests = requestIds.length
    ? await Clearance.find({ requestId: { $in: requestIds } }).lean()
    : [];
  const employees = requests.length
    ? await Employee.find({ employeeId: { $in: requests.map((request) => request.employeeId).filter(Boolean) } })
      .select('employeeId fullName department position')
      .lean()
    : [];
  const reviewers = reviewerIds.length
    ? await User.find({ _id: { $in: reviewerIds } }).select('name fullName').lean()
    : [];
  const employeeById = new Map(employees.map((employee) => [employee.employeeId, employee]));
  const requestById = new Map(requests.map((request) => [request.requestId, request]));
  const reviewerById = new Map(reviewers.map((reviewer) => [String(reviewer._id), reviewer]));
  const employeeIds = [...new Set(requests.map((request) => request.employeeId).filter(Boolean))];
  const assets = employeeIds.length
    ? await Asset.find({ $and: [{ employeeId: { $in: employeeIds } }, vehicleAssetQuery] })
      .select('employeeId assetId vehicleNumber plateNumber')
      .lean()
    : [];
  const vehicleByEmployee = new Map();
  assets.forEach((asset) => {
    const current = vehicleByEmployee.get(asset.employeeId) || [];
    current.push(asset.vehicleNumber || asset.plateNumber || asset.assetId);
    vehicleByEmployee.set(asset.employeeId, current);
  });

  return auditLogs.map((audit) => {
    const request = requestById.get(audit.newValues?.requestId);
    const employee = request ? employeeById.get(request.employeeId) : null;
    const vehicleNumbers = request ? vehicleByEmployee.get(request.employeeId) || [] : [];
    return mapHistoryEntry({
      audit,
      request,
      employee,
      reviewer: reviewerById.get(String(audit.userId)),
      vehicleNumber: vehicleNumbers.join(', '),
    });
  });
};

const getTransportClearanceHistory = async (req, res) => {
  if (rejectNonTransportOfficer(req, res)) return;

  try {
    const { search = '', status = 'All', fromDate = '', toDate = '' } = req.query;
    if (!['All', 'Approved', 'Returned'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be All, Approved, or Returned.' });
    }
    const from = parseDateBound(String(fromDate), false);
    const to = parseDateBound(String(toDate), true);
    if ((fromDate && !from) || (toDate && !to)) {
      return res.status(400).json({ success: false, message: 'Enter valid decision dates.' });
    }
    if (from && to && from > to) {
      return res.status(400).json({ success: false, message: 'From Date must be before To Date.' });
    }

    const allEntries = await enrichHistory(await getHistorySource(from, to));
    const summary = {
      totalReviewed: allEntries.length,
      approved: allEntries.filter((entry) => entry.status === 'Approved').length,
      returned: allEntries.filter((entry) => entry.status === 'Returned').length,
    };
    const searchTerm = String(search).trim().toLowerCase();
    const records = allEntries.filter((entry) => {
      const matchesStatus = status === 'All' || entry.status === status;
      const matchesSearch = !searchTerm || [
        entry.employeeId,
        entry.employeeName,
        entry.department,
        entry.vehicleNumber,
        entry.requestId,
      ].some((value) => String(value || '').toLowerCase().includes(searchTerm));
      return matchesStatus && matchesSearch;
    });

    return res.status(200).json({ success: true, summary, total: records.length, records });
  } catch (error) {
    console.error('Error fetching Transport clearance history:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load Transport clearance history.' });
  }
};

const getTransportClearanceHistoryEntry = async (req, res) => {
  if (rejectNonTransportOfficer(req, res)) return;

  try {
    const audit = await AuditLog.findById(req.params.entryId).lean();
    if (!audit || !/^Transport Clearance$/i.test(String(audit.module || '')) || !decisionActions.includes(audit.action)) {
      return res.status(404).json({ success: false, message: 'Transport clearance history entry not found.' });
    }
    const [entry] = await enrichHistory([audit]);
    return res.status(200).json({ success: true, entry });
  } catch (error) {
    console.error('Error fetching Transport clearance history entry:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load clearance history details.' });
  }
};

export { getTransportClearanceHistory, getTransportClearanceHistoryEntry };