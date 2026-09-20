const mongoose = require('mongoose');

const ClearanceReportSchema = new mongoose.Schema(
  {
    employeeName: {
      type: String,
      required: true,
      trim: true
    },
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    department: {
      type: String,
      required: true
    },
    campus: {
      type: String,
      required: true,
      enum: ['Main Campus', 'Woreta Campus', 'Medical Campus', 'Tibebe Ghion Campus']
    },
    requestDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      required: true,
      enum: ['Pending', 'In Progress', 'Completed', 'Rejected'],
      default: 'Pending'
    },
    rejectionReason: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ClearanceReport', ClearanceReportSchema);