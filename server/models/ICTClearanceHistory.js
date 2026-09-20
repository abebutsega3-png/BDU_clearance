const mongoose = require('mongoose');

const ICTClearanceHistorySchema = new mongoose.Schema({
  clearanceId: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    trim: true 
  },
  employeeId: { type: String, required: true, trim: true },
  employeeName: { type: String, required: true },
  department: { type: String, required: true },
  campus: { type: String, required: true },
  clearanceType: { 
    type: String, 
    enum: ['Resignation', 'Retirement', 'Transfer', 'Study Leave', 'Contract End', 'Other'],
    required: true 
  },
  assetsHandled: [{
    assetId: { type: String, required: true },
    assetType: { type: String, required: true },
    serialNumber: { type: String },
    conditionAtReturn: { type: String, enum: ['Good', 'Fair', 'Damaged', 'Lost'] },
    accessoriesReturned: {
      charger: { type: Boolean, default: false },
      bag: { type: Boolean, default: false },
      mouse: { type: Boolean, default: false }
    }
  }],
  ictStatus: { 
    type: String, 
    enum: ['APPROVED', 'REJECTED'], 
    required: true 
  },
  processedBy: { type: String, required: true }, // e.g., "abebe aa"
  processedDate: { type: Date, default: Date.now },
  remarks: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('ICTClearanceHistory', ICTClearanceHistorySchema);