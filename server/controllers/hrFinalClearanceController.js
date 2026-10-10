import Clearance from '../models/clearance.js';
import Employee from '../models/employee.js';
import Role from '../models/role.js';
import ClearanceRequest from '../models/ClearanceRequest.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { notifyFinanceOfficers } from './financeclearancerequestController.js';
import {
  createIctClearanceRequestFromClearance,
  notifyIctOfficers,
} from './ictClearanceController.js';
import { sendNotificationEmail } from '../utils/emailService.js';
import { notifyTransportOfficers } from '../utils/transportNotifications.js';
import { isDepartmentHead } from '../utils/roleHelpers.js';
import {
  FINAL_HR_STAGE,
  MANUAL_ROUTABLE_OFFICES,
  isFinalHRStage,
  normalizeRoutedOffice,
  getFinalHROffices,
  isHRInitiatedRequest,
} from '../utils/clearanceWorkflow.js';

const getDateOnlyTimestamp = (value) => {
  if (!value) return Number.NaN;
  const dateText = value instanceof Date
    ? (Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10))
    : String(value).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText);
  if (!match) return Number.NaN;
  const [, year, month, day] = match;
  const timestamp = Date.UTC(Number(year), Number(month) - 1, Number(day));
  const parsed = new Date(timestamp);
  return parsed.getUTCFullYear() === Number(year)
    && parsed.getUTCMonth() === Number(month) - 1
    && parsed.getUTCDate() === Number(day)
    ? timestamp
    : Number.NaN;
};

const isHROfficer = (user) => ['hr', 'hr officer', 'human resources']
  .includes(String(user?.role || '').toLowerCase().replace(/[_-]+/g, ' ').trim());

const notifyDepartmentHeadsAfterInitialHR = async (clearance) => {
  const department = typeof clearance.department === 'object'
    ? clearance.department?.name || clearance.department?.departmentName
    : clearance.department;
  const escapedDepartment = String(department || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const heads = await User.find({
    $or: [
      { role: { $regex: '^department[ _]?head$', $options: 'i' } },
      { roles: { $regex: '^department[ _]?head$', $options: 'i' } },
    ],
    ...(escapedDepartment ? { department: { $regex: `^${escapedDepartment}$`, $options: 'i' } } : {}),
    ...(clearance.employeeId ? { employeeId: { $ne: clearance.employeeId } } : {}),
  }).select('_id name email notificationPreferences');
  if (!heads.length) return;
  const notifications = heads.map((head) => ({
    recipientId: head._id,
    targetName: head.name || 'Department Head',
    title: 'Clearance Request Ready for Department Review',
    message: `${clearance.employeeName || 'An employee'}'s request passed Initial HR Review and is ready for Department Head review.`,
    type: 'NEW_CLEARANCE_REQUEST',
    actionText: 'Review Request',
    actionLink: '/department-head/clearance-requests',
    relatedRequestId: clearance.requestId,
    clearanceRequestId: clearance.requestId,
    isRead: false,
  }));
  await Notification.insertMany(notifications);
  await Promise.all(heads.map((head, index) => sendNotificationEmail({
    recipient: head,
    title: notifications[index].title,
    message: notifications[index].message,
    actionLink: notifications[index].actionLink,
  })));
};

const isDepartmentHeadUser = (user) => [
  user?.role,
  ...(Array.isArray(user?.roles) ? user.roles : []),
].some(isDepartmentHead);

const notifyOfficesAfterDepartmentHeadSkip = async (clearance, offices) => {
  for (const office of offices) {
    const normalizedOffice = normalizeRoutedOffice(office);
    if (/^finance office$/i.test(normalizedOffice)) {
      await notifyFinanceOfficers({
        type: 'CLEARANCE_READY_FOR_FINANCE',
        employeeName: clearance.employeeName,
        requestId: clearance.requestId,
        department: typeof clearance.department === 'string' ? clearance.department : clearance.department?.name,
        clearanceReason: clearance.clearanceType,
      });
      continue;
    }
    if (/^ict office$/i.test(normalizedOffice)) {
      await createIctClearanceRequestFromClearance(clearance);
      await notifyIctOfficers({
        type: 'NEW_CLEARANCE_REQUEST',
        employeeName: clearance.employeeName,
        employeeId: clearance.employeeId,
        requestId: clearance.requestId,
        message: `${clearance.employeeName || 'An employee'}'s request passed Initial HR Review. Department Head approval was skipped because the requester is the Department Head. The request is ready for ICT review.`,
      });
      continue;
    }
    if (/^transport office$/i.test(normalizedOffice)) {
      await notifyTransportOfficers({
        type: 'TRANSPORT_NEW_CLEARANCE_REQUEST',
        title: 'New Clearance Request',
        message: `${clearance.employeeName || 'An employee'}'s request passed Initial HR Review. Department Head approval was skipped because the requester is the Department Head. The request is ready for Transport review.`,
        employeeName: clearance.employeeName,
        employeeId: clearance.employeeId,
        requestId: clearance.requestId,
        actionLink: '/transport-office/requests',
        actionText: 'Review Request',
      });
      continue;
    }

    const rolePattern = /^library$/i.test(normalizedOffice)
      ? /^library[ _]?officer$/i
      : /^property(?:\s*\/\s*asset)? office$/i.test(normalizedOffice)
        ? /^property(?:\s*\/\s*asset)?[ _]?officer$/i
        : new RegExp(`^${normalizedOffice.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const recipients = await User.find({
      $or: [
        { role: { $regex: rolePattern } },
        { roles: { $regex: rolePattern } },
      ],
    }).select('_id name role roles').lean();
    const notifications = [];
    for (const recipient of recipients) {
      if (await Notification.exists({
        recipientId: recipient._id,
        type: 'CLEARANCE_READY_FOR_OFFICE',
        relatedRequestId: clearance.requestId,
      })) continue;
      notifications.push({
        recipientId: recipient._id,
        targetName: clearance.employeeName || recipient.name || normalizedOffice,
        title: `Clearance Ready for ${normalizedOffice} Review`,
        message: `${clearance.employeeName || 'An employee'}'s request passed Initial HR Review. Department Head approval was skipped because the requester is the Department Head. The request is ready for ${normalizedOffice} review.`,
        type: 'CLEARANCE_READY_FOR_OFFICE',
        actionText: 'Review Request',
        actionLink: /^library$/i.test(normalizedOffice)
          ? `/library-office/clearance-requests?requestId=${encodeURIComponent(clearance.requestId || '')}`
          : /^property/i.test(normalizedOffice)
            ? '/property/clearance-requests'
            : undefined,
        relatedRequestId: clearance.requestId,
        clearanceRequestId: clearance.requestId,
        isRead: false,
      });
    }
    if (notifications.length) await Notification.insertMany(notifications);
  }
};

export const updateInitialHRDecision = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase().replace(/[_-]+/g, ' ').trim();
    if (!['hr', 'hr officer', 'human resources'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Only an HR Officer can complete Initial HR Review.' });
    }
    const { id } = req.params;
    const {
      decision,
      remarks = '',
      reason = '',
      affectedField = '',
      assessmentChecklist,
      assignedDepartments,
    } = req.body || {};
    const normalizedDecision = String(decision || '').trim().toLowerCase();
    const returnReason = String(reason || remarks).trim();
    if (!['in progress', 'approved', 'returned'].includes(normalizedDecision)) {
      return res.status(400).json({ success: false, message: 'Initial HR decision must be Start Review, Approved, or Returned.' });
    }
    if (normalizedDecision === 'returned' && !returnReason) {
      return res.status(400).json({ success: false, message: 'Return reason is required.' });
    }
    const manualRoutingRequested = Object.prototype.hasOwnProperty.call(req.body || {}, 'assignedDepartments');
    let selectedDepartments = [];
    if (normalizedDecision === 'approved' && !manualRoutingRequested) {
      return res.status(400).json({ success: false, message: 'Select the required clearance offices in HR Workflow before forwarding to the Department Head.' });
    }
    if (manualRoutingRequested) {
      if (!Array.isArray(assignedDepartments) || assignedDepartments.some((office) => typeof office !== 'string')) {
        return res.status(400).json({ success: false, message: 'Selected clearance offices must be provided as a list.' });
      }
      const configuredRoles = await Role.find({ isActive: true, isClearanceOffice: true }).select('name').lean();
      const allowedOffices = new Map(
        [...MANUAL_ROUTABLE_OFFICES, ...configuredRoles.map(({ name }) => name)]
          .map((office) => [normalizeRoutedOffice(office).toLowerCase(), normalizeRoutedOffice(office)])
          .filter(([key, office]) => key && office && !isFinalHRStage(office) && !/^department(\s|$)/i.test(office)),
      );
      const requestedOfficeKeys = assignedDepartments.map((office) => normalizeRoutedOffice(office).toLowerCase());
      if (requestedOfficeKeys.some((office) => !office || !allowedOffices.has(office))) {
        return res.status(400).json({ success: false, message: 'One or more selected clearance offices are invalid.' });
      }
      selectedDepartments = [...new Set(requestedOfficeKeys.map((office) => allowedOffices.get(office)))];
    }

    const clearanceFilter = {
      $or: [{ requestId: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }],
    };
    const current = await Clearance.findOne(clearanceFilter);
    if (!current) return res.status(404).json({ success: false, message: 'Clearance request not found.' });
    if (current.initialHRStatus === 'Approved') {
      if (normalizedDecision === 'approved') return res.json({ success: true, clearance: current, message: 'Initial HR decision already saved.' });
      return res.status(400).json({ success: false, message: 'This request has already passed Initial HR Review.' });
    }

    if (normalizedDecision === 'in progress') {
      current.initialHRStatus = 'Under Review';
      current.initialHRReviewedBy = req.user?.fullName || req.user?.name || 'HR Officer';
      current.initialHRReviewedById = req.user?._id || null;
      current.initialHRReviewedAt = new Date();
      current.currentStep = 'Initial HR Review';
      current.status = 'Pending';
      await current.save();
      return res.json({ success: true, clearance: current });
    }
    if (current.initialHRStatus !== 'Under Review') {
      return res.status(400).json({ success: false, message: 'Start Initial HR Review before submitting a decision.' });
    }

    const approved = normalizedDecision === 'approved';
    if (approved && !current.initialHRAssessmentCompleted) {
      return res.status(409).json({ success: false, message: 'Complete HR Assessment before assigning offices and forwarding to the Department Head.' });
    }
    if (approved && manualRoutingRequested) {
      const checklistKeys = [
        'empInfoVerified',
        'clearanceRequestVerified',
        'documentVerified',
        'employmentVerified',
        'noDuplicateRequest',
      ];
      if (!assessmentChecklist || checklistKeys.some((key) => assessmentChecklist[key] !== true)) {
        return res.status(400).json({ success: false, message: 'Pass every HR assessment checklist item before routing the request.' });
      }
    }
    if (assessmentChecklist !== undefined) {
      const checklistKeys = [
        'empInfoVerified',
        'clearanceRequestVerified',
        'documentVerified',
        'employmentVerified',
        'noDuplicateRequest',
      ];
      if (!assessmentChecklist || typeof assessmentChecklist !== 'object' || Array.isArray(assessmentChecklist)
        || checklistKeys.some((key) => typeof assessmentChecklist[key] !== 'boolean')) {
        return res.status(400).json({ success: false, message: 'All assessment checklist items must be answered.' });
      }
      current.assessmentChecklist = Object.fromEntries(
        checklistKeys.map((key) => [key, assessmentChecklist[key]]),
      );
    }
    if (approved && assessmentChecklist !== undefined
      && ['empInfoVerified', 'clearanceRequestVerified', 'documentVerified', 'employmentVerified', 'noDuplicateRequest']
        .some((key) => assessmentChecklist[key] !== true)) {
      return res.status(400).json({ success: false, message: 'Cannot approve until all assessment checklist items pass.' });
    }
    if (approved) {
      const departmentName = typeof current.department === 'object'
        ? current.department?.departmentName || current.department?.name
        : current.department;
      if (!current.employeeId || !current.clearanceType || !current.reason || !current.lastWorkingDate || !departmentName) {
        return res.status(400).json({
          success: false,
          message: 'Employee, department, separation type, reason, and last working date are required before approval.',
        });
      }
      const employeeRecord = await Employee.exists({ employeeId: current.employeeId });
      if (!employeeRecord) {
        return res.status(400).json({
          success: false,
          message: 'No employee record matches this employee ID. Return the request for correction.',
        });
      }
      const lastWorkingDate = getDateOnlyTimestamp(current.lastWorkingDate);
      const requestDate = getDateOnlyTimestamp(current.requestDate || current.createdAt);
      if (Number.isNaN(lastWorkingDate) || Number.isNaN(requestDate)
        || (current.requestSource !== 'HR Officer' && lastWorkingDate < requestDate)) {
        return res.status(400).json({
          success: false,
          message: current.requestSource === 'HR Officer'
            ? 'Last working date and request date must be valid.'
            : 'Last working date must be valid and cannot be earlier than the request date.',
        });
      }
      const duplicate = current.employeeId
        ? await Clearance.exists({
          employeeId: current.employeeId,
          _id: { $ne: current._id },
          status: { $nin: ['Completed', 'Cancelled', 'Rejected'] },
        })
        : false;
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'Another active clearance request exists for this employee.',
        });
      }
    }
    const employeeUser = approved ? await findEmployeeUser(current) : null;
    const skipDepartmentHeadApproval = approved && isDepartmentHeadUser(employeeUser);
    current.initialHRStatus = approved ? 'Approved' : 'Returned';
    if (!approved) current.initialHRAssessmentCompleted = false;
    current.initialHRReviewedBy = req.user?.fullName || req.user?.name || 'HR Officer';
    current.initialHRReviewedById = req.user?._id || null;
    current.initialHRReviewedAt = new Date();
    const reviewerName = req.user?.fullName || req.user?.name || 'HR Officer';
    const returnRemark = String(remarks).trim();
    current.initialHRRemarks = returnRemark;
    current.hrComment = returnRemark;
    current.initialHRReviewedBy = reviewerName;
    current.returnReason = approved ? '' : returnReason;
    current.officerComment = returnRemark;
    current.returnedBy = approved ? '' : reviewerName;
    current.returnedOffice = approved ? '' : 'HR Officer';
    current.returnedAt = approved ? null : current.initialHRReviewedAt;
    current.returnedReason = approved ? '' : returnReason;
    current.returnedRemark = approved ? '' : returnRemark;
    current.affectedField = approved ? '' : String(affectedField).trim();
    if (!approved) {
      current.logs.push({
        action: 'RETURNED_BY_HR',
        actor: reviewerName,
        actorId: req.user?._id || null,
        reason: returnReason,
        remark: returnRemark,
        affectedField: String(affectedField).trim(),
        createdAt: current.initialHRReviewedAt,
      });
    }
    current.status = approved ? 'In Progress' : 'Returned';
    current.overallStatus = approved ? 'In Progress' : 'Returned';
    current.currentStep = approved
      ? (skipDepartmentHeadApproval ? selectedDepartments[0] || FINAL_HR_STAGE : 'Department Head')
      : 'Employee';
    if (skipDepartmentHeadApproval) {
      current.departmentStatus = 'Approved';
      current.departmentReviewedBy = 'System (self-approval skipped)';
      current.departmentReviewedById = null;
      current.departmentReviewedAt = current.initialHRReviewedAt;
      current.departmentComment = 'Department Head approval skipped because the requester is the Department Head.';
    }
    current.workflow = (Array.isArray(current.workflow) ? current.workflow : []).map((step) => {
      if (/initial\s*hr|hr\s*review/i.test(String(step.office || step.name || ''))) {
        return { ...step, office: 'Initial HR Review', status: approved ? 'Completed' : 'Rejected', reviewedBy: reviewerName, reviewedById: req.user?._id || null, reviewedAt: current.initialHRReviewedAt, updatedAt: current.initialHRReviewedAt, remarks: returnRemark, returnReason: approved ? '' : returnReason, affectedField: approved ? '' : String(affectedField).trim() };
      }
      if (/department/i.test(String(step.office || step.name || ''))) {
        return {
          ...step,
          status: skipDepartmentHeadApproval ? 'Completed' : 'Pending',
          updatedAt: new Date(),
          ...(skipDepartmentHeadApproval ? {
            reviewedBy: 'System (self-approval skipped)',
            reviewedAt: current.initialHRReviewedAt,
            remarks: current.departmentComment,
          } : {}),
        };
      }
      return step;
    });
    if (approved && manualRoutingRequested) {
      current.manualRoutingEnabled = true;
      current.assignedDepartments = selectedDepartments;
      current.requiredOffices = [
        ...(skipDepartmentHeadApproval ? [] : ['Department Head']),
        ...selectedDepartments,
        FINAL_HR_STAGE,
      ];
      const requiredOfficeKeys = new Set(current.requiredOffices.map((office) => office.toLowerCase()));
      current.workflow = current.workflow.filter((step) => {
        const office = String(step.office || step.name || '').trim();
        return /initial\s*hr|hr\s*review/i.test(office)
          || (skipDepartmentHeadApproval && /department/i.test(office))
          || requiredOfficeKeys.has(normalizeRoutedOffice(office).toLowerCase());
      });
      const workflowOfficeKeys = new Set(current.workflow.map((step) =>
        normalizeRoutedOffice(step.office || step.name || '').toLowerCase()
      ));
      current.requiredOffices.forEach((office) => {
        if (!workflowOfficeKeys.has(normalizeRoutedOffice(office).toLowerCase())) {
          current.workflow.push({ office, status: 'Pending', updatedAt: current.initialHRReviewedAt });
        }
      });
    }
    await current.save();

    await ClearanceRequest.updateOne(
      { requestId: current.requestId },
      {
        $set: {
          status: approved ? 'In Progress' : 'Returned',
          overallStatus: approved ? 'In Progress' : 'Returned',
          officerComment: approved ? '' : returnRemark,
          returnReason: approved ? '' : returnReason,
          returnedBy: approved ? '' : reviewerName,
          returnedOffice: approved ? '' : 'HR Officer',
          returnedAt: approved ? null : current.initialHRReviewedAt,
          returnedReason: approved ? '' : returnReason,
          returnedRemark: approved ? '' : returnRemark,
          affectedField: approved ? '' : String(affectedField).trim(),
          updatedAt: new Date(),
        },
      },
    );

    const employeeNotificationTitle = approved ? 'Clearance Accepted by HR' : 'Clearance Returned by HR';
    const employeeNotificationMessage = approved
      ? skipDepartmentHeadApproval
        ? 'Your clearance request passed Initial HR Review. Department Head approval was skipped because you are the Department Head, and the request was routed to the selected clearance offices.'
        : 'Your clearance request passed Initial HR Review and was sent to your Department Head.'
      : `Please correct your clearance information and resubmit it. Reason: ${String(remarks).trim()}`;
    const employeeNotificationLink = '/employee/My%20Clearance';
    await Notification.create({
      recipientId: employeeUser?._id || null,
      employeeId: current.employeeId || employeeUser?.employeeId || '',
      targetName: current.employeeName || 'Employee',
      title: employeeNotificationTitle,
      message: employeeNotificationMessage,
      type: approved ? 'INITIAL_HR_APPROVED' : 'CLEARANCE_REQUEST_RETURNED',
      actionText: approved ? 'View Clearance' : 'Correct and Resubmit',
      actionLink: employeeNotificationLink,
      relatedRequestId: current.requestId,
      clearanceRequestId: current.requestId,
      isRead: false,
    });
    await sendNotificationEmail({
      recipient: employeeUser,
      title: employeeNotificationTitle,
      message: employeeNotificationMessage,
      actionLink: employeeNotificationLink,
    });
    if (approved) {
      if (skipDepartmentHeadApproval) {
        await notifyOfficesAfterDepartmentHeadSkip(current, selectedDepartments);
      } else {
        await notifyDepartmentHeadsAfterInitialHR(current);
      }
    }
    return res.json({
      success: true,
      clearance: current,
      departmentApprovalSkipped: skipDepartmentHeadApproval,
    });
  } catch (error) {
    console.error('Error updating initial HR decision:', error);
    return res.status(500).json({ success: false, message: 'Unable to save Initial HR decision.' });
  }
};

const approvedStatuses = ['approved', 'completed', 'cleared'];

const employeeFilter = (employeeId) => ({
  $or: [
    { employeeId },
    ...(mongoose.Types.ObjectId.isValid(employeeId) ? [{ _id: employeeId }] : []),
  ],
});

const getEmployeeProfile = async (employeeId) => {
  if (!employeeId) return null;
  const [employee, user] = await Promise.all([
    Employee.findOne(employeeFilter(employeeId)).select('-password -createdBy').lean(),
    User.findOne({ employeeId }).select('employeeId name email phoneNumber department position campus employmentType').lean(),
  ]);
  if (!employee && !user) return null;
  return {
    ...user,
    ...employee,
    fullName: employee?.fullName || user?.name || '',
    employeeId: employee?.employeeId || user?.employeeId || employeeId,
    position: employee?.position || user?.position || '',
    department: employee?.department || user?.department || '',
    campus: employee?.campus || user?.campus || '',
    phone: employee?.phone || user?.phoneNumber || '',
    email: employee?.email || user?.email || '',
    employmentType: employee?.employmentType || user?.employmentType || '',
  };
};

const officeAliases = {
  'department head': 'Department Head',
  department: 'Department Head',
  finance: 'Finance Office',
  'finance office': 'Finance Office',
  property: 'Property / Asset Office',
  'property office': 'Property / Asset Office',
  'property management': 'Property / Asset Office',
  'property / asset office': 'Property / Asset Office',
  ict: 'ICT Office',
  'ict center': 'ICT Office',
  'ict office': 'ICT Office',
  library: 'Library',
  'library office': 'Library',
  transport: 'Transport Office',
  'transport office': 'Transport Office',
  'transport clearance request': 'Transport Office',
};

const normalizeOfficeName = (value) => {
  const name = String(value || '').trim().toLowerCase();
  const compactName = name.replace(/[^a-z0-9]+/g, '');
  if (officeAliases[name]) return officeAliases[name];
  if (compactName.includes('department')) return 'Department Head';
  if (compactName.includes('finance')) return 'Finance Office';
  if (compactName.includes('property') || compactName.includes('asset')) return 'Property / Asset Office';
  if (compactName.includes('ict')) return 'ICT Office';
  if (compactName.includes('library')) return 'Library';
  if (compactName.includes('transport')) return 'Transport Office';
  return value;
};

const getRequiredCoreOffices = (clearance) => {
  return getFinalHROffices(clearance);
};

const normalizeOfficeStatus = (value) => String(value || '').trim().toLowerCase();
const isReviewerRoleLabel = (value) => /^(hr(?: officer)?|finance officer|department head|library officer|property(?:\s*\/\s*asset)? officer|ict officer|transport officer)$/i
  .test(String(value || '').trim());

const findEmployeeUser = async (clearance) => {
  let user = null;
  if (clearance.employeeId) {
    user = await User.findOne({ employeeId: clearance.employeeId }).select('_id name employeeId email notificationPreferences role roles').lean();
  }

  if (!user) {
    user = await User.findOne({
      name: clearance.employeeName,
      role: { $regex: /^(employee|standard user|user)$/i },
    }).select('_id name employeeId email notificationPreferences role roles').lean();
  }

  if (!user?.email && clearance.employeeId) {
    const employee = await Employee.findOne(employeeFilter(clearance.employeeId)).select('email').lean();
    if (employee?.email) return { ...user, email: employee.email };
  }

  return user;
};

const getOfficeProgress = (clearance) => {
  const workflow = [
    ...(Array.isArray(clearance.workflow) ? clearance.workflow : []),
    ...(Array.isArray(clearance.departmentClearances) ? clearance.departmentClearances : []),
  ];
  const statusFields = {
    'Finance Office': clearance.financeStatus,
    'ICT Office': clearance.ictStatus,
    'Property / Asset Office': clearance.propertyStatus,
    'Department Head': clearance.departmentStatus,
    Library: clearance.libraryStatus,
    'Transport Office': clearance.transportStatus,
  };
  return getRequiredCoreOffices(clearance).map((office) => {
    const matches = workflow.filter((step) => normalizeOfficeName(step.office || step.name || step.department) === office);
    const approvedStep = [...matches].reverse().find((candidate) => approvedStatuses.includes(normalizeOfficeStatus(candidate.status)));
    const step = approvedStep
      || [...matches].reverse().find((candidate) => !['pending', ''].includes(normalizeOfficeStatus(candidate.status)))
      || matches[matches.length - 1]
      || {};
    const workflowStatus = String(step.status || '').trim();
    const fieldStatus = String(statusFields[office] || '').trim();
    const status = approvedStatuses.includes(normalizeOfficeStatus(fieldStatus))
      ? fieldStatus
      : fieldStatus && !['pending', ''].includes(fieldStatus.toLowerCase())
      ? fieldStatus
      : workflowStatus || fieldStatus || 'Pending';
    const officeReviewer = {
      'Finance Office': clearance.financeReviewedBy,
      'ICT Office': clearance.ictReviewedBy || clearance.ictClearance?.reviewedBy,
      'Property / Asset Office': clearance.propertyReviewedBy,
      'Department Head': clearance.departmentReviewedBy || clearance.departmentClearance?.reviewedBy,
      Library: clearance.libraryReviewedBy || clearance.libraryClearance?.reviewedBy,
      'Transport Office': clearance.transportReviewedBy,
    }[office] || '';
    const officeReviewerId = {
      'Finance Office': clearance.financeReviewedById,
      'ICT Office': clearance.ictReviewedById || clearance.ictClearance?.reviewedById,
      'Property / Asset Office': clearance.propertyReviewedById,
      'Department Head': clearance.departmentReviewedById || clearance.departmentClearance?.reviewedById,
      Library: clearance.libraryReviewedById || clearance.libraryClearance?.reviewedById,
      'Transport Office': clearance.transportReviewedById,
    }[office] || '';
    const workflowReviewers = [step.approvedBy, step.reviewedBy, step.clearedBy, step.performedBy, step.officerName]
      .filter(Boolean);
    const workflowReviewer = workflowReviewers.find((reviewer) => !isReviewerRoleLabel(reviewer))
      || workflowReviewers[0]
      || '';
    const officeDate = {
      'Finance Office': clearance.financeReviewedAt,
      'ICT Office': clearance.ictReviewedAt,
      'Property / Asset Office': clearance.propertyReviewedAt,
      'Department Head': clearance.departmentReviewedAt,
      Library: clearance.libraryReviewedAt,
      'Transport Office': clearance.transportReviewedAt,
    }[office] || null;
    const officeRemarks = office === 'Property / Asset Office'
      ? clearance.officerComment
      : office === 'Transport Office'
        ? clearance.transportReturnReason || clearance.transportReview?.officerNotes || ''
        : '';
    return {
      office,
      status,
      clearedBy: officeReviewer && !isReviewerRoleLabel(officeReviewer)
        ? officeReviewer
        : workflowReviewer || officeReviewer || '-',
      reviewerId: officeReviewerId || step.reviewerId || step.reviewedById || step.approvedById || step.performedById || '',
      clearedDate: officeDate || step.clearedDate || step.completedAt || step.reviewedAt || step.timestamp || step.updatedAt || '-',
      remarks: step.remarks || step.comment || step.returnReason || officeRemarks || '',
    };
  });
};

const getOfficeCounts = (clearance) => {
  const offices = getOfficeProgress(clearance);
  const approvedCount = offices.filter((office) => approvedStatuses.includes(String(office.status).toLowerCase())).length;
  return { offices, approvedCount, totalOffices: offices.length };
};

const resolveOfficeReviewers = async (offices) => {
  const reviewerIds = offices
    .map((office) => office.reviewerId || office.clearedBy)
    .filter((value) => mongoose.Types.ObjectId.isValid(String(value || '')));
  const users = reviewerIds.length
    ? await User.find({ _id: { $in: reviewerIds } }).select('_id name').lean()
    : [];
  const names = new Map(users.map((user) => [String(user._id), user.name || '—']));
  return offices.map((office) => {
    const reviewerId = office.reviewerId || office.clearedBy;
    const storedName = names.get(String(reviewerId)) || office.clearedBy;
    const isRoleLabel = !storedName || storedName === '-' || storedName === '—' || isReviewerRoleLabel(storedName);
    return {
      ...office,
      clearedBy: isRoleLabel ? '—' : storedName,
    };
  });
};

// GET HR Final Clearance Details
export const getHRFinalClearanceDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Find clearance by ID or request ID
    let clearance = await Clearance.findOne({
      $or: [
        { requestId: id },
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }
      ]
    }).lean();

    if (!clearance) {
      return res.status(404).json({
        success: false,
        message: 'Clearance request not found'
      });
    }

    // Get employee details
    const employeeData = await getEmployeeProfile(clearance.employeeId);

    // Get clearance request details
    let clearanceRequest = null;
    if (clearance.requestId) {
      clearanceRequest = await ClearanceRequest.findOne({
        requestId: clearance.requestId
      }).lean();
    }

    // Calculate progress
    const { offices: rawDepartmentClearances, approvedCount, totalOffices: totalDepartments } = getOfficeCounts(clearance);
    const departmentClearances = await resolveOfficeReviewers(rawDepartmentClearances);
    const initialHRReview = [...(Array.isArray(clearance.workflow) ? clearance.workflow : [])]
      .reverse()
      .find((step) => /initial\s*hr|hr\s*review/i.test(String(step.office || step.name || '')));
    const initialHRReviewerNames = [
      initialHRReview?.reviewedBy,
      initialHRReview?.approvedBy,
      initialHRReview?.clearedBy,
      initialHRReview?.performedBy,
      initialHRReview?.officerName,
      clearance.initialHRReviewedBy,
    ].filter(Boolean);
    const initialHRReviewer = await resolveOfficeReviewers([{
      clearedBy: initialHRReviewerNames.find((name) => !isReviewerRoleLabel(name)) || initialHRReviewerNames[0],
      reviewerId: clearance.initialHRReviewedById || initialHRReview?.reviewedById
        || initialHRReview?.approvedById || initialHRReview?.performedById || initialHRReview?.reviewerId,
    }]);
    const finalHRReviewer = await resolveOfficeReviewers([{
      clearedBy: clearance.finalHRReviewedBy || clearance.certificate?.generatedBy,
      reviewerId: clearance.finalHRReviewedById || clearance.certificate?.generatedById,
    }]);
    const progress = totalDepartments === 0
      ? (clearance.initialHRStatus === 'Approved' && clearance.departmentStatus === 'Approved' ? 100 : 0)
      : Math.round((approvedCount / totalDepartments) * 100);

    // Outstanding items
    const outstandingItems = Array.isArray(clearance.outstandingItems)
      ? clearance.outstandingItems
      : [];

    // Build comprehensive response
    const response = {
      success: true,
      clearance: {
        _id: clearance._id,
        requestId: clearance.requestId,
        status: clearance.status,
        initialHRStatus: clearance.initialHRStatus || 'Pending',
        departmentStatus: clearance.departmentStatus || 'Pending',
        manualRoutingEnabled: clearance.manualRoutingEnabled === true,
        assignedDepartments: clearance.assignedDepartments || [],
        requiredOffices: clearance.requiredOffices || [],
        requestSource: clearance.requestSource || 'Employee Portal',
        requestedByRole: clearance.requestedByRole || (isHRInitiatedRequest(clearance) ? 'HR_OFFICER' : 'EMPLOYEE'),
        isHRInitiated: isHRInitiatedRequest(clearance),
        initiatedBy: clearance.initiatedBy || null,
        initiatedByName: clearance.initiatedByName || '',
        initialHRRemarks: clearance.initialHRRemarks || '',
        
        // Employee Information
        employeeId: clearance.employeeId,
        employeeName: employeeData?.fullName || clearance.employeeName || 'Unknown employee',
        employee: employeeData ? {
          fullName: employeeData.fullName,
          employeeId: employeeData.employeeId,
          department: employeeData.department,
          position: employeeData.position,
          campus: employeeData.campus,
          employmentType: employeeData.employmentType,
          status: employeeData.status || '',
          supervisor: employeeData.supervisor || '-',
          hireDate: employeeData.hireDate,
          lastWorkingDate: clearance.lastWorkingDate,
          email: employeeData.email,
          phone: employeeData.phone
        } : {
          fullName: clearance.employeeName || 'Unknown employee',
          employeeId: clearance.employeeId || '-',
          department: clearance.department?.name || 'Not assigned',
          position: 'Not assigned',
          campus: 'Not assigned',
          employmentType: 'Not assigned',
          status: '-',
          supervisor: '-',
          hireDate: '-',
          lastWorkingDate: clearance.lastWorkingDate,
          email: '-',
          phone: '-'
        },

        // Clearance Request Information
        clearanceType: clearance.clearanceType || clearanceRequest?.clearanceReason || 'Resignation',
        reason: clearance.reason || clearanceRequest?.clearanceReason || 'Personal reason',
        requestDate: clearance.requestDate || clearanceRequest?.requestDate || new Date().toISOString(),
        submissionDate: clearanceRequest?.submittedDate || clearance.requestDate,
        lastWorkingDate: clearance.lastWorkingDate,
        expectedLastWorkingDate: clearanceRequest?.expectedLastWorkingDate,
        initialHRReviewedBy: initialHRReviewer[0].clearedBy,
        initialHRReviewedById: clearance.initialHRReviewedById || null,
        initialHRReviewedAt: clearance.initialHRReviewedAt,
        returnedBy: clearance.returnedBy || (clearance.initialHRStatus === 'Returned' ? clearance.initialHRReviewedBy : ''),
        returnedOffice: clearance.returnedOffice || (clearance.initialHRStatus === 'Returned' ? 'HR Officer' : ''),
        returnedAt: clearance.returnedAt || (clearance.initialHRStatus === 'Returned' ? clearance.initialHRReviewedAt : null),
        returnedReason: clearance.returnedReason || clearance.returnReason || clearance.initialHRRemarks || '',
        returnedRemark: clearance.returnedRemark || clearance.initialHRRemarks || clearance.officerComment || '',
        affectedField: clearance.affectedField || '',
        financeReviewedBy: clearance.financeReviewedBy,
        financeReviewedAt: clearance.financeReviewedAt,
        libraryReviewedBy: clearance.libraryReviewedBy || clearance.libraryClearance?.reviewedBy,
        libraryReviewedAt: clearance.libraryReviewedAt,
        propertyReviewedBy: clearance.propertyReviewedBy,
        propertyReviewedAt: clearance.propertyReviewedAt,
        ictReviewedBy: clearance.ictReviewedBy || clearance.ictClearance?.reviewedBy,
        ictReviewedAt: clearance.ictReviewedAt,
        departmentReviewedBy: clearance.departmentReviewedBy || clearance.departmentClearance?.reviewedBy,
        departmentReviewedAt: clearance.departmentReviewedAt,
        supportingDocument: clearance.supportingDocument || clearance.documentUrl || clearance.attachment || '',

        // Department Clearances
        departmentClearances: departmentClearances.map(d => ({
          name: d.office,
          status: d.status || 'Pending',
          clearedBy: d.clearedBy || d.by || '-',
          clearedDate: d.clearedDate || d.date || '-',
          remarks: d.remarks || 'No remarks'
        })),

        // Outstanding Items
        outstandingItems: outstandingItems,

        // Progress
        progress: progress,
        completedDepartments: approvedCount,
        totalDepartments: totalDepartments,
        progressLabel: progress >= 100 ? 'Completed' : progress >= 60 ? 'In progress' : 'Pending',

        // HR Remarks
        hrRemarks: clearance.hrRemarks || '',

        // Checklist
        checklistCompleted: clearance.checklistCompleted || false,
        finalHRApproval: clearance.finalHRApproval === true || clearance.status === 'Completed',
        finalHRReviewedBy: finalHRReviewer[0].clearedBy,
        finalHRReviewedById: clearance.finalHRReviewedById || clearance.certificate?.generatedById || null,
        finalHRReviewedByPosition: clearance.finalHRReviewedByPosition || clearance.certificate?.generatedByPosition || '',

        // Clearance History
        history: clearance.workflow || [],

        // Timestamps
        createdAt: clearance.createdAt,
        updatedAt: clearance.updatedAt
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching HR final clearance:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch clearance details',
      error: error.message
    });
  }
};

// UPDATE HR Final Decision
export const updateHRFinalDecision = async (req, res) => {
  try {
    if (!isHROfficer(req.user)) {
      return res.status(403).json({ success: false, message: 'Only an HR Officer can complete final clearance.' });
    }
    const { id } = req.params;
    const { decision: requestedDecision, status, action, remarks, reason, affectedField, checklistCompleted } = req.body;
    const rawDecision = requestedDecision || status || action;

    // Validate decision
    const validDecisions = ['Pending', 'In Progress', 'Approved', 'Completed', 'Returned', 'Rejected'];
    const decisionAliases = {
      pending: 'Pending',
      'in progress': 'In Progress',
      approve: 'Approved',
      approved: 'Approved',
      'approve request': 'Approved',
      complete: 'Completed',
      completed: 'Completed',
      return: 'Returned',
      returned: 'Returned',
      'return request': 'Returned',
      reject: 'Rejected',
      rejected: 'Rejected',
    };
    const decision = decisionAliases[String(rawDecision || '').trim().toLowerCase()];
    if (!decision || !validDecisions.includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid decision status'
      });
    }
    const finalReviewer = req.user?.fullName || req.user?.name || 'HR Officer';
    const finalReturnReason = String(reason || remarks || '').trim();
    const finalReturnRemark = String(remarks || '').trim();

    const clearanceFilter = {
      $or: [
        { requestId: id },
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }
      ]
    };
    const currentClearance = await Clearance.findOne(clearanceFilter).lean();
    if (!currentClearance) {
      return res.status(404).json({ success: false, message: 'Clearance request not found' });
    }
    if (currentClearance.initialHRStatus !== 'Approved' || currentClearance.departmentStatus !== 'Approved') {
      return res.status(400).json({ success: false, message: 'Final HR review is available only after Initial HR and Department Head approval.' });
    }
    const currentCounts = getOfficeCounts(currentClearance);
    if (currentCounts.approvedCount !== currentCounts.totalOffices) {
      return res.status(400).json({ success: false, message: `Final HR approval requires all ${currentCounts.totalOffices} offices to be approved. Current progress: ${currentCounts.approvedCount}/${currentCounts.totalOffices}.` });
    }

    // Find and update clearance
    const clearance = await Clearance.findOneAndUpdate(
      clearanceFilter,
      {
        $set: {
          status: decision,
            overallStatus: decision,
            returnReason: decision === 'Returned' || decision === 'Rejected' ? finalReturnReason : '',
            officerComment: remarks || '',
            reviewedAt: new Date(),
            returnedBy: decision === 'Returned' || decision === 'Rejected' ? finalReviewer : '',
            returnedOffice: decision === 'Returned' || decision === 'Rejected' ? 'HR Officer' : '',
            returnedAt: decision === 'Returned' || decision === 'Rejected' ? new Date() : null,
            returnedReason: decision === 'Returned' || decision === 'Rejected' ? finalReturnReason : '',
            returnedRemark: decision === 'Returned' || decision === 'Rejected' ? finalReturnRemark : '',
            affectedField: decision === 'Returned' || decision === 'Rejected' ? String(affectedField || 'Final HR Clearance') : '',
          finalHRApproval: decision === 'Completed',
          finalHRReviewedBy: decision === 'Completed' ? finalReviewer : '',
          finalHRReviewedById: decision === 'Completed' ? req.user?._id || null : null,
          finalHRReviewedByPosition: decision === 'Completed'
            ? req.user?.position || req.user?.role || 'HR Officer'
            : '',
          hrRemarks: remarks || '',
          checklistCompleted: Boolean(checklistCompleted),
          updatedAt: new Date()
        },
        $push: {
          workflow: {
            action: `HR Final Clearance ${decision}`,
            performedBy: finalReviewer,
            performedById: req.user?._id || null,
            timestamp: new Date(),
            status: decision,
            remarks: remarks
          }
        }
      },
      { returnDocument: 'after', runValidators: true }
    ).lean();

    if (!clearance) {
      return res.status(404).json({
        success: false,
        message: 'Clearance request not found'
      });
    }

    // Keep the employee-facing request in sync with the HR decision.
    if (decision === 'Completed' || decision === 'Approved' || decision === 'In Progress' || decision === 'Returned' || decision === 'Rejected') {
      await ClearanceRequest.updateOne(
        { requestId: clearance.requestId },
        {
          $set: {
            status: decision,
            overallStatus: decision,
            ...(decision === 'Returned' || decision === 'Rejected' ? {
              returnedBy: finalReviewer,
              returnedOffice: 'HR Officer',
              returnedAt: new Date(),
              returnedReason: finalReturnReason,
              returnedRemark: finalReturnRemark,
              affectedField: String(affectedField || 'Final HR Clearance'),
            } : {}),
            updatedAt: new Date()
          }
        }
      );

      const employeeUser = await findEmployeeUser(clearance);

      const employeeMessage = decision === 'Approved' || decision === 'In Progress'
        ? 'Your clearance request has been approved and sent to the required offices.'
        : decision === 'Returned' || decision === 'Rejected'
          ? `Your clearance request was returned by the HR Office. Reason: ${remarks || 'Please review and correct the request.'}`
          : 'All required offices have completed your clearance. Your request is now under final HR processing.';

      const employeeTitle = decision === 'Approved' || decision === 'In Progress'
        ? 'Clearance Request Approved'
        : decision === 'Returned' || decision === 'Rejected' ? 'Clearance Request Returned' : 'All Clearances Completed';
      const employeeActionLink = '/employee/My%20Clearance';
      await Notification.create({
        recipientId: employeeUser?._id || null,
        employeeId: clearance.employeeId || employeeUser?.employeeId || '',
        targetName: clearance.employeeName || 'Employee',
        title: employeeTitle,
        message: employeeMessage,
        type: decision === 'Approved' || decision === 'In Progress' ? 'CLEARANCE_UPDATED' : decision === 'Returned' || decision === 'Rejected' ? 'CLEARANCE_REQUEST_RETURNED' : 'ALL_CLEARANCES_COMPLETED',
        actionText: decision === 'Returned' || decision === 'Rejected' ? 'View Request & Resubmit' : 'View Clearance',
        actionLink: employeeActionLink,
        relatedRequestId: clearance.requestId || null,
        clearanceRequestId: clearance.requestId || null,
        isRead: false,
      });
      await sendNotificationEmail({
        recipient: employeeUser,
        title: employeeTitle,
        message: employeeMessage,
        actionLink: employeeActionLink,
        notificationKey: decision === 'Completed' ? 'employeeClearanceCompleted' : undefined,
      });

      if (decision === 'Completed' && currentCounts.approvedCount === currentCounts.totalOffices) {
        const hrOfficers = await User.find({ role: { $regex: '^hr officer$', $options: 'i' } }).select('_id name email notificationPreferences');
        const notifications = hrOfficers.map((officer) => ({
          recipientId: officer._id,
          targetName: officer.name || 'HR Officer',
          title: 'Certificate Ready',
          message: `${clearance.employeeName || 'Employee'}'s clearance has been fully completed and approved. The certificate is ready to generate.`,
          type: 'certificate_available',
          actionText: 'Generate Certificate',
          actionLink: '/hr-office/final-hr-clearance',
          relatedRequestId: clearance.requestId || null,
          clearanceRequestId: clearance.requestId || null,
          isRead: false,
        }));
        await Notification.insertMany(notifications);
        await Promise.all(hrOfficers.map((officer, index) => sendNotificationEmail({
          recipient: officer,
          title: notifications[index].title,
          message: notifications[index].message,
          actionLink: notifications[index].actionLink,
          notificationKey: 'employeeClearanceCompleted',
        })));
        await notifyFinanceOfficers({
          type: 'CLEARANCE_COMPLETED',
          employeeName: clearance.employeeName,
          requestId: clearance.requestId,
        });
        await notifyFinanceOfficers({
          type: 'FINAL_HR_CLEARANCE_COMPLETED',
          employeeName: clearance.employeeName,
          requestId: clearance.requestId,
        });
      }
    }

    res.json({
      success: true,
      message: `Clearance ${decision.toLowerCase()} successfully`,
      clearance
    });
  } catch (error) {
    console.error('Error updating HR final decision:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to save final clearance',
      error: error.message
    });
  }
};

// GET All Clearance Requests for HR Review
export const getAllClearanceRequestsForHR = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = {
      initialHRStatus: 'Approved',
      departmentStatus: 'Approved',
    };
    if (status) {
      query.status = status;
    }

    const clearances = await Clearance.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Clearance.countDocuments(query);

    const getOverallStatus = (clearance) => {
      const { approvedCount, totalOffices } = getOfficeCounts(clearance);

      if (clearance.status === 'Completed' && clearance.finalHRApproval === true) {
        return 'CERTIFICATE ISSUED';
      }

      if (approvedCount === totalOffices
        && (totalOffices > 0 || (clearance.initialHRStatus === 'Approved' && clearance.departmentStatus === 'Approved'))) {
        return 'APPROVED';
      }

      return 'PENDING';
    };

    const enrichedClearances = await Promise.all(
      clearances.map(async (clearance) => {
        let employee = null;
        if (clearance.employeeId) {
          employee = await Employee.findOne(employeeFilter(clearance.employeeId)).select('fullName employeeId department position').lean();
        }

        const { offices: departmentClearances, approvedCount, totalOffices: totalDepts } = getOfficeCounts(clearance);
        const overallStatus = getOverallStatus(clearance);

        return {
          _id: clearance._id,
          requestId: clearance.requestId,
          employeeId: clearance.employeeId,
          employeeName: employee?.fullName || clearance.employeeName,
          department: employee?.department || clearance.department?.name,
          position: employee?.position,
          clearanceType: clearance.clearanceType,
          status: clearance.status,
          initialHRStatus: clearance.initialHRStatus,
          initialHRAssessmentCompleted: clearance.initialHRAssessmentCompleted === true || isHRInitiatedRequest(clearance),
          departmentStatus: clearance.departmentStatus,
          manualRoutingEnabled: clearance.manualRoutingEnabled === true,
          assignedDepartments: clearance.assignedDepartments || [],
          requiredOffices: clearance.requiredOffices || [],
          requestSource: clearance.requestSource || 'Employee Portal',
          requestedByRole: clearance.requestedByRole || (isHRInitiatedRequest(clearance) ? 'HR_OFFICER' : 'EMPLOYEE'),
          isHRInitiated: isHRInitiatedRequest(clearance),
          initiatedBy: clearance.initiatedBy || null,
          initiatedByName: clearance.initiatedByName || '',
          overallStatus,
          departmentClearances,
          completedDepartments: approvedCount,
          totalDepartments: totalDepts,
          officeProgress: `${approvedCount}/${totalDepts}`,
          progress: totalDepts === 0
            ? (clearance.initialHRStatus === 'Approved' && clearance.departmentStatus === 'Approved' ? 100 : 0)
            : Math.round((approvedCount / totalDepts) * 100),
          requestDate: clearance.requestDate,
          createdAt: clearance.createdAt
        };
      })
    );

    res.json({
      success: true,
      data: enrichedClearances,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching clearances for HR:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch clearances',
      error: error.message
    });
  }
};

// Generate Certificate
export const generateCertificate = async (req, res) => {
  try {
    if (!isHROfficer(req.user)) {
      return res.status(403).json({ success: false, message: 'Only an HR Officer can generate a clearance certificate.' });
    }
    const { id } = req.params;

    const clearance = await Clearance.findOne({
      $or: [
        { requestId: id },
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }
      ]
    }).lean();

    if (!clearance) {
      return res.status(404).json({
        success: false,
        message: 'Clearance request not found'
      });
    }

    const { approvedCount, totalOffices } = getOfficeCounts(clearance);
    if (approvedCount !== totalOffices || clearance.finalHRApproval !== true || clearance.status !== 'Completed') {
      return res.status(400).json({
        success: false,
        message: `Certificate requires ${totalOffices}/${totalOffices} offices approved and final HR approval.`
      });
    }

    if (clearance.certificate?.number) {
      return res.json({ success: true, certificate: clearance.certificate, alreadyExists: true });
    }

    // Keep the certificate on the clearance so it appears in the list after refresh.
    const certificateNumber = `BDU/CLR/${new Date().getFullYear()}/${String(Date.now()).slice(-6)}`;
    const certificateIssuer = clearance.finalHRReviewedBy || req.user?.fullName || req.user?.name || 'HR Officer';

    const certificate = {
      number: certificateNumber,
      generatedAt: new Date(),
      generatedBy: certificateIssuer,
      generatedById: clearance.finalHRReviewedById || req.user?._id || null,
      generatedByPosition: clearance.finalHRReviewedByPosition || req.user?.position || req.user?.role || 'HR Officer',
      employeeId: clearance.employeeId,
      employeeName: clearance.employeeName,
      requestId: clearance.requestId,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    };

    const hrOfficers = await User.find({ role: { $regex: '^hr officer$', $options: 'i' } }).select('_id name');
    await Notification.insertMany(hrOfficers.map((officer) => ({
      recipientId: officer._id,
      targetName: officer.name || 'HR Officer',
      title: 'Certificate Generated Successfully',
      message: `Certificate No: ${certificate.number} has been generated.`,
      type: 'certificate_available',
      actionText: 'View Certificate',
      actionLink: '/hr-office/certificates',
      relatedRequestId: clearance.requestId || null,
      clearanceRequestId: clearance.requestId || null,
      isRead: false,
    })));

    await Clearance.updateOne(
      { _id: clearance._id },
      { $set: { certificate, updatedAt: new Date() } },
    );

    res.json({
      success: true,
      certificate
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to generate certificate',
      error: error.message
    });
  }
};

// GET generated certificates for the HR certificate list
export const getGeneratedCertificates = async (req, res) => {
  try {
    const clearances = await Clearance.find({ 'certificate.number': { $exists: true } })
      .sort({ 'certificate.generatedAt': -1 })
      .lean();

    const certificates = await Promise.all(clearances.map(async (clearance) => {
      const initialHRReview = [...(Array.isArray(clearance.workflow) ? clearance.workflow : [])]
        .reverse()
        .find((step) => /initial\s*hr|hr\s*review/i.test(String(step.office || step.name || '')));
      const initialHRReviewerNames = [
        initialHRReview?.reviewedBy,
        initialHRReview?.approvedBy,
        initialHRReview?.clearedBy,
        initialHRReview?.performedBy,
        initialHRReview?.officerName,
        clearance.initialHRReviewedBy,
      ].filter(Boolean);
      const [initialHRReviewer, clearanceSummary] = await Promise.all([
        resolveOfficeReviewers([{
          clearedBy: initialHRReviewerNames.find((name) => !isReviewerRoleLabel(name)) || initialHRReviewerNames[0],
          reviewerId: clearance.initialHRReviewedById || initialHRReview?.reviewedById
            || initialHRReview?.approvedById || initialHRReview?.performedById || initialHRReview?.reviewerId,
        }]),
        resolveOfficeReviewers(getOfficeProgress(clearance)),
      ]);
      return {
        _id: clearance._id,
        certificateNo: clearance.certificate.number,
        requestId: clearance.requestId || clearance._id,
        requestSource: clearance.requestSource || 'Employee Portal',
        requestedByRole: clearance.requestedByRole || (isHRInitiatedRequest(clearance) ? 'HR_OFFICER' : 'EMPLOYEE'),
        isHRInitiated: isHRInitiatedRequest(clearance),
        initiatedBy: clearance.initiatedBy || null,
        initiatedByName: clearance.initiatedByName || '',
        employee: clearance.employeeName || clearance.certificate.employeeName || '—',
        employeeId: clearance.employeeId || clearance.certificate.employeeId || '—',
        department: typeof clearance.department === 'string' ? clearance.department : clearance.department?.name || '—',
        generatedDate: clearance.certificate.generatedAt,
        generatedBy: clearance.certificate.generatedBy || 'HR Officer',
        status: clearance.certificate.issuedAt ? 'Issued' : 'Generated',
        issuedAt: clearance.certificate.issuedAt || null,
        certificate: clearance.certificate,
        initialHRReviewedBy: initialHRReviewer[0].clearedBy,
        initialHRReviewedById: clearance.initialHRReviewedById || null,
        initialHRReviewedAt: clearance.initialHRReviewedAt || clearance.certificate.generatedAt || null,
        finalHRApproval: clearance.finalHRApproval === true && clearance.status === 'Completed',
        finalHRReviewedBy: clearance.finalHRReviewedBy || clearance.certificate.generatedBy || '',
        finalHRReviewedById: clearance.finalHRReviewedById || clearance.certificate.generatedById || null,
        finalHRReviewedByPosition: clearance.finalHRReviewedByPosition || clearance.certificate.generatedByPosition || '',
        clearanceId: clearance.requestId || clearance._id,
        clearanceSummary,
      };
    }));

    res.json({ success: true, data: certificates });
  } catch (error) {
    console.error('Error fetching generated certificates:', error);
    res.status(500).json({ success: false, message: 'Unable to fetch certificates', error: error.message });
  }
};

// Mark a persisted certificate as issued to the employee
export const issueCertificate = async (req, res) => {
  try {
    if (!isHROfficer(req.user)) {
      return res.status(403).json({ success: false, message: 'Only an HR Officer can issue a clearance certificate to an employee.' });
    }
    const { id } = req.params;
    const existingClearance = await Clearance.findOne({
      $or: [{ requestId: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }],
      'certificate.number': { $exists: true },
    }).lean();

    if (!existingClearance) return res.status(404).json({ success: false, message: 'Certificate not found' });
    if (isHRInitiatedRequest(existingClearance)) {
      return res.status(409).json({ success: false, message: 'HR-initiated certificates are retained in the HR Certificates list and cannot be issued through the employee portal.' });
    }

    if (existingClearance.certificate.issuedAt) {
      return res.json({ success: true, certificate: existingClearance.certificate, alreadyIssued: true });
    }

    const clearance = await Clearance.findOneAndUpdate(
      { _id: existingClearance._id, 'certificate.issuedAt': { $exists: false } },
      { $set: { 'certificate.issuedAt': new Date(), updatedAt: new Date() } },
      { returnDocument: 'after' },
    ).lean();

    if (!clearance) {
      return res.json({ success: true, certificate: existingClearance.certificate, alreadyIssued: true });
    }

    if (!isHRInitiatedRequest(clearance)) {
      const employeeUser = await findEmployeeUser(clearance);
      await Notification.create({
        recipientId: employeeUser?._id || null,
        employeeId: clearance.employeeId || employeeUser?.employeeId || '',
        targetName: clearance.employeeName || 'Employee',
        title: 'Your Clearance Certificate Is Ready',
        message: `Your Employee Clearance Certificate has been issued. Certificate No: ${clearance.certificate.number}`,
        type: 'CERTIFICATE_ISSUED',
        actionText: 'View Certificate',
        actionLink: '/employee/documents',
        relatedRequestId: clearance.requestId || null,
        clearanceRequestId: clearance.requestId || null,
        isRead: false,
      });
    }

    await notifyFinanceOfficers({
      type: 'CERTIFICATE_ISSUED',
      employeeName: clearance.employeeName,
      requestId: clearance.requestId,
    });

    const hrOfficers = await User.find({ role: { $regex: '^hr officer$', $options: 'i' } }).select('_id name');
    await Notification.insertMany(hrOfficers.map((officer) => ({
      recipientId: officer._id,
      targetName: officer.name || 'HR Officer',
      title: 'Certificate Issued Successfully',
      message: `${clearance.employeeName || 'Employee'}'s clearance certificate has been issued.`,
      type: 'CERTIFICATE_ISSUED',
      actionText: 'View Certificate',
      actionLink: '/hr-office/certificates',
      relatedRequestId: clearance.requestId || null,
      clearanceRequestId: clearance.requestId || null,
      isRead: false,
    })));

    res.json({ success: true, certificate: clearance.certificate });
  } catch (error) {
    console.error('Error issuing certificate:', error);
    res.status(500).json({ success: false, message: 'Unable to issue certificate', error: error.message });
  }
};

// GET certificates issued to one employee
export const getEmployeeCertificates = async (req, res) => {
  try {
    const { employeeId } = req.params;
    let resolvedEmployeeId = employeeId;
    let employeeUser = null;
    if (mongoose.Types.ObjectId.isValid(employeeId)) {
      employeeUser = await User.findById(employeeId).select('employeeId name email').lean();
      resolvedEmployeeId = employeeUser?.employeeId || employeeId;
    }
    const identityQueries = [
      { employeeId: resolvedEmployeeId },
      { 'certificate.employeeId': resolvedEmployeeId },
    ];
    if (employeeUser?.name) identityQueries.push({ employeeName: employeeUser.name });
    if (employeeUser?.email) identityQueries.push({ 'employee.email': employeeUser.email });
    const clearances = await Clearance.find({
      $or: identityQueries,
      $nor: [
        { isHRInitiated: true },
        { requestedByRole: /^HR[_ -]?OFFICER$/i },
        { requestSource: /^HR[_ -]?OFFICER$/i },
      ],
      'certificate.number': { $exists: true },
      'certificate.issuedAt': { $exists: true },
    }).sort({ 'certificate.generatedAt': -1 }).lean();

    const certificates = await Promise.all(clearances.map(async (clearance) => {
      const { offices } = getOfficeCounts(clearance);
      const departmentClearances = await resolveOfficeReviewers(offices);
      const employee = await getEmployeeProfile(clearance.employeeId) || clearance.employee || {};
      return ({
      certificateNo: clearance.certificate.number,
      certificate: clearance.certificate,
      clearanceType: clearance.clearanceType || 'Resignation Clearance',
      completedDate: clearance.certificate.issuedAt || clearance.certificate.generatedAt,
      status: 'Issued',
      hrManagerName: clearance.certificate.generatedBy || 'HR Officer',
      position: employee.position || clearance.position || '—',
      campus: employee.campus || clearance.campus || '—',
      collegeInstitute: employee.collegeInstitute || clearance.collegeInstitute || clearance.college || clearance.institute || '—',
      employmentType: employee.employmentType || clearance.employmentType || '—',
      requestId: clearance.requestId || clearance._id,
      requestDate: clearance.requestDate || clearance.submissionDate || null,
      lastWorkingDate: clearance.lastWorkingDate || clearance.expectedLastWorkingDate || employee.lastWorkingDate || null,
      issuedAt: clearance.certificate.issuedAt || null,
      issuedBy: clearance.certificate.generatedBy || 'HR Officer',
      clearanceId: clearance.requestId || clearance._id,
      employeeId: clearance.employeeId,
      employeeName: clearance.employeeName,
      department: typeof clearance.department === 'string' ? clearance.department : clearance.department?.name || '—',
      departmentClearances: [
        ...departmentClearances,
        {
          office: 'Final HR Clearance',
          status: 'Approved',
          clearedBy: clearance.certificate.generatedBy || 'HR Officer',
          clearedDate: clearance.certificate.issuedAt || clearance.certificate.generatedAt,
        },
      ],
      });
    }));

    res.json({ success: true, data: certificates });
  } catch (error) {
    console.error('Error fetching employee certificates:', error);
    res.status(500).json({ success: false, message: 'Unable to fetch employee certificates', error: error.message });
  }
};

export const verifyCertificate = async (req, res) => {
  try {
    const certificateNo = String(req.params.certificateNo || '').trim();
    const clearance = await Clearance.findOne({
      'certificate.number': certificateNo,
      'certificate.issuedAt': { $exists: true },
    }).lean();

    if (!clearance) return res.status(404).json({ success: false, valid: false, message: 'Certificate not found or not issued.' });
    res.json({
      success: true,
      valid: true,
      certificate: {
        certificateNo,
        employeeName: clearance.employeeName,
        employeeId: clearance.employeeId,
        department: typeof clearance.department === 'string' ? clearance.department : clearance.department?.name || '—',
        issuedAt: clearance.certificate.issuedAt,
        issuedBy: clearance.certificate.generatedBy || 'HR Officer',
        status: 'ISSUED',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, valid: false, message: 'Unable to verify certificate.' });
  }
};
