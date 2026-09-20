const mongoose = require('mongoose');

const ClearanceSchema = new mongoose.Schema({
  employee: {
    employeeId: { type: String, required: true },
    fullName: { type: String, required: true },
    department: { type: String, required: true },
    position: { type: String, required: true },
    campus: { type: String, required: true },
    employmentType: { type: String, required: true },
    supervisor: { type: String, required: true },
    lastWorkingDate: { type: Date, required: true },
    avatarUrl: { type: String }
  },
  requestInfo: {
    clearanceRequestId: { type: String, required: true, unique: true },
    clearanceType: { type: String, required: true },
    reason: { type: String, required: true },
    requestDate: { type: Date, required: true },
    currentStatus: { type: String, default: 'Pending HR Final Clearance' }
  },
  departmentSummaries: [{
    department: String,
    status: { type: String, enum: ['Approved', 'Pending', 'Rejected'] },
    clearedBy: String,
    clearedDate: Date,
    remarks: String
  }],
  outstandingItems: {
    financialObligation: { type: Boolean, default: false },
    universityProperty: { type: Boolean, default: false },
    libraryMaterials: { type: Boolean, default: false },
    ictEquipment: { type: Boolean, default: false },
    otherIssues: { type: Boolean, default: false }
  },
  verificationChecklist: {
    employeeInfoVerified: { type: Boolean, default: false },
    employmentRecordVerified: { type: Boolean, default: false },
    lastWorkingDateVerified: { type: Boolean, default: false },
    allDepartmentClearancesCompleted: { type: Boolean, default: false },
    noOutstandingItems: { type: Boolean, default: false },
    documentsReviewed: { type: Boolean, default: false }
  },
  hrRemarks: {
    text: String,
    enteredBy: String,
    date: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Clearance', ClearanceSchema);