import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
  assetId: { type: String, required: true, unique: true },
  assetName: { type: String, required: true },
  vehicleNumber: { type: String, trim: true, default: '' },
  plateNumber: { type: String, trim: true, default: '' },
  make: { type: String, trim: true, default: '' },
  model: { type: String, trim: true, default: '' },
  assetType: { type: String, default: 'General Equipment' },
  category: { type: String, default: 'General Equipment' },
  employeeName: { type: String, default: 'Unknown Employee' },
  employeeId: { type: String, default: 'N/A' },
  department: { type: String, default: 'N/A' },
  campus: { type: String, default: 'Main Campus' },
  assignedDate: { type: Date },
  returnDate: { type: Date },
  remarks: { type: String, trim: true, default: '' },
  status: { type: String, default: 'Outstanding' },
  condition: { type: String, default: 'Good' },
  assignmentHistory: [{
    employeeName: { type: String, default: '' },
    employeeId: { type: String, default: '' },
    department: { type: String, default: '' },
    assignedDate: { type: Date, default: null },
    returnedDate: { type: Date, default: null },
    status: { type: String, default: '' },
    remarks: { type: String, default: '' },
  }],
  history: [{
    date: { type: Date },
    action: { type: String }
  }]
}, { timestamps: true });

export default mongoose.models.propertyAsset || mongoose.model('propertyAsset', assetSchema);
