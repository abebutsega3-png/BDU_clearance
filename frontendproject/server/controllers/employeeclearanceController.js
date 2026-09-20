// controllers/clearanceController.js
const ClearanceRequest = require('../models/ClearanceRequest');

// የሰራተኛውን አሁናዊ የክሊራንስ መረጃ ማምጫ
exports.getMyClearanceData = async (req, res) => {
  try {
    const employeeId = req.user ? req.user.employeeId : 'BDU-EMP-00125';
    const request = await ClearanceRequest.findOne({ employeeId }).sort({ createdAt: -1 });

    if (!request) {
      return res.status(404).json({ success: false, message: 'ምንም ጥያቄ አልተገኘም' });
    }

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// አዲስ የክሊራንስ ጥያቄ መላኪያ
exports.createRequest = async (req, res) => {
  try {
    const { clearanceReason, expectedLastWorkingDate, additionalNote } = req.body;
    const documentPath = req.file ? req.file.path : null;

    const newRequest = new ClearanceRequest({
      requestId: `CLR-2024-${Math.floor(10000 + Math.random() * 90000)}`,
      employeeId: req.user ? req.user.employeeId : 'BDU-EMP-00125',
      clearanceReason,
      expectedLastWorkingDate,
      additionalNote,
      supportingDocument: documentPath,
      stages: [
        { office: 'Department Head', status: 'Completed', updatedAt: new Date() },
        { office: 'Finance Office', status: 'Completed', updatedAt: new Date() },
        { office: 'Property / Asset Office', status: 'In Progress', updatedAt: new Date() },
        { office: 'ICT Office', status: 'Pending' },
        { office: 'Library Office', status: 'Pending' },
        { office: 'Final HR Clearance', status: 'Pending' }
      ]
    });

    await newRequest.save();
    res.status(201).json({ success: true, message: 'ጥያቄው በስኬት ተልኳል', data: newRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};