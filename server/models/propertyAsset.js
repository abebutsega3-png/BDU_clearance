import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
  assetId: { type: String, required: true, unique: true },
  assetName: { type: String, required: true },
  serialNumber: { type: String, trim: true, default: '' },
  handoverVoucher: { type: String, trim: true, default: '' },
  vehicleNumber: { type: String, trim: true, default: '' },
  plateNumber: { type: String, trim: true, default: '' },
  make: { type: String, trim: true, default: '' },
  model: { type: String, trim: true, default: '' },
  manufacturingYear: { type: Number, min: 1900, max: new Date().getFullYear(), default: null },
  color: { type: String, trim: true, default: '' },
  seatingCapacity: { type: Number, min: 1, default: null },
  currentMileage: { type: Number, min: 0, default: null },
  chassisNumber: { type: String, trim: true, default: '' },
  engineNumber: { type: String, trim: true, default: '' },
  registrationDate: { type: Date, default: null },
  registrationExpiryDate: { type: Date, default: null },
  insuranceExpiryDate: { type: Date, default: null },
  lastMaintenanceDate: { type: Date, default: null },
  nextMaintenanceDate: { type: Date, default: null },
  assetType: { type: String, default: 'General Equipment' },
  category: { type: String, default: 'General Equipment' },
  purchaseDate: { type: Date, default: null },
  purchaseValue: { type: Number, min: 0, default: 0 },
  location: { type: String, trim: true, default: '' },
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
