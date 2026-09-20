const mongoose = require('mongoose');

const clearanceRequestSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    department: { type: String, required: true },
    position: { type: String, required: true },
    requestDate: { type: Date, default: Date.now },
    clearanceType: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Under Review', 'Approved', 'Returned', 'Completed'],
      default: 'Pending'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.ClearanceRequest || mongoose.model('ClearanceRequest', clearanceRequestSchema);