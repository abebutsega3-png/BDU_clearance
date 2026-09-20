const mongoose = require('mongoose');

const assetItemSchema = new mongoose.Schema({
  assetId: { type: String, required: true },
  assetName: { type: String, required: true },
  status: { type: String, enum: ['Returned', 'Outstanding'], required: true },
  condition: { type: String, default: 'Good' }
});

const clearanceRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  department: { type: String, required: true },
  position: { type: String, required: true },
  clearanceReason: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Under Review', 'Approved', 'Returned'], 
    default: 'Pending' 
  },
  assets: [assetItemSchema],
  officerComment: { type: String, default: '' },
  returnReason: { type: String, default: '' },
  reviewedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('ClearanceRequest', clearanceRequestSchema);