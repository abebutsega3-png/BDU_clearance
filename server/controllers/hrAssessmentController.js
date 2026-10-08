import mongoose from 'mongoose';
import Clearance from '../models/clearance.js';
import Employee from '../models/employee.js';

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
    const queue = await Clearance.find(filter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: queue });
  } catch (error) {
    console.error('Unable to load HR assessment queue:', error);
    return res.status(500).json({ success: false, message: 'Unable to load the HR assessment queue.' });
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
