const ClearanceRequest = require('../models/ClearanceRequest');

// GET /api/clearance/property/history
exports.getPropertyClearanceHistory = async (req, res) => {
  try {
    // 1. Fetch only requests where Property Officer has made a decision (Approved or Returned)
    const historyRequests = await ClearanceRequest.find({
      'property.status': { $in: ['Approved', 'Returned'] }
    })
    .populate('employeeId', 'fullName department position employeeId') // Join Employee Details
    .sort({ 'property.reviewedAt': -1 });

    // 2. Format response for Frontend
    const formattedHistory = historyRequests.map(item => ({
      requestId: item.requestId,
      employeeId: item.employeeId?.employeeId || item.employeeId,
      employeeName: item.employeeId?.fullName || 'N/A',
      department: item.employeeId?.department || 'N/A',
      position: item.employeeId?.position || 'N/A',
      clearanceReason: item.clearanceReason,
      requestDate: item.requestDate ? item.requestDate.toISOString().split('T')[0] : '',
      
      // Asset Verification Summary
      assetSummary: item.property?.assetSummary || { assigned: 0, returned: 0, outstanding: 0 },

      // Property Officer Decision Record
      property: {
        status: item.property?.status,
        reviewedBy: item.property?.reviewedBy || 'Property Officer',
        reviewedAt: item.property?.reviewedAt,
        comment: item.property?.comment || '',
        returnReason: item.property?.returnReason || ''
      }
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
};