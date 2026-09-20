const mongoose = require('mongoose');

const ClearanceRequestSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, unique: true },
    employeeId: { type: String, required: true },
    clearanceReason: { type: String, required: true },
    expectedLastWorkingDate: { type: Date, required: true },
    additionalNote: { type: String, default: '' },
    supportingDocument: { type: String, default: null },
    submittedDate: { type: Date, default: Date.now },
    currentStage: { type: String, default: 'Property / Asset Office' },
    overallStatus: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Rejected'],
      default: 'In Progress'
    },
    stages: [
      {
        office: { type: String, required: true },
        status: {
          type: String,
          enum: ['Pending', 'In Progress', 'Completed', 'Rejected'],
          default: 'Pending'
        },
        updatedAt: { type: Date }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.models.ClearanceRequest || mongoose.model('ClearanceRequest', ClearanceRequestSchema);