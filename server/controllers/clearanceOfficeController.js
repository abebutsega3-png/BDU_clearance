import mongoose from 'mongoose';
import Clearance from '../models/clearance.js';
import Notification from '../models/Notification.js';
import Role from '../models/role.js';
import User from '../models/User.js';
import { FINAL_HR_STAGE, MANUAL_ROUTABLE_OFFICES, normalizeRoutedOffice } from '../utils/clearanceWorkflow.js';

const normalized = (value) => normalizeRoutedOffice(value).toLowerCase();

const getAssignedOfficeRoles = async (user) => {
  const assignedRoles = [
    user?.role,
    user?.activeRole,
    ...(Array.isArray(user?.roles) ? user.roles : []),
  ]
    .map((role) => String(role?.name || role || '').trim())
    .filter(Boolean);

  if (!assignedRoles.length) return [];

  const escapedRoles = assignedRoles.map((role) => role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const officeRoles = await Role.find({
    name: { $in: escapedRoles.map((name) => new RegExp(`^${name}$`, 'i')) },
    isActive: true,
    isClearanceOffice: true,
  }).select('name').sort({ name: 1 }).lean();
  const builtInOfficeNames = new Set(MANUAL_ROUTABLE_OFFICES.map(normalized));
  return officeRoles.filter((role) => !builtInOfficeNames.has(normalized(role.name)));
};

const resolveRequestFilter = (id) => ({
  $or: [
    { requestId: id },
    ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : []),
  ],
});

const workflowStepForOffice = (request, office) => (
  Array.isArray(request.workflow)
    ? request.workflow.find((step) => normalized(step.office || step.name) === normalized(office))
    : null
);

export const getMyClearanceOffices = async (req, res) => {
  try {
    const roles = await getAssignedOfficeRoles(req.user);
    return res.status(200).json({ success: true, offices: roles.map(({ name }) => name) });
  } catch (error) {
    console.error('Unable to load the user clearance-office roles:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load your clearance-office roles.' });
  }
};

export const getOfficeRequests = async (req, res) => {
  try {
    const offices = await getAssignedOfficeRoles(req.user);
    const office = String(req.query.office || '').trim();
    if (!office || !offices.some((item) => normalized(item.name) === normalized(office))) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this clearance office.' });
    }

    const requests = await Clearance.find({
      departmentStatus: 'Approved',
      manualRoutingEnabled: true,
      assignedDepartments: { $in: [offices.find((item) => normalized(item.name) === normalized(office)).name] },
      status: { $nin: ['Completed', 'Cancelled', 'Rejected'] },
    }).sort({ updatedAt: -1 }).lean();

    const pendingRequests = requests.filter((request) => {
      const step = workflowStepForOffice(request, office);
      return step && ['pending', 'in progress', 'under review'].includes(String(step.status || '').toLowerCase());
    });
    return res.status(200).json({ success: true, requests: pendingRequests });
  } catch (error) {
    console.error('Unable to load clearance-office requests:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load clearance-office requests.' });
  }
};

export const reviewOfficeRequest = async (req, res) => {
  try {
    const officeRoles = await getAssignedOfficeRoles(req.user);
    const office = String(req.body?.office || '').trim();
    if (!office || !officeRoles.some((item) => normalized(item.name) === normalized(office))) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this clearance office.' });
    }

    const decision = String(req.body?.decision || '').trim().toLowerCase();
    const comment = String(req.body?.comment || '').trim();
    if (!['approve', 'return'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Choose approve or return for this office review.' });
    }
    if (decision === 'return' && !comment) {
      return res.status(400).json({ success: false, message: 'A reason is required when returning a request.' });
    }
    if (comment.length > 1000) {
      return res.status(400).json({ success: false, message: 'Office comments must be 1000 characters or fewer.' });
    }

    const request = await Clearance.findOne(resolveRequestFilter(req.params.id));
    if (!request) return res.status(404).json({ success: false, message: 'Clearance request not found.' });
    const assignedOffice = request.assignedDepartments?.find((item) => normalized(item) === normalized(office));
    if (!request.manualRoutingEnabled || request.departmentStatus !== 'Approved' || !assignedOffice) {
      return res.status(403).json({ success: false, message: 'This request has not been assigned to your office for review.' });
    }

    const step = workflowStepForOffice(request, assignedOffice);
    if (!step || !['Pending', 'In Progress', 'Under Review'].includes(String(step.status || 'Pending'))) {
      return res.status(409).json({ success: false, message: 'This office workflow step is not available for review.' });
    }

    const reviewedAt = new Date();
    const reviewer = req.user?.fullName || req.user?.name || office;
    const nextStatus = decision === 'approve' ? 'Approved' : 'Returned';
    request.workflow = (Array.isArray(request.workflow) ? request.workflow : []).map((item) => (
      normalized(item.office || item.name) === normalized(assignedOffice)
        ? {
          ...item,
          status: nextStatus,
          reviewedBy: reviewer,
          reviewedById: req.user?._id || null,
          ...(decision === 'approve' ? { approvedBy: reviewer, approvedById: req.user?._id || null } : {}),
          reviewedAt,
          updatedAt: reviewedAt,
          remarks: comment,
          ...(decision === 'return' ? { returnReason: comment } : {}),
        }
        : item
    ));
    request.logs = [
      ...(Array.isArray(request.logs) ? request.logs : []),
      {
        action: decision === 'approve' ? 'CLEARANCE_OFFICE_APPROVED' : 'CLEARANCE_OFFICE_RETURNED',
        office: assignedOffice,
        actor: reviewer,
        actorId: req.user?._id || null,
        comment,
        createdAt: reviewedAt,
      },
    ];

    if (decision === 'return') {
      request.status = 'Returned';
      request.overallStatus = 'Returned';
      request.currentStep = 'Employee';
      request.returnReason = comment;
      request.returnedReason = comment;
      request.returnedRemark = comment;
      request.returnedBy = reviewer;
      request.returnedOffice = assignedOffice;
      request.returnedAt = reviewedAt;
      request.affectedField = `${assignedOffice} Clearance`;
    } else {
      request.status = 'In Progress';
      request.overallStatus = 'In Progress';
      const requiredOfficeSteps = request.workflow.filter((item) => (
        !/department|final hr/i.test(String(item.office || item.name || ''))
      ));
      const allOfficesApproved = requiredOfficeSteps.every((item) => (
        ['approved', 'completed', 'cleared'].includes(String(item.status || '').toLowerCase())
      ));
      request.currentStep = allOfficesApproved ? FINAL_HR_STAGE : assignedOffice;
    }

    await request.save();

    if (decision === 'approve') {
      const hrUsers = await User.find({
        $or: [
          { role: { $regex: '^hr(?:\\s*officer)?$', $options: 'i' } },
          { activeRole: { $regex: '^hr(?:\\s*officer)?$', $options: 'i' } },
          { roles: { $regex: '^hr(?:\\s*officer)?$', $options: 'i' } },
        ],
      }).select('_id name');
      if (request.currentStep === FINAL_HR_STAGE && hrUsers.length) {
        await Notification.insertMany(hrUsers.map((user) => ({
          recipientId: user._id,
          targetName: user.name || 'HR Officer',
          title: 'Clearance Ready for Final HR Review',
          message: `All clearance offices have approved ${request.employeeName || 'the employee'}'s request ${request.requestId || ''}.`,
          type: 'CLEARANCE_READY_FOR_FINAL_HR',
          relatedRequestId: request.requestId,
          clearanceRequestId: request.requestId,
          actionText: 'Review Final Clearance',
          actionLink: '/hr-office/final-hr-clearance',
          isRead: false,
        })));
      }
    } else {
      const employeeUser = request.employeeId
        ? await User.findOne({ employeeId: request.employeeId }).select('_id name')
        : null;
      if (employeeUser) {
        await Notification.create({
          recipientId: employeeUser._id,
          targetName: employeeUser.name || request.employeeName || 'Employee',
          title: 'Clearance Request Returned',
          message: `${assignedOffice} returned clearance request ${request.requestId || ''}. Reason: ${comment}`,
          type: 'CLEARANCE_REQUEST_RETURNED',
          relatedRequestId: request.requestId,
          clearanceRequestId: request.requestId,
          actionText: 'Resolve Request',
          actionLink: '/employee/My%20Clearance',
          isRead: false,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: decision === 'approve' ? 'Office clearance approved.' : 'Request returned with your reason.',
      request,
    });
  } catch (error) {
    console.error('Unable to save clearance-office decision:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to save the clearance-office decision.' });
  }
};
