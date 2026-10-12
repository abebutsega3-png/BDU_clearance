import ClearanceRequest from '../models/registerarClearanceRequest.js';

const normalizeRegistrarStatus = (value) => {
  const status = String(value || 'Pending').trim();
  if (!status) return 'Pending';
  if (/pending/i.test(status)) return 'Pending';
  if (/in progress|inprogress/i.test(status)) return 'In Progress';
  if (/approved|verified|completed/i.test(status)) return 'Approved';
  if (/returned|rejected/i.test(status)) return 'Returned';
  return status;
};

const buildRequestSummary = (request) => ({
  ...request.toObject(),
  registrarStatus: normalizeRegistrarStatus(request.registrarStatus || request.status),
  status: normalizeRegistrarStatus(request.registrarStatus || request.status),
});

export const getRegistrarDashboardData = async (req, res) => {
  try {
    const totalRequests = await ClearanceRequest.countDocuments();
    const pendingVerification = await ClearanceRequest.countDocuments({
      $or: [
        { registrarStatus: { $regex: 'pending', $options: 'i' } },
        { status: { $regex: 'pending', $options: 'i' } },
      ],
    });
    const inProgress = await ClearanceRequest.countDocuments({
      $or: [
        { registrarStatus: { $regex: 'in progress|inprogress', $options: 'i' } },
        { status: { $regex: 'in progress|inprogress', $options: 'i' } },
      ],
    });
    const approvedClearances = await ClearanceRequest.countDocuments({
      $or: [
        { registrarStatus: { $regex: 'approved|verified|completed', $options: 'i' } },
        { status: { $regex: 'approved|verified|completed', $options: 'i' } },
      ],
    });
    const returnedRequests = await ClearanceRequest.countDocuments({
      $or: [
        { registrarStatus: { $regex: 'returned|rejected', $options: 'i' } },
        { status: { $regex: 'returned|rejected', $options: 'i' } },
      ],
    });

    const requests = await ClearanceRequest.find().sort({ createdAt: -1 }).limit(8).lean();

    res.status(200).json({
      success: true,
      stats: {
        totalRequests,
        pendingVerification,
        inProgress,
        approvedClearances,
        returnedRequests,
      },
      requests: requests.map(buildRequestSummary),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

export const getRegistrarRequests = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const statusFilter = String(req.query.status || '').trim();

    const filter = {};
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { requestId: { $regex: search, $options: 'i' } },
      ];
    }

    if (statusFilter && statusFilter.toLowerCase() !== 'all') {
      filter.$or = [
        { registrarStatus: { $regex: statusFilter, $options: 'i' } },
        { status: { $regex: statusFilter, $options: 'i' } },
      ];
    }

    const [requests, totalRequests] = await Promise.all([
      ClearanceRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ClearanceRequest.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      requests: requests.map(buildRequestSummary),
      pagination: {
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(totalRequests / limit)),
        totalRequests,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load registrar requests.', error: error.message });
  }
};

const updateRegistrarRequestStatus = async (req, res, targetStatus) => {
  try {
    const request = await ClearanceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Registrar clearance request not found.' });
    }

    request.registrarStatus = targetStatus;
    request.status = targetStatus;

    if (req.body.reason || req.body.comment) {
      request.reviewComment = req.body.reason || req.body.comment;
    }

    await request.save();

    return res.status(200).json({
      success: true,
      message: `Request ${targetStatus.toLowerCase()} successfully.`,
      request: buildRequestSummary(request),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update registrar request.', error: error.message });
  }
};

export const verifyRegistrarRequest = async (req, res) => updateRegistrarRequestStatus(req, res, 'Approved');
export const rejectRegistrarRequest = async (req, res) => updateRegistrarRequestStatus(req, res, 'Rejected');
export const returnRegistrarRequest = async (req, res) => updateRegistrarRequestStatus(req, res, 'Returned');
export const commentRegistrarRequest = async (req, res) => {
  try {
    const request = await ClearanceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Registrar clearance request not found.' });
    }

    request.reviewComment = req.body.comment || req.body.reason || '';
    await request.save();

    return res.status(200).json({ success: true, message: 'Comment added.', request: buildRequestSummary(request) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to add comment.', error: error.message });
  }
};