import AuditLog from '../models/AuditLog.js';
import Clearance from '../models/clearance.js';
import Employee from '../models/employee.js';
import Asset from '../models/propertyAsset.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { getResponsibleOffices, normalizeRequiredOffices } from '../utils/clearanceWorkflow.js';
import { notifyTransportOfficers } from '../utils/transportNotifications.js';
import {
  getTransportStatus,
  getTransportStatusFilter,
  mapTransportRequest,
  transportReviewableFilter,
} from '../utils/transportClearance.js';

const isTransportOfficer = (user) => {
  const role = String(user?.role || '').trim().toLowerCase();
  return role.includes('transport') && role.includes('officer');
};

const rejectNonTransportOfficer = (req, res) => {
  if (isTransportOfficer(req.user)) return false;
  res.status(403).json({ message: 'Transport Officer access is required.' });
  return true;
};

const getReviewableRequest = (requestId) => Clearance.findOne({
  $and: [{ requestId }, transportReviewableFilter],
});

const getEmployeeRecord = async (request) => {
  const employeeId = request.employeeId || request.employee?.employeeId;
  if (!employeeId) return null;
  return Employee.findOne({ employeeId })
    .select('employeeId fullName department position campus email phone')
    .lean();
};

const getTransportAssets = async (employeeId) => {
  if (!employeeId) return [];
  return Asset.find({
    employeeId,
    $or: [
      { assetName: { $regex: 'vehicle|transport|bus', $options: 'i' } },
      { assetType: { $regex: 'vehicle|transport|bus', $options: 'i' } },
      { category: { $regex: 'vehicle|transport|bus', $options: 'i' } },
    ],
  })
    .select('assetId assetName assetType category status condition assignedDate returnDate')
    .sort({ updatedAt: -1 })
    .lean();
};

const buildEmployeeInfo = (request, employeeRecord) => {
  const embeddedEmployee = request.employee && typeof request.employee === 'object' ? request.employee : {};
  const department = request.department && typeof request.department === 'object'
    ? request.department.departmentName || request.department.name
    : request.department;

  return {
    employeeId: employeeRecord?.employeeId || embeddedEmployee.employeeId || request.employeeId || '',
    fullName: employeeRecord?.fullName || embeddedEmployee.fullName || embeddedEmployee.name || request.employeeName || 'Unknown Employee',
    department: employeeRecord?.department || department || embeddedEmployee.department || 'N/A',
    position: employeeRecord?.position || embeddedEmployee.position || request.position || 'N/A',
    campus: employeeRecord?.campus || embeddedEmployee.campus || request.campus || 'N/A',
    email: employeeRecord?.email || embeddedEmployee.email || request.email || '',
    phone: employeeRecord?.phone || embeddedEmployee.phone || request.phone || '',
  };
};

const recordTransportAction = async (req, request, action, oldStatus, newStatus, description, details = {}) => {
  try {
    await AuditLog.create({
      userId: req.user?._id || null,
      actorRole: req.user?.role || 'Transport Officer',
      action,
      module: 'Transport Clearance',
      description,
      oldValues: { status: oldStatus },
      newValues: { status: newStatus, requestId: request.requestId, ...details },
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });
  } catch (error) {
    console.warn(`Unable to record ${action} for ${request.requestId}:`, error.message);
  }
};

const notifyEmployee = async (request, approved, returnReason = '') => {
  try {
    const employeeInfo = request.employee && typeof request.employee === 'object' ? request.employee : {};
    const employeeId = request.employeeId || employeeInfo.employeeId;
    const queries = [];
    if (employeeId) queries.push({ employeeId });
    const employeeName = request.employeeName || employeeInfo.fullName || employeeInfo.name;
    if (employeeName) {
      const escapedName = String(employeeName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      queries.push({ name: { $regex: `^${escapedName}$`, $options: 'i' } });
    }
    if (request.email || employeeInfo.email) queries.push({ email: request.email || employeeInfo.email });
    const user = queries.length ? await User.findOne({ $or: queries }).select('_id name employeeId').lean() : null;
    const title = approved ? 'Transport Clearance Approved' : 'Transport Clearance Returned';
    const message = approved
      ? 'The Transport Office has cleared your transport records.'
      : `The Transport Office returned your clearance request. Reason: ${returnReason}`;

    await Notification.create({
      recipientId: user?._id || null,
      employeeId: employeeId || user?.employeeId || '',
      targetName: user?.name || employeeName || 'Employee',
      title,
      message,
      type: approved ? 'CLEARANCE_PROGRESS_UPDATED' : 'CLEARANCE_RETURNED',
      actionText: approved ? 'View Clearance' : 'Resolve and Resubmit',
      actionLink: '/employee/My%20Clearance',
      relatedRequestId: request.requestId,
      clearanceRequestId: request.requestId,
      isRead: false,
    });
  } catch (error) {
    console.warn(`Unable to notify employee for ${request.requestId}:`, error.message);
  }
};

const updateTransportWorkflowStep = (request, status, details = {}) => {
  const workflow = Array.isArray(request.workflow) ? [...request.workflow] : [];
  const stepIndex = workflow.findIndex((step) => /transport/i.test(String(step.office || step.name || '')));
  const previousStep = stepIndex >= 0 ? workflow[stepIndex] : {};
  const step = {
    ...previousStep,
    office: 'Transport Office',
    status,
    updatedAt: new Date(),
    ...details,
  };
  if (stepIndex >= 0) workflow[stepIndex] = step;
  else workflow.push(step);
  request.workflow = workflow;

  const requiredOffices = Array.isArray(request.requiredOffices) ? request.requiredOffices : [];
  request.requiredOffices = normalizeRequiredOffices([...requiredOffices, 'Transport Office']);
};

const getTransportRequestStatus = (request) => getTransportStatus(request);

export const getTransportRequests = async (req, res) => {
  if (rejectNonTransportOfficer(req, res)) return;

  try {
    const status = String(req.query.status || 'Pending');
    if (!['Pending', 'Approved', 'Returned', 'All'].includes(status)) {
      return res.status(400).json({ message: 'Status must be Pending, Approved, Returned, or All.' });
    }
    const filters = [transportReviewableFilter];
    const statusFilter = getTransportStatusFilter(status);
    if (statusFilter) filters.push(statusFilter);
    const search = String(req.query.search || '').trim();
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = { $regex: escapedSearch, $options: 'i' };
      filters.push({
        $or: [
          { requestId: searchRegex },
          { employeeId: searchRegex },
          { employeeName: searchRegex },
          { 'employee.fullName': searchRegex },
        ],
      });
    }
    const query = { $and: filters };
    const [records, totalCount] = await Promise.all([
      Clearance.find(query).sort({ createdAt: -1 }).limit(100).lean(),
      Clearance.countDocuments(query),
    ]);
    const employeeIds = [...new Set(records.map((request) => request.employeeId).filter(Boolean))];
    const employeeRecords = employeeIds.length
      ? await Employee.find({ employeeId: { $in: employeeIds } }).select('employeeId fullName department position').lean()
      : [];
    const employeesById = new Map(employeeRecords.map((employee) => [employee.employeeId, employee]));
    const requests = records.map((request) => {
      const mapped = mapTransportRequest(request);
      const employee = employeesById.get(mapped.employeeId);
      return {
        ...mapped,
        employeeName: employee?.fullName || mapped.employeeName,
        department: employee?.department || mapped.department,
        position: employee?.position || mapped.position,
      };
    });

    return res.status(200).json({ requests, totalCount });
  } catch (error) {
    console.error('Error fetching Transport clearance requests:', error.message);
    return res.status(500).json({ message: 'Unable to load Transport clearance requests.' });
  }
};

export const getTransportRequestById = async (req, res) => {
  if (rejectNonTransportOfficer(req, res)) return;

  try {
    const request = await getReviewableRequest(req.params.requestId);
    if (!request) return res.status(404).json({ message: 'Transport clearance request not found.' });
    const [employeeRecord, transportAssets] = await Promise.all([
      getEmployeeRecord(request),
      getTransportAssets(request.employeeId || request.employee?.employeeId),
    ]);
    const employee = buildEmployeeInfo(request, employeeRecord);
    const transportInformation = request.transportInformation
      || request.transportInfo
      || request.transportRecord
      || null;

    return res.status(200).json({
      request: {
        ...mapTransportRequest(request),
        employee,
        requestDate: request.requestDate || request.submittedDate || request.createdAt,
        lastWorkingDate: request.lastWorkingDate || request.relievingDate || null,
        transportInformation,
        transportAssets,
        transportReview: request.transportReview || null,
        returnReason: request.transportReturnReason || request.returnedReason || request.returnReason || '',
        officerComment: request.transportOfficerComment || '',
      },
    });
  } catch (error) {
    console.error('Error fetching Transport clearance request:', error.message);
    return res.status(500).json({ message: 'Unable to load Transport clearance request details.' });
  }
};

export const startTransportReview = async (req, res) => {
  if (rejectNonTransportOfficer(req, res)) return;

  try {
    const request = await getReviewableRequest(req.params.requestId);
    if (!request) return res.status(404).json({ message: 'Transport clearance request not found.' });
    const status = getTransportRequestStatus(request);
    if (status === 'Approved' || status === 'Returned') {
      return res.status(409).json({ message: 'This request is no longer awaiting Transport review.' });
    }
    if (status === 'Pending') {
      const reviewer = req.user?.fullName || req.user?.name || 'Transport Officer';
      updateTransportWorkflowStep(request, 'In Progress', { startedBy: reviewer, startedAt: new Date() });
      request.transportStatus = 'Under Review';
      await request.save();
      await recordTransportAction(req, request, 'START_REVIEW', 'Pending', 'Under Review', `Started Transport review for ${request.requestId}.`);
    }
    return res.status(200).json({ request: { requestId: request.requestId, status: getTransportRequestStatus(request) } });
  } catch (error) {
    console.error('Error starting Transport review:', error.message);
    return res.status(500).json({ message: 'Unable to start Transport review.' });
  }
};

export const approveTransportClearance = async (req, res) => {
  if (rejectNonTransportOfficer(req, res)) return;

  try {
    const request = await getReviewableRequest(req.params.requestId);
    if (!request) return res.status(404).json({ message: 'Transport clearance request not found.' });
    const currentStatus = getTransportRequestStatus(request);
    if (!['Pending', 'Under Review'].includes(currentStatus)) {
      return res.status(409).json({ message: 'Only pending or under-review requests can be approved.' });
    }

    const recordCheck = req.body?.recordCheck || {};
    if (typeof recordCheck.hasAssignedVehicle !== 'boolean') {
      return res.status(400).json({ message: 'Confirm whether the employee has an assigned vehicle.' });
    }
    if (recordCheck.hasAssignedVehicle && recordCheck.vehicleReturned !== true) {
      return res.status(400).json({ message: 'The assigned vehicle must be returned before clearance can be approved.' });
    }
    if (recordCheck.noOutstandingIssue !== true || recordCheck.noUnreturnedTransportProperty !== true || recordCheck.noOtherObligation !== true) {
      return res.status(400).json({ message: 'Resolve all outstanding Transport issues before approving clearance.' });
    }

    const transportAssets = await getTransportAssets(request.employeeId || request.employee?.employeeId);
    if (transportAssets.length && recordCheck.hasAssignedVehicle !== true) {
      return res.status(400).json({ message: 'Confirm the registered vehicle or transport asset before approving clearance.' });
    }
    if (transportAssets.length && recordCheck.vehicleReturned !== true) {
      return res.status(400).json({ message: 'Confirm that the registered vehicle or transport asset has been returned.' });
    }
    const unreturnedAssets = transportAssets.filter((asset) =>
      !['returned', 'cleared', 'available', 'not applicable'].includes(String(asset.status || '').trim().toLowerCase())
    );
    if (unreturnedAssets.length) {
      return res.status(400).json({
        message: `Clearance cannot be approved while ${unreturnedAssets.length} assigned vehicle or transport asset(s) remain unreturned.`,
      });
    }

    const reviewer = req.user?.fullName || req.user?.name || 'Transport Officer';
    const reviewedAt = new Date();
    const officerNotes = String(req.body?.officerNotes || '').trim();
    updateTransportWorkflowStep(request, 'Completed', {
      approvedBy: reviewer,
      reviewedBy: reviewer,
      reviewedAt,
      completedAt: reviewedAt,
      comment: officerNotes,
      returnReason: '',
    });
    request.transportStatus = 'Approved';
    request.transportReviewedBy = reviewer;
    request.transportReviewedAt = reviewedAt;
    request.transportOfficerComment = officerNotes;
    request.transportReturnReason = '';
    request.transportReview = {
      ...recordCheck,
      status: 'Approved',
      reviewedBy: reviewer,
      reviewedAt,
      officerNotes,
      returnReason: '',
    };
    request.status = 'In Progress';
    request.overallStatus = 'In Progress';
    request.returnReason = '';
    request.returnedReason = '';
    request.returnedOffice = '';
    request.returnedBy = '';
    const nextOffices = getResponsibleOffices({
      workflow: request.workflow,
      requiredOffices: request.requiredOffices,
      departmentStatus: request.departmentStatus,
    });
    request.currentStep = nextOffices[0] || 'Final HR Clearance';
    await request.save();
    await recordTransportAction(req, request, 'APPROVE_CLEARANCE', currentStatus, 'Approved', `Transport clearance approved for ${request.requestId}.`, {
      officerComment: officerNotes,
    });
    await notifyEmployee(request, true);
    await notifyTransportOfficers({
      type: 'TRANSPORT_CLEARANCE_APPROVED',
      title: 'Clearance Approved',
      message: `Transport clearance for ${request.employeeName || 'the employee'}${request.employeeId ? ` (${request.employeeId})` : ''} has been approved.`,
      employeeName: request.employeeName,
      employeeId: request.employeeId,
      requestId: request.requestId,
      eventDate: reviewedAt,
      actionText: 'View History',
      actionLink: '/transport-office/history',
    });

    return res.status(200).json({ success: true, request: mapTransportRequest(request.toObject()) });
  } catch (error) {
    console.error('Error approving Transport clearance:', error.message);
    return res.status(500).json({ message: 'Unable to approve Transport clearance.' });
  }
};

export const returnTransportClearance = async (req, res) => {
  if (rejectNonTransportOfficer(req, res)) return;

  try {
    const request = await getReviewableRequest(req.params.requestId);
    if (!request) return res.status(404).json({ message: 'Transport clearance request not found.' });
    const currentStatus = getTransportRequestStatus(request);
    if (!['Pending', 'Under Review'].includes(currentStatus)) {
      return res.status(409).json({ message: 'Only pending or under-review requests can be returned.' });
    }
    const returnReason = String(req.body?.returnReason || '').trim();
    if (!returnReason) return res.status(400).json({ message: 'Return reason is required.' });

    const reviewer = req.user?.fullName || req.user?.name || 'Transport Officer';
    const reviewedAt = new Date();
    const officerComment = String(req.body?.officerComment || '').trim();
    updateTransportWorkflowStep(request, 'Returned', {
      reviewedBy: reviewer,
      reviewedAt,
      comment: officerComment || returnReason,
      returnReason,
    });
    request.transportStatus = 'Returned';
    request.transportReviewedBy = reviewer;
    request.transportReviewedAt = reviewedAt;
    request.transportOfficerComment = officerComment;
    request.transportReturnReason = returnReason;
    request.transportReview = {
      ...(request.transportReview || {}),
      status: 'Returned',
      reviewedBy: reviewer,
      reviewedAt,
      officerNotes: officerComment,
      returnReason,
    };
    request.status = 'Returned';
    request.overallStatus = 'Returned';
    request.returnReason = returnReason;
    request.returnedReason = returnReason;
    request.returnedRemark = officerComment || returnReason;
    request.returnedBy = reviewer;
    request.returnedOffice = 'Transport Office';
    request.returnedAt = reviewedAt;
    request.affectedField = 'Transport Clearance';
    request.currentStep = 'Employee';
    await request.save();
    await recordTransportAction(req, request, 'RETURN_CLEARANCE', currentStatus, 'Returned', `Transport clearance returned for ${request.requestId}: ${returnReason}`, {
      returnReason,
      officerComment,
    });
    await notifyEmployee(request, false, returnReason);
    await notifyTransportOfficers({
      type: 'TRANSPORT_CLEARANCE_RETURNED',
      title: 'Clearance Returned',
      message: `Transport clearance for ${request.employeeName || 'the employee'}${request.employeeId ? ` (${request.employeeId})` : ''} was returned. Reason: ${returnReason}`,
      employeeName: request.employeeName,
      employeeId: request.employeeId,
      requestId: request.requestId,
      eventDate: reviewedAt,
      actionText: 'View History',
      actionLink: '/transport-office/history',
    });

    return res.status(200).json({ success: true, request: mapTransportRequest(request.toObject()) });
  } catch (error) {
    console.error('Error returning Transport clearance:', error.message);
    return res.status(500).json({ message: 'Unable to return Transport clearance.' });
  }
};