import mongoose from 'mongoose';

const hasLetters = (value) => /[\p{L}]/u.test(String(value || '').trim());

const ICTAssetSchema = new mongoose.Schema({
  assetId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    match: /^[A-Z0-9-]+$/
  },
  serialNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    match: /^[A-Z0-9][A-Z0-9: -]*[A-Z0-9]$/
  },
  assetName: { type: String, required: true, trim: true, validate: { validator: hasLetters, message: 'Asset Name cannot contain numbers only.' } },
  assetType: {
    type: String,
    required: true,
    enum: [
      'Laptop', 'Desktop Computer', 'Monitor', 'Printer', 'Tablet',
      'Mobile Phone', 'Projector', 'Keyboard', 'Mouse', 'UPS',
      'Network Device', 'IP Phone', 'Other ICT Equipment'
    ]
  },
  brand: { type: String, required: true, trim: true, validate: { validator: hasLetters, message: 'Brand cannot contain numbers only.' } },
  model: { type: String, required: true, trim: true, validate: { validator: hasLetters, message: 'Model cannot contain numbers only.' } },
  notes: { type: String, trim: true, default: '' },
  campus: { type: String, required: true, trim: true, validate: { validator: hasLetters, message: 'Campus cannot contain numbers only.' } },
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