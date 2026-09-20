import ClearanceRequest from '../models/clearance.js';
import Employee from '../models/employee.js';
import Asset from '../models/propertyAsset.js';
import AuditLog from '../models/AuditLog.js';
import { isRequestVisibleToOffice, propertyOfficeWorkflowFilter } from '../utils/clearanceWorkflow.js';

const normalizeStatus = (value) => {
  const status = (value || '').toString().trim();
  if (!status) return 'Pending';
  const lower = status.toLowerCase();
  if (lower === 'under review' || lower === 'in progress' || lower === 'review') return 'Under Review';
  return status;
};

export const getDashboardData = async (req, res) => {
  try {
    const propertyOfficeFilter = propertyOfficeWorkflowFilter;
    const withPropertyOfficeFilter = (requestFilter = {}) => ({
      $and: [propertyOfficeFilter, requestFilter],
    });

    const totalRequests = await ClearanceRequest.countDocuments(propertyOfficeFilter);
    const countByStatus = (status) => ClearanceRequest.countDocuments(withPropertyOfficeFilter({
      $or: [{ propertyStatus: status }, { status }, { overallStatus: status }],
    }));
    const [pendingRequests, underReview, approved, returned, outstandingAssetsCount] = await Promise.all([
      ClearanceRequest.countDocuments(withPropertyOfficeFilter({
        $or: [{ propertyStatus: 'Pending' }, { propertyStatus: 'In Progress' }, { status: 'Pending' }, { overallStatus: 'Pending' }, { status: 'In Progress' }, { overallStatus: 'In Progress' }],
      })),
      countByStatus('Under Review'),
      countByStatus('Approved'),
      countByStatus('Returned'),
      Asset.countDocuments({ status: 'Outstanding' })
    ]);

    const [pendingList, outstandingList, activitiesList] = await Promise.all([
      ClearanceRequest.find(withPropertyOfficeFilter({
        $or: [{ propertyStatus: 'Pending' }, { propertyStatus: 'In Progress' }, { status: 'Pending' }, { overallStatus: 'Pending' }, { status: 'In Progress' }, { overallStatus: 'In Progress' }],
      })).sort({ createdAt: -1 }).limit(5).lean(),
      Asset.find({ status: 'Outstanding' }).sort({ updatedAt: -1 }).limit(5).lean(),
      AuditLog.find({ $or: [{ actorRole: { $regex: 'property officer', $options: 'i' } }, { module: 'Property' }, { module: 'Property Clearance' }] }).sort({ createdAt: -1 }).limit(4).populate('userId', 'name role').lean()
    ]);

    const visiblePendingList = pendingList.filter((item) => isRequestVisibleToOffice(item, 'Property / Asset Office'));
    const mappedPendingList = await Promise.all(visiblePendingList.map(async (item) => {
      const employee = await Employee.findOne({ employeeId: item.employeeId }).lean();
      return {
        ...item,
        requestId: item.requestId || item._id,
        employeeName: employee?.fullName || item.employeeName || 'Unknown Employee',
        department: employee?.department || item.department || 'N/A',
        position: employee?.position || item.position || 'N/A',
        campus: employee?.campus || item.campus || 'N/A',
        date: item.requestDate || item.submittedDate || item.createdAt,
        status: normalizeStatus(item.propertyStatus || item.status || item.overallStatus)
      };
    }));

    const mappedOutstandingList = await Promise.all(outstandingList.map(async (item) => {
      const employee = await Employee.findOne({ employeeId: item.employeeId }).lean();
      return { ...item, employeeName: employee?.fullName || item.employeeName || 'Unknown Employee', status: 'Outstanding' };
    }));

    const mappedActivities = activitiesList.map((item) => ({
      _id: item._id,
      action: item.description || item.action,
      type: /approve/i.test(item.action) ? 'Approved' : /return/i.test(item.action) ? 'Returned' : 'Review',
      timeAgo: item.createdAt
    }));

    res.status(200).json({
      summary: {
        totalRequests,
        pendingRequests,
        underReview,
        approved,
        returned,
        outstandingAssetsCount,
        outstandingAssets: outstandingAssetsCount
      },
      pendingRequests: mappedPendingList,
      outstandingAssets: mappedOutstandingList,
      recentActivities: mappedActivities
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching Property Officer dashboard data', error: error.message });
  }
};

export const startReview = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await ClearanceRequest.findOne({ requestId });

    if (!request) {
      return res.status(404).json({ message: 'Pending request not found' });
    }

    request.propertyStatus = 'Under Review';
    if (Array.isArray(request.workflow)) {
      const propertyStep = request.workflow.find((step) => String(step.office || '').toLowerCase().includes('property'));
      if (propertyStep) {
        propertyStep.status = 'In Progress';
        propertyStep.updatedAt = new Date();
      }
    }
    await request.save();

    await AuditLog.create({
      actorRole: 'Property Officer',
      action: `Started review for ${requestId}`,
      module: 'Property Clearance',
      description: `Started review for ${requestId}`
    });

    res.status(200).json({ message: 'Review started successfully', request });
  } catch (error) {
    res.status(500).json({ message: 'Error starting review', error: error.message });
  }
};