const ClearanceRequest = require('../models/ClearanceRequest');

exports.getEmployeeDashboard = async (req, res) => {
  try {
    const { employeeId } = req.params;

    // የሰራተኛውን አሁናዊ የክሊራንስ ጥያቄ ማምጣት
    const currentRequest = await ClearanceRequest.findOne({ employeeId }).sort({ createdAt: -1 });

    if (!currentRequest) {
      return res.status(404).json({ success: false, message: 'ምንም አይነት የክሊራንስ ጥያቄ አልተገኘም' });
    }

    res.status(200).json({
      success: true,
      stats: {
        totalRequests: 1,
        inProgress: currentRequest.overallStatus === 'In Progress' ? 1 : 0,
        completed: currentRequest.overallStatus === 'Completed' ? 1 : 0,
        pending: currentRequest.overallStatus === 'Pending' ? 1 : 0
      },
      currentRequest
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};