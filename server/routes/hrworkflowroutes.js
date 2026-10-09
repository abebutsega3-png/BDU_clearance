const express = require('express');
const router = express.Router();
const {
  createRequest,
  hrAssignAndForward,
  deptHeadApprove,
  getDepartmentRequests
} = require('../controllers/HRworkflow');

router.post('/request', createRequest);
router.put('/hr-forward/:requestId', hrAssignAndForward);
router.put('/dept-head-approve/:requestId', deptHeadApprove);
router.get('/department/:deptName', getDepartmentRequests);

module.exports = router;