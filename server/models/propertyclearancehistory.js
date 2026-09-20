const mongoose = require('mongoose');

const clearanceRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true, ref: 'Employee' },
  clearanceReason: { type: String, required: true },
  requestDate: { type: Date, default: Date.now },

  // Property Section Decision Data
  property: {
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Returned'],
      default: 'Pending'
    },
    reviewedBy: { type: String }, // User ID / Name of Property Officer
    reviewedAt: { type: Date },
    comment: { type: String },
    returnReason: { type: String },
    assetSummary: {
      assigned: { type: Number, default: 0 },
      returned: { type: Number, default: 0 },
      outstanding: { type: Number, default: 0 }
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('ClearanceRequest', clearanceRequestSchema);