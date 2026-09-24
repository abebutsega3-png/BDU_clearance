import IctClearanceRequest from '../models/IctClearanceRequest.js';
import ICTAsset from '../models/ICTAsset.js';

const normalizeStatus = (status = '') => {
  const value = String(status || '').trim().toLowerCase();
  const statusMap = {
    pending: 'Pending',
    'pending review': 'Pending',
    'in progress': 'Under Review',
    'under review': 'Under Review',
    approved: 'Approved',
    completed: 'Completed',
    returned: 'Returned',
    rejected: 'Returned',
  };

  return statusMap[value] || 'Pending';
};

const getStatusSummary = (records = []) => {
  const summary = {
    total: records.length,
    pending: 0,
    underReview: 0,
    approved: 0,
    returned: 0,
    rejected: 0,
    completed: 0,
  };

  records.forEach((record) => {
    const status = normalizeStatus(record.status);
    if (status === 'Pending') summary.pending += 1;
    if (status === 'Under Review') summary.underReview += 1;
    if (status === 'Approved') summary.approved += 1;
    if (status === 'Returned') summary.returned += 1;
    if (status === 'Rejected') summary.rejected += 1;
    if (status === 'Completed') summary.completed += 1;
  });

  return summary;
};

const getPeriodDates = ({ period, startDate, endDate }) => {
  if (period === 'custom') return { startDate, endDate };

  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  let start = new Date(end);

  if (period === 'weekly') {
    const dayOfWeek = end.getUTCDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    start.setUTCDate(start.getUTCDate() - daysFromMonday);
    end.setUTCDate(start.getUTCDate() + 6);
  } else if (period === 'monthly') {
    start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    end.setUTCMonth(end.getUTCMonth() + 1, 0);
  } else if (period === 'yearly') {
    start = new Date(Date.UTC(end.getUTCFullYear(), 0, 1));
    end.setUTCMonth(11, 31);
  } else {
    return { startDate, endDate };
  }

  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
};

export const getICTReports = async (req, res) => {
  try {
    const { campus, department, status, reason } = req.query;
    const { startDate, endDate } = getPeriodDates(req.query);

    const query = {};
    if (startDate || endDate) {
      query.requestDate = {};
      if (startDate) query.requestDate.$gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) {
        query.requestDate.$lte = new Date(`${endDate}T23:59:59.999Z`);
      }
    }
    if (campus && campus !== 'All') query['employee.campus'] = campus;
    if (department && department !== 'All') query['employee.department'] = department;
    if (status && status !== 'All') {
      const normalizedStatus = normalizeStatus(status);
      query.status = normalizedStatus === 'Pending'
        ? { $in: ['Pending', 'Pending Review'] }
        : normalizedStatus === 'Returned'
          ? { $in: ['Returned', 'Rejected'] }
          : normalizedStatus;
    }
    if (reason && reason !== 'All') query.clearanceReason = { $regex: reason, $options: 'i' };

    const records = await IctClearanceRequest.find(query).lean();
    const summary = getStatusSummary(records);

    const statusCounts = [
      { status: 'Pending', count: summary.pending },
      { status: 'Under Review', count: summary.underReview },
      { status: 'Approved', count: summary.approved },
      { status: 'Returned', count: summary.returned },
      { status: 'Rejected', count: summary.rejected },
      { status: 'Completed', count: summary.completed },
    ];

    const reasonCounts = await IctClearanceRequest.aggregate([
      { $match: query },
      { $group: { _id: '$clearanceReason', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const assetSummary = await ICTAsset.aggregate([
      {
        $group: {
          _id: '$assetType',
          total: { $sum: 1 },
          returned: {
            $sum: { $cond: [{ $eq: ['$assetStatus', 'Returned'] }, 1, 0] }
          },
          outstanding: {
            $sum: { $cond: [{ $eq: ['$assetStatus', 'Assigned'] }, 1, 0] }
          }
        }
      },
      { $sort: { total: -1 } }
    ]);

    const departmentBreakdown = await IctClearanceRequest.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$employee.department',
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0]
            }
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Pending Review'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { total: -1 } }
    ]);

    const campusBreakdown = await IctClearanceRequest.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$employee.campus',
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { total: -1 } }
    ]);

    const processingSummary = {
      averageProcessingDays: 0,
      fastestDays: 0,
      slowestDays: 0,
      pendingOver3: 0,
      pendingOver7: 0,
    };

    const processingRecords = records.filter((record) => record.requestDate && record.processedBy?.processedAt);
    if (processingRecords.length) {
      const durations = processingRecords.map((record) => {
        const start = new Date(record.requestDate).getTime();
        const end = new Date(record.processedBy.processedAt).getTime();
        return Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
      });
      const sum = durations.reduce((acc, value) => acc + value, 0);
      processingSummary.averageProcessingDays = Math.round(sum / durations.length);
      processingSummary.fastestDays = Math.min(...durations);
      processingSummary.slowestDays = Math.max(...durations);
    }

    processingSummary.pendingOver3 = records.filter((record) =>
      normalizeStatus(record.status) === 'Pending' && record.requestDate &&
      (Date.now() - new Date(record.requestDate).getTime()) > 3 * 24 * 60 * 60 * 1000
    ).length;

    processingSummary.pendingOver7 = records.filter((record) =>
      normalizeStatus(record.status) === 'Pending' && record.requestDate &&
      (Date.now() - new Date(record.requestDate).getTime()) > 7 * 24 * 60 * 60 * 1000
    ).length;

    const items = records.map((record) => ({
      clearanceId: record.clearanceId || record.requestId,
      employeeId: record.employee?.employeeId || '',
      employeeName: record.employee?.fullName || 'Unknown Employee',
      department: record.employee?.department || '',
      campus: record.employee?.campus || 'Main Campus',
      clearanceReason: record.clearanceReason || 'Other',
      submittedDate: record.requestDate || record.createdAt,
      reviewedDate: record.processedBy?.processedAt || record.updatedAt,
      status: normalizeStatus(record.status),
      officer: record.processedBy?.officerName || 'ICT Officer',
      outstandingAsset: Array.isArray(record.assetsIssued) && record.assetsIssued.length
        ? record.assetsIssued.filter((asset) => !asset.isReturned).map((asset) => asset.assetName || 'Asset').join(', ') || 'N/A'
        : 'N/A'
    }));

    res.status(200).json({
      success: true,
      summary: {
        total: summary.total,
        pending: summary.pending,
        underReview: summary.underReview,
        approved: summary.approved,
        returned: summary.returned,
        rejected: summary.rejected,
        completed: summary.completed,
      },
      statusCounts,
      reasonCounts,
      assetSummary,
      departmentBreakdown,
      campusBreakdown,
      processingSummary,
      items,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};