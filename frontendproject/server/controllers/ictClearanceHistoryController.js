import IctClearanceRequest from '../models/IctClearanceRequest.js';

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

const formatHistoryRecord = (record) => ({
  _id: record._id,
  clearanceId: record.clearanceId || record.requestId,
  employeeId: record.employee?.employeeId || record.employeeId || '',
  employeeName: record.employee?.fullName || record.employeeName || 'Unknown Employee',
  position: record.employee?.position || record.position || '',
  department: record.employee?.department || record.department || '',
  campus: record.employee?.campus || record.campus || 'Main Campus',
  clearanceReason: record.clearanceReason || record.reason || 'Clearance',
  submittedDate: record.requestDate || record.createdAt,
  reviewedDate: record.processedBy?.processedAt || record.updatedAt,
  status: normalizeStatus(record.status),
  reviewedBy: record.processedBy?.officerName || record.processedBy || 'ICT Officer',
  remarks: record.remarks || '',
  ictIssue: record.assetsIssued?.some((item) => !item.isReturned)
    ? `${record.assetsIssued.filter((item) => !item.isReturned).length} outstanding ICT item(s)`
    : 'None',
  ictMaterials: record.ictMaterials || 'Not recorded',
  assets: {
    laptopDesktop: record.assetsIssued?.find((item) => /laptop|desktop/i.test(item.assetName || ''))?.assetName || 'Not reported',
    monitor: record.assetsIssued?.find((item) => /monitor/i.test(item.assetName || ''))?.assetName || 'Not reported',
    keyboardMouse: record.assetsIssued?.find((item) => /keyboard|mouse/i.test(item.assetName || ''))?.assetName || 'Not reported',
    phoneTablet: record.assetsIssued?.find((item) => /phone|tablet/i.test(item.assetName || ''))?.assetName || 'Not reported',
    softwareAccess: record.accountDeactivation ? 'Account review recorded' : 'Not reported',
    emailStatus: record.accountDeactivation?.bduEmailDeactivated ? 'Deactivated' : 'Active',
  },
});

export const getClearanceHistory = async (req, res) => {
  try {
    const { search, status, campus, department, clearanceReason, startDate, endDate } = req.query;
    const query = {};

    if (status && status !== 'All') {
      const normalizedStatus = normalizeStatus(status);
      query.status = normalizedStatus === 'Returned'
        ? { $in: ['Returned', 'Rejected'] }
        : normalizedStatus;
    }

    if (campus && campus !== 'All') {
      query['employee.campus'] = campus;
    }

    if (department && department !== 'All') {
      query['employee.department'] = department;
    }

    if (clearanceReason && clearanceReason !== 'All') {
      query.clearanceReason = { $regex: clearanceReason, $options: 'i' };
    }

    if (search) {
      query.$or = [
        { clearanceId: { $regex: search, $options: 'i' } },
        { requestId: { $regex: search, $options: 'i' } },
        { 'employee.employeeId': { $regex: search, $options: 'i' } },
        { 'employee.fullName': { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      query.requestDate = {};
      if (startDate) query.requestDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.requestDate.$lte = end;
      }
    }

    const records = await IctClearanceRequest.find(query).sort({ updatedAt: -1 }).lean();
    const historyRecords = records
      .filter((record) => ['Approved', 'Returned', 'Completed'].includes(normalizeStatus(record.status)))
      .map(formatHistoryRecord);

    res.status(200).json({ success: true, count: historyRecords.length, data: historyRecords });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch ICT clearance history', error: error.message });
  }
};

export const recordClearanceAction = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await IctClearanceRequest.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'ICT clearance record not found.' });
    }

    res.status(200).json({ success: true, data: formatHistoryRecord(record) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to read ICT clearance action record', error: error.message });
  }
};
