import mongoose from 'mongoose';
import Clearance from '../models/clearance.js';
import Employee from '../models/employee.js';
import Role from '../models/role.js';
import {
  isFinalHRStage,
  MANUAL_ROUTABLE_OFFICES,
  normalizeRoutedOffice,
} from '../utils/clearanceWorkflow.js';

const CHECKLIST_KEYS = [
  'empInfoVerified',
  'clearanceRequestVerified',
  'documentVerified',
  'employmentVerified',
  'noDuplicateRequest',
];

const isHROfficer = (req) => {
  const role = String(req.user?.role || '').toLowerCase().replace(/[_-]+/g, ' ').trim();
  return ['hr', 'hr officer', 'human resources'].includes(role);
};

const findClearance = (id) => Clearance.findOne({
  $or: [
    { requestId: id },
    ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : []),
  ],
});

export const getAssessmentQueue = async (req, res) => {
  if (!isHROfficer(req)) {
    return res.status(403).json({ success: false, message: 'Only HR Officers can access the assessment queue.' });
  }

  try {
    const requestedStatus = String(req.query.status || 'Under Review').trim();
    const allowedStatuses = ['All', 'Pending', 'Under Review', 'Returned', 'Approved'];
    if (!allowedStatuses.includes(requestedStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid HR assessment status filter.' });
    }

    const filter = requestedStatus === 'All' ? {} : { initialHRStatus: requestedStatus };
    if (req.query.assessment === 'incomplete') filter.initialHRAssessmentCompleted = { $ne: true };
    if (req.query.assessment === 'passed') filter.initialHRAssessmentCompleted = true;
    const queue = await Clearance.find(filter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: queue });
  } catch (error) {
    console.error('Unable to load HR assessment queue:', error);
    return res.status(500).json({ success: false, message: 'Unable to load the HR assessment queue.' });
  }
};

export const getClearanceOffices = async (req, res) => {
  if (!isHROfficer(req)) {
    return res.status(403).json({ success: false, message: 'Only HR Officers can access clearance offices.' });
  }

  try {
    const roles = await Role.find({ isActive: true, isClearanceOffice: true })
      .select('name')
      .sort({ name: 1 })
      .lean();
    const officesByName = new Map();
    [...MANUAL_ROUTABLE_OFFICES, ...roles.map((role) => role.name)]
      .filter((name) => typeof name === 'string' && name.trim())
      .forEach((name) => {
        const canonical = normalizeRoutedOffice(name);
        if (canonical && !isFinalHRStage(canonical) && !/^department(\s|$)/i.test(canonical)
          && !officesByName.has(canonical.toLowerCase())) {
          officesByName.set(canonical.toLowerCase(), canonical);
        }
      });
    return res.status(200).json({ success: true, data: [...officesByName.values()] });
  } catch (error) {
    console.error('Unable to load clearance offices for HR routing:', error);
    return res.status(500).json({ success: false, message: 'Unable to load the clearance office list.' });
  }
};

export const getRequestDetails = async (req, res) => {
  if (!isHROfficer(req)) {
    return res.status(403).json({ success: false, message: 'Only HR Officers can access assessment details.' });
  }

  try {
    const request = await findClearance(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Clearance request not found.' });
    }

    const employee = request.employeeId
      ? await Employee.findOne({ employeeId: request.employeeId })
        .select('employeeId fullName department position campus employmentType status')
        .lean()
      : null;

    const activeDuplicate = request.employeeId
      ? await Clearance.exists({
        employeeId: request.employeeId,
        _id: { $ne: request._id },
        status: { $nin: ['Completed', 'Cancelled', 'Rejected'] },
      })
      : false;

    return res.status(200).json({
      success: true,
      data: {
        ...request.toObject(),
        employeeRecord: employee,
        hasActiveDuplicate: Boolean(activeDuplicate),
      },
    });
  } catch (error) {
    console.error('Unable to load HR assessment details:', error);
    return res.status(500).json({ success: false, message: 'Unable to load assessment details.' });
  }
};

export const saveAssessmentDraft = async (req, res) => {
  if (!isHROfficer(req)) {
    return res.status(403).json({ success: false, message: 'Only HR Officers can save assessment notes.' });
  }

  try {
    const { assessmentChecklist, hrComment = '' } = req.body || {};
    if (!assessmentChecklist || typeof assessmentChecklist !== 'object' || Array.isArray(assessmentChecklist)) {
      return res.status(400).json({ success: false, message: 'A valid assessment checklist is required.' });
    }
    if (CHECKLIST_KEYS.some((key) => typeof assessmentChecklist[key] !== 'boolean')) {
      return res.status(400).json({ success: false, message: 'All assessment checklist items must be answered.' });
    }
    if (typeof hrComment !== 'string' || hrComment.length > 1000) {
      return res.status(400).json({ success: false, message: 'HR comments must be 1000 characters or fewer.' });
    }

    const request = await findClearance(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Clearance request not found.' });
    }
    if (request.initialHRStatus !== 'Under Review') {
      return res.status(409).json({ success: false, message: 'Only requests Under Review can be saved as drafts.' });
    }

    request.assessmentChecklist = Object.fromEntries(
      CHECKLIST_KEYS.map((key) => [key, assessmentChecklist[key]]),
    );
    request.hrComment = hrComment.trim();
    request.initialHRAssessmentCompleted = false;
    request.initialHRReviewedBy = req.user?.fullName || req.user?.name || 'HR Officer';
    request.initialHRReviewedAt = new Date();
    await request.save();

    return res.status(200).json({
      success: true,
      message: 'Assessment saved for later.',
      data: request,
    });
  } catch (error) {
    console.error('Unable to save HR assessment draft:', error);
    return res.status(500).json({ success: false, message: 'Unable to save the assessment.' });
  }
};

export const completeInitialHRAssessment = async (req, res) => {
  if (!isHROfficer(req)) {
    return res.status(403).json({ success: false, message: 'Only HR Officers can complete an assessment.' });
  }

  try {
    const { assessmentChecklist, hrComment = '' } = req.body || {};
    if (!assessmentChecklist || typeof assessmentChecklist !== 'object' || Array.isArray(assessmentChecklist)
      || CHECKLIST_KEYS.some((key) => assessmentChecklist[key] !== true)) {
      return res.status(400).json({ success: false, message: 'Pass every HR assessment checklist item before continuing to HR Workflow.' });
    }
    if (typeof hrComment !== 'string' || hrComment.length > 1000) {
      return res.status(400).json({ success: false, message: 'HR comments must be 1000 characters or fewer.' });
    }

    const request = await findClearance(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Clearance request not found.' });
    if (request.initialHRStatus !== 'Under Review') {
      return res.status(409).json({ success: false, message: 'Start Initial HR Review before completing the assessment.' });
    }

    const departmentName = typeof request.department === 'object'
      ? request.department?.departmentName || request.department?.name
      : request.department;
    if (!request.employeeId || !request.clearanceType || !request.reason || !request.lastWorkingDate || !departmentName) {
      return res.status(400).json({ success: false, message: 'Employee, department, clearance type, reason, and last working date are required.' });
    }
    const [employee, duplicate] = await Promise.all([
      Employee.exists({ employeeId: request.employeeId }),
      Clearance.exists({
        employeeId: request.employeeId,
        _id: { $ne: request._id },
        status: { $nin: ['Completed', 'Cancelled', 'Rejected'] },
      }),
    ]);
    if (!employee) return res.status(400).json({ success: false, message: 'No employee record matches this employee ID.' });
    if (duplicate) return res.status(409).json({ success: false, message: 'Another active clearance request exists for this employee.' });

    const asUtcDate = (value) => {
      if (value instanceof Date) return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
      if (!match) return new Date(Number.NaN);
      const [, year, month, day] = match;
      const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      if (date.getUTCFullYear() !== Number(year)
        || date.getUTCMonth() !== Number(month) - 1
        || date.getUTCDate() !== Number(day)) return new Date(Number.NaN);
      return date;
    };
    const lastWorkingDate = asUtcDate(request.lastWorkingDate);
    const requestDateValue = request.requestDate || request.createdAt;
    const requestDate = asUtcDate(requestDateValue);
    if (Number.isNaN(lastWorkingDate.getTime()) || Number.isNaN(requestDate.getTime()) || lastWorkingDate < requestDate) {
      return res.status(400).json({ success: false, message: 'Last working date must be valid and cannot be earlier than the request date.' });
    }

    request.assessmentChecklist = Object.fromEntries(CHECKLIST_KEYS.map((key) => [key, true]));
    request.hrComment = hrComment.trim();
    request.initialHRAssessmentCompleted = true;
    request.initialHRReviewedBy = req.user?.fullName || req.user?.name || 'HR Officer';
    request.initialHRReviewedAt = new Date();
    await request.save();

    return res.status(200).json({
      success: true,
      message: 'HR assessment passed. Continue to HR Workflow to assign clearance offices.',
      data: request,
    });
  } catch (error) {
    console.error('Unable to complete the Initial HR assessment:', error);
    return res.status(500).json({ success: false, message: 'Unable to complete the HR assessment.' });
  }
};
