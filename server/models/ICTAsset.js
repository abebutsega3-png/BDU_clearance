import mongoose from 'mongoose';

const ICTAssetSchema = new mongoose.Schema({
  assetId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  serialNumber: { type: String, required: true, unique: true, trim: true },
  assetName: { type: String, trim: true, default: '' },
  assetType: {
    type: String,
    required: true,
    enum: [
      'Laptop', 'Desktop Computer', 'Monitor', 'Printer', 'Tablet',
      'Mobile Phone', 'Projector', 'Keyboard', 'Mouse', 'UPS',
      'Network Device', 'IP Phone', 'Other ICT Equipment'
    ]
  },
  brand: { type: String, required: true },
  model: { type: String, required: true },
  notes: { type: String, trim: true, default: '' },
  campus: { type: String, required: true },
  location: { type: String, default: 'ICT Office' },
  purchaseDate: { type: Date },

  assetStatus: {
    type: String,
    enum: ['Available', 'Assigned', 'Returned', 'Damaged', 'Lost', 'Under Repair', 'Under Maintenance'],
    default: 'Available'
  },
  condition: {
    type: String,
    enum: ['New', 'Good', 'Fair', 'Refurbished', 'Damaged', 'Lost'],
    default: 'Good'
  },

  currentAssignment: {
    employeeId: { type: String },
    employeeName: { type: String },
    department: { type: String },
    campus: { type: String },
    assignedDate: { type: Date },
    returnDueDate: { type: Date },
    conditionAtAssignment: { type: String },
    assignedBy: { type: String },
    domainAccessGranted: { type: Boolean, default: false },
    remarks: { type: String }
  },

  history: [{
    action: {
      type: String,
      enum: ['REGISTERED', 'ASSIGNED', 'RETURNED', 'TRANSFERRED', 'CONDITION_UPDATE']
    },
    employeeId: String,
    employeeName: String,
    department: String,
    condition: String,
    performedBy: String,
    timestamp: { type: Date, default: Date.now },
    notes: String
  }]
}, { timestamps: true });

export default mongoose.model('ICTAsset', ICTAssetSchema);