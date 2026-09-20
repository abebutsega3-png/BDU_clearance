import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
  assetId: { type: String, required: true, unique: true },
  assetName: { type: String, required: true },
  assetType: { type: String, default: 'General Equipment' },
  category: { type: String, default: 'General Equipment' },
  employeeName: { type: String, default: 'Unknown Employee' },
  employeeId: { type: String, default: 'N/A' },
  department: { type: String, default: 'N/A' },
  campus: { type: String, default: 'Main Campus' },
  assignedDate: { type: Date },
  returnDate: { type: Date },
  status: { type: String, default: 'Outstanding' },
  condition: { type: String, default: 'Good' },
  history: [{
    date: { type: Date },
    action: { type: String }
  }]
}, { timestamps: true });

export default mongoose.models.propertyAsset || mongoose.model('propertyAsset', assetSchema);
