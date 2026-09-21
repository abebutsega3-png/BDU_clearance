import ClearanceRequest from '../models/clearance.js';
import Employee from '../models/employee.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { propertyOfficeWorkflowFilter, resolveNextStepAfterDecision } from '../utils/clearanceWorkflow.js';

const recordPropertyAction = async (req, action, requestId, description, oldValues, newValues) => {
  try {
    await AuditLog.create({
      userId: req.user?._id || null,
      actorRole: req.user?.role || 'Property Officer',
      action,
      module: 'Property Clearance',
      description,
      oldValues,
      newValues,
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || ''
    });
  } catch (error) {
    console.warn(`Unable to record ${action} for ${requestId}:`, error.message);
  }
};

const mapRequestWithEmployee = async (request) => {
  const item = request.toObject ? request.toObject() : request;
  const employee = await Employee.findOne({ employeeId: item.employeeId }).lean();
  const propertyStep = Array.isArray(item.workflow)
    ? item.workflow.find((step) => String(step.office || '').toLowerCase().includes('property'))
    : null;
  const savedPropertyStatus = String(item.propertyStatus || '').trim().toLowerCase();
  const workflowStatus = String(propertyStep?.status || '').trim().toLowerCase();
  const propertyStatus = ['approved', 'completed', 'cleared', 'clear'].includes(savedPropertyStatus)
    ? 'Approved'
    : ['rejected', 'returned', 'not clear'].includes(savedPropertyStatus)
      ? 'Returned'
      : ['under review', 'in progress', 'review'].includes(savedPropertyStatus)
        ? 'Under Review'
        : ['completed', 'approved', 'cleared', 'clear'].includes(workflowStatus)
    ? 'Approved'
    : ['rejected', 'returned', 'not clear'].includes(workflowStatus)
      ? 'Returned'
      : ['in progress', 'under review', 'review'].includes(workflowStatus)
        ? 'Under Review'
        : ['in progress', 'under review', 'review'].includes(savedPropertyStatus)
          ? 'Under Review'
          : item.propertyStatus || 'Pending';

  return {
    ...item,
    employeeName: employee?.fullName || item.employeeName || 'Unknown Employee',
    department: employee?.department || item.department || 'N/A',
    position: employee?.position || item.position || 'N/A',
    campus: employee?.campus || item.campus || 'N/A',
    requestDate: item.requestDate || item.submittedDate || item.createdAt,
    status: propertyStatus,
    propertyStatus
  };
};

const updatePropertyWorkflow = (request, status) => {
  request.propertyStatus = status;
  request.propertyReviewedAt = new Date();
  request.propertyReviewedBy = request.propertyReviewedBy || '';
  if (Array.isArray(request.workflow)) {
    const propertyStep = request.workflow.find((step) => String(step.office || '').toLowerCase().includes('property'));
    const workflowStatus = status === 'Approved' ? 'Completed' : status === 'Returned' ? 'Rejected' : 'In Progress';
    if (propertyStep) {
      propertyStep.status = workflowStatus;
      propertyStep.updatedAt = new Date();
    } else {
      request.workflow.push({ office: 'Property / Asset Office', status: workflowStatus, updatedAt: new Date() });
    }
  }
};

const updatePropertyReturnDetails = (request, returnReason, officerComment) => {
  request.propertyReturnReason = returnReason;
  request.returnReason = returnReason;
  request.officerComment = officerComment || returnReason;
  if (Array.isArray(request.workflow)) {
    const propertyStep = request.workflow.find((step) => String(step.office || '').toLowerCase().includes('property'));
    if (propertyStep) {
      propertyStep.returnReason = returnReason;
      propertyStep.comment = officerComment || returnReason;
      propertyStep.updatedAt = new Date();
    }
  }
};

const findEmployeeUser = async (request) => {
  const queries = [];
  const employee = request.employee && typeof request.employee === 'object' ? request.employee : {};
  const employeeId = request.employeeId || employee.employeeId;
  const employeeName = request.employeeName || employee.fullName || employee.name;
  if (employeeId) queries.push({ employeeId });
  if (employeeName) {
    const escapedName = String(employeeName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    queries.push({ name: { $regex: `^${escapedName}$`, $options: 'i' } });
  }
  if (request.email || employee.email) queries.push({ email: request.email || employee.email });
  return queries.length ? User.findOne({ $or: queries }).select('_id name').lean() : null;
};

const notifyEmployee = async ({ request, title, message, type }) => {
  try {
    const employeeUser = await findEmployeeUser(request);
    await Notification.create({
      recipientId: employeeUser?._id || null,
      employeeId: request.employeeId || request.employee?.employeeId || '',
      targetName: employeeUser?.name || request.employeeName || request.employee?.fullName || 'Employee',
      title,
      message,
      type,
      actionText: 'View Request',
      actionLink: '/employee/My%20Clearance',
      relatedRequestId: request.requestId,
      clearanceRequestId: request.requestId,
      isRead: false,
    });
  } catch (error) {
    console.warn(`Unable to notify employee for ${request.requestId}:`, error.message);
  }
};

export const getAllRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const workflowGate = propertyOfficeWorkflowFilter;
    const filter = status && status !== 'All'
      ? { $and: [workflowGate, { $or: [
          { propertyStatus: status },
          { status },
          { overallStatus: status },
          ...(status === 'Approved' ? [{ workflow: { $elemMatch: { office: /property/i, status: { $in: ['Completed', 'Approved', 'Cleared'] } } } }] : []),
          ...(status === 'Returned' ? [{ workflow: { $elemMatch: { office: /property/i, status: { $in: ['Rejected', 'Returned', 'Not Clear'] } } } }] : [])
        ] }] }
      : workflowGate;
    const requests = await ClearanceRequest.find(filter).sort({ createdAt: -1 });
    res.status(200).json(await Promise.all(requests.map(mapRequestWithEmployee)));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching requests', error: error.message });
  }
};

export const getRequestById = async (req, res) => {
  try {
    const request = await ClearanceRequest.findOne({ requestId: req.params.requestId });
    if (!request) return res.status(404).json({ message: 'Request not found' });
    res.status(200).json(await mapRequestWithEmployee(request));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching request details', error: error.message });
  }
};

export const startReview = async (req, res) => {
  try {
    const request = await ClearanceRequest.findOne({ requestId: req.params.requestId });
    if (!request) return res.status(400).json({ message: 'Request cannot be put under review' });
    if (request.departmentStatus !== 'Approved') return res.status(400).json({ message: 'This request is waiting for Department Head approval' });
    updatePropertyWorkflow(request, 'Under Review');
    await request.save();
    await recordPropertyAction(req, 'START_REVIEW', request.requestId, `Started review for ${request.requestId}`, { status: 'Pending' }, { status: 'Under Review' });
    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({ message: 'Error starting review', error: error.message });
  }
};

export const approveClearance = async (req, res) => {
  try {
    const { officerComment } = req.body;
    const request = await ClearanceRequest.findOne({ requestId: req.params.requestId }).lean();
    if (!request) return res.status(400).json({ message: 'Request cannot be approved' });
    if (request.departmentStatus !== 'Approved') return res.status(400).json({ message: 'This request is waiting for Department Head approval' });
    const workflow = Array.isArray(request.workflow) ? [...request.workflow] : [];
    const propertyStepIndex = workflow.findIndex((step) => String(step.office || '').toLowerCase().includes('property'));
    const approvedBy = req.user?.fullName || req.user?.name || 'Property Officer';
    const approvedAt = new Date();
    const propertyStep = { office: 'Property / Asset Office', status: 'Completed', approvedBy, performedBy: approvedBy, approvedAt, updatedAt: approvedAt };
    if (propertyStepIndex >= 0) {
      workflow[propertyStepIndex] = { ...workflow[propertyStepIndex], ...propertyStep };
    } else {
      workflow.push(propertyStep);
    }
    const savedRequest = await ClearanceRequest.findOneAndUpdate(
      { requestId: req.params.requestId },
      { $set: {
        propertyStatus: 'Approved',
        propertyReviewedAt: approvedAt,
        propertyReviewedBy: approvedBy,
        reviewedAt: new Date(),
        officerComment: officerComment || 'All assets verified and returned.',
        currentStep: resolveNextStepAfterDecision('Property / Asset Office', 'Approved'),
        workflow
      } },
      { returnDocument: 'after', runValidators: false, strict: false }
    ).lean();
    if (savedRequest?.propertyStatus !== 'Approved') {
      return res.status(500).json({ message: 'Property approval was not saved.' });
    }
    const ictOfficers = await User.find({ role: { $regex: '^ict officer$', $options: 'i' } }).select('_id name');
    if (ictOfficers.length) await Notification.insertMany(ictOfficers.map((officer) => ({
      recipientId: officer._id,
      targetName: officer.name || 'ICT Officer',
      title: 'Clearance Ready for ICT Review',
      message: `${savedRequest.employeeName || 'An employee'}'s clearance was approved by Property / Asset and is ready for ICT review.`,
      type: 'CLEARANCE_READY_FOR_ICT',
      actionText: 'Review Request',
      actionLink: '/ict-office/clearance-requests',
      relatedRequestId: savedRequest.requestId,
      clearanceRequestId: savedRequest.requestId,
      isRead: false,
    })));
    await notifyEmployee({
      request: savedRequest,
      title: 'Property Clearance Approved',
      message: 'Your clearance has been approved by the Property / Asset Office.',
      type: 'CLEARANCE_PROGRESS_UPDATED',
    });
    await recordPropertyAction(req, 'APPROVE_CLEARANCE', savedRequest.requestId, `Approved clearance ${savedRequest.requestId}`, { status: 'Under Review' }, { status: 'Approved' });
    res.status(200).json(savedRequest);
  } catch (error) {
    res.status(500).json({ message: 'Error approving clearance', error: error.message });
  }
};

export const returnRequest = async (req, res) => {
  try {
    const { returnReason, officerComment } = req.body;
    if (!returnReason) {
      return res.status(400).json({ message: 'Return reason is required' });
    }

    const request = await ClearanceRequest.findOne({ requestId: req.params.requestId });
    if (!request) return res.status(400).json({ message: 'Request cannot be returned' });
    if (request.departmentStatus !== 'Approved') return res.status(400).json({ message: 'This request is waiting for Department Head approval' });
    updatePropertyWorkflow(request, 'Returned');
    updatePropertyReturnDetails(request, returnReason, officerComment);
    request.status = 'Returned';
    request.overallStatus = 'Returned';
    request.currentStep = resolveNextStepAfterDecision('Property / Asset Office', 'Returned');
    request.reviewedAt = new Date();
    await request.save();
    await notifyEmployee({
      request,
      title: 'Property Clearance Returned',
      message: `Property / Asset Office returned your request. Reason: ${returnReason}. Please resolve the issue and resubmit.`,
      type: 'CLEARANCE_RETURNED',
    });
    await recordPropertyAction(req, 'RETURN_REQUEST', request.requestId, `Returned clearance ${request.requestId}`, { status: 'Under Review' }, { status: 'Returned', returnReason });
    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({ message: 'Error returning request', error: error.message });
  }
};