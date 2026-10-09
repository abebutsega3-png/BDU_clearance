const ClearanceRequest = require('../models/hrworkflow');

// 1. Abuurista codsiga cusub ee shaqaalaha
exports.createRequest = async (req, res) => {
  try {
    const newRequest = new ClearanceRequest(req.body);
    await newRequest.save();
    res.status(201).json({ success: true, data: newRequest });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 2. HR-ka oo dooranaya qaybaha kuna gudbinaya Madaxa Qaybta (Dept Head)
exports.hrAssignAndForward = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { selectedDepartments } = req.body; // Array: ["Finance", "Property"]

    const formattedDepts = selectedDepartments.map(dept => ({
      deptName: dept,
      status: 'Pending'
    }));

    const updatedRequest = await ClearanceRequest.findByIdAndUpdate(
      requestId,
      {
        assignedDepartments: formattedDepts,
        currentStage: 'DEPT_HEAD'
      },
      { new: true }
    );

    res.status(200).json({ success: true, data: updatedRequest });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. Ansixinta Madaxa Qaybta (Dept Head Approval)
exports.deptHeadApprove = async (req, res) => {
  try {
    const { requestId } = req.params;

    const updatedRequest = await ClearanceRequest.findByIdAndUpdate(
      requestId,
      {
        'deptHeadApproval.status': 'Approved',
        'deptHeadApproval.approvedAt': new Date(),
        currentStage: 'IN_PROGRESS'
      },
      { new: true }
    );

    res.status(200).json({ success: true, data: updatedRequest });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 4. Soo saarista codsiyada loogu talagalay qayb kasta (Filtering by Department)
exports.getDepartmentRequests = async (req, res) => {
  try {
    const { deptName } = req.params;

    const requests = await ClearanceRequest.find({
      currentStage: 'IN_PROGRESS',
      'deptHeadApproval.status': 'Approved',
      'assignedDepartments.deptName': deptName
    });

    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};