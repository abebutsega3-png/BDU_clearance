import Clearance from '../models/clearance.js';
import AuditLog from '../models/AuditLog.js';
import { officeAssignmentFilter } from '../utils/clearanceWorkflow.js';

const transportOfficeRegex = { $regex: 'transport', $options: 'i' };

const transportRequestFilter = {
  $or: [
    { requiredOffices: transportOfficeRegex },
    { workflow: { $elemMatch: { $or: [{ office: transportOfficeRegex }, { name: transportOfficeRegex }] } } },
    { currentStep: transportOfficeRegex },
    { transportStatus: { $exists: true, $nin: [null, ''] } },
    { transportClearanceStatus: { $exists: true, $nin: [null, ''] } },
    { 'transportClearance.status': { $exists: true, $nin: [null, ''] } },
  ],
};

const workflowStatusFilter = (statuses) => ({
  $or: [
    { transportStatus: { $in: statuses } },
    { transportClearanceStatus: { $in: statuses } },
    { 'transportClearance.status': { $in: statuses } },
    {
      workflow: {
        $elemMatch: {
          $and: [
            { $or: [{ office: transportOfficeRegex }, { name: transportOfficeRegex }] },
            { status: { $in: statuses } },
          ],
        },
      },
    },
    { $and: [{ currentStep: transportOfficeRegex }, { status: { $in: statuses } }] },
  ],
});

const defaultPendingTransportFilter = {
  $and: [
    { requiredOffices: transportOfficeRegex },
    { transportStatus: { $in: [null, ''] } },
    { transportClearanceStatus: { $in: [null, ''] } },
    { 'transportClearance.status': { $in: [null, ''] } },
    {
      workflow: {
        $not: {
          $elemMatch: { $or: [{ office: transportOfficeRegex }, { name: transportOfficeRegex }] },
        },
      },
    },
  ],
};

const normalizeStatus = (value) => {
  const status = String(value || '').trim().toLowerCase();
  if (['approved', 'completed', 'cleared'].includes(status)) return 'Approved';
  if (['returned', 'rejected'].includes(status)) return 'Returned';
  if (['under review', 'in progress', 'review'].includes(status)) return 'Under Review';
  if (status === 'cancelled') return 'Cancelled';
  return status ? status.replace(/\b\w/g, (character) => character.toUpperCase()) : 'Pending';
};

const getTransportStatus = (request) => {
  const workflowStep = (Array.isArray(request.workflow) ? request.workflow : []).find((step) =>
    /transport/i.test(String(step?.office || step?.name || ''))
  );
  const status = request.transportStatus
    || request.transportClearanceStatus
    || request.transportClearance?.status
    || workflowStep?.status
    || (/transport/i.test(String(request.currentStep || '')) ? request.status : 'Pending');

  return normalizeStatus(status);
};

const mapRequest = (request) => {
  const employee = request.employee && typeof request.employee === 'object' ? request.employee : {};
  const department = request.department && typeof request.department === 'object'
    ? request.department.departmentName || request.department.name || ''
    : request.department;

  return {
    _id: request._id,
    requestId: request.requestId || String(request._id),
    employeeName: employee.fullName || employee.name || request.employeeName || 'Unknown Employee',
    employeeId: employee.employeeId || request.employeeId || '',
    department: department || 'N/A',
    position: employee.position || request.position || 'N/A',
    clearanceType: request.clearanceType || request.reason || 'Clearance',
    date: request.requestDate || request.submittedDate || request.createdAt,
    lastWorkingDate: request.lastWorkingDate || request.relievingDate || null,
    status: getTransportStatus(request),
  };
};

const getDashboardData = async (req, res) => {
  const role = String(req.user?.role || '').trim().toLowerCase();
  if (!role.includes('transport') || !role.includes('officer')) {
    return res.status(403).json({ message: 'Transport Officer access is required.' });
  }

  try {
    const reviewableTransportRequestFilter = {
      $and: [
        transportRequestFilter,
        { departmentStatus: 'Approved' },
        officeAssignmentFilter('Transport Office'),
      ],
    };
    const withTransportFilter = (filter = {}) => ({
      $and: [reviewableTransportRequestFilter, filter],
    });
    const pendingFilter = {
      $or: [
        workflowStatusFilter(['Pending', 'Under Review', 'In Progress']),
        defaultPendingTransportFilter,
      ],
    };
    const clearedFilter = workflowStatusFilter(['Approved', 'Completed', 'Cleared']);
    const returnedFilter = workflowStatusFilter(['Returned', 'Rejected']);
    const underReviewFilter = workflowStatusFilter(['Under Review', 'In Progress']);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

    const [totalRequests, pendingRequests, underReview, clearedRequests, returnedRequests, rawRequests, recentActivities, monthlyRequests] = await Promise.all([
      Clearance.countDocuments(reviewableTransportRequestFilter),
      Clearance.countDocuments(withTransportFilter(pendingFilter)),
      Clearance.countDocuments(withTransportFilter(underReviewFilter)),
      Clearance.countDocuments(withTransportFilter(clearedFilter)),
      Clearance.countDocuments(withTransportFilter(returnedFilter)),
      Clearance.find(reviewableTransportRequestFilter)
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
      AuditLog.find({
        $or: [
          { actorRole: { $regex: 'transport officer', $options: 'i' } },
          { module: { $regex: 'transport', $options: 'i' } },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(6)
        .select('action module description createdAt actorRole')
        .lean(),
      Clearance.aggregate([
        { $match: withTransportFilter({ createdAt: { $gte: sixMonthsAgo } }) },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            requests: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const requests = rawRequests
      .map(mapRequest)
      .filter((request) => ['Pending', 'Under Review'].includes(request.status))
      .slice(0, 6);

    return res.status(200).json({
      summary: { totalRequests, pendingRequests, underReview, clearedRequests, returnedRequests },
      fleet: { available: false, totalVehicles: null, assignedVehicles: null },
      requests,
      monthlyRequests: monthlyRequests.map((month) => ({ month: month._id, requests: month.requests })),
      recentActivities: recentActivities.map((activity) => ({
        action: activity.description || activity.action,
        module: activity.module,
        createdAt: activity.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching Transport Officer dashboard:', error.message);
    return res.status(500).json({ message: 'Unable to load Transport Officer dashboard data.' });
  }
};

export { getDashboardData };