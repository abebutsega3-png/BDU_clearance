import express from 'express';
import ClearanceRequest from '../models/clearance.js';
import Employee from '../models/employee.js';
import AuditLog from '../models/AuditLog.js';

const router = express.Router();

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/property/clearance-history/history
router.get('/history', async (req, res) => {
  try {
    // Property actions persist their decision in propertyStatus.
    const historyRecords = await ClearanceRequest.find({
      $or: [
        { propertyStatus: { $regex: /^(approved|completed|cleared|clear|returned|rejected|not clear)$/i } },
        { status: { $in: ['Approved', 'Returned', 'Completed', 'Rejected'] } },
        { workflow: { $elemMatch: { office: /property/i, status: { $in: ['Completed', 'Rejected', 'Returned'] } } } }
      ]
    }).sort({ propertyReviewedAt: -1, updatedAt: -1 }).lean();

    // 2. Format Response Data
    const formattedHistory = await Promise.all(historyRecords.map(async (item) => {
      const employee = await Employee.findOne({ employeeId: item.employeeId }).lean();
      const propertyStep = item.workflow?.find((step) => /property/i.test(step.office || ''));
      const rawStatus = String(item.propertyStatus || propertyStep?.status || item.status || '').toLowerCase();
      const status = ['approved', 'completed', 'cleared', 'clear'].includes(rawStatus)
        ? 'Approved'
        : 'Returned';
      const auditLogs = await AuditLog.find({
        module: 'Property Clearance',
        description: new RegExp(escapeRegExp(item.requestId), 'i')
      }).sort({ createdAt: 1 }).lean();
      const actionHistory = [
        { action: 'Request Received', date: item.createdAt || item.requestDate },
        ...auditLogs.map((log) => ({
          action: log.action === 'START_REVIEW'
            ? 'Property Officer Reviewed'
            : log.action === 'RETURN_REQUEST'
              ? 'Returned'
              : log.action === 'APPROVE_CLEARANCE'
                ? 'Approved'
                : log.action,
          date: log.createdAt,
          officer: log.actorRole || 'Property Officer',
          reason: log.newValues?.returnReason || '',
          remark: log.description || ''
        }))
      ];

      return {
      requestId: item.requestId,
      employeeId: employee?.employeeId || item.employeeId || 'N/A',
      employeeName: employee?.fullName || item.employeeName || 'N/A',
      department: employee?.department || item.department || 'N/A',
      position: employee?.position || item.position || 'N/A',
      campus: employee?.campus || item.campus || 'N/A',
      clearanceReason: item.clearanceReason,
      requestDate: item.requestDate || item.submittedDate || item.createdAt || '',
      
      assetSummary: item.property?.assetSummary || { assigned: 0, returned: 0, outstanding: 0 },

      property: {
        status,
        reviewedBy: item.propertyReviewedBy || 'Property Officer',
        reviewedAt: item.propertyReviewedAt || item.reviewedAt || auditLogs.at(-1)?.createdAt,
        comment: item.property?.comment || item.officerComment || '',
        returnReason: item.property?.returnReason || item.returnReason || ''
      },
      actionHistory
      };
    }));

    res.status(200).json({
      success: true,
      count: formattedHistory.length,
      history: formattedHistory
    });

  } catch (error) {
    console.error('Error fetching property clearance history:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

export default router;