const mongoose = require('mongoose');

const clearanceRequestSchema = new mongoose.Schema({
  employeeName: { type: String, required: true },
  employeeId: { type: String, required: true },
  department: { type: String, required: true },
  reason: { type: String, required: true },
  
  // Heerka codsigu marayo (HR_INITIAL, DEPT_HEAD, IN_PROGRESS, COMPLETED, REJECTED)
  currentStage: {
    type: String,
    enum: ['HR_INITIAL', 'DEPT_HEAD', 'IN_PROGRESS', 'COMPLETED', 'REterned'],
    default: 'HR_INITIAL'
  },

  // Qaybaha uu HR-ku doortay si gacanta ah (Manual Routing List)
  assignedDepartments: [{
    deptName: { type: String, required: true }, // e.g. "Finance", "Property", "Library", "ICT"
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    remarks: { type: String, default: '' },
    approvedAt: { type: Date }
  }],

  // Go'aanka Madaxa Qaybta (Department Head)
  deptHeadApproval: {
    status: { type: String, enum: ['Pending', 'Approved', 'Returned'], default: 'Pending' },
    remarks: { type: String, default: '' },
    approvedAt: { type: Date }
  }
}, { timestamps: true });

module.exports = mongoose.model('ClearanceRequest', clearanceRequestSchema);