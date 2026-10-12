import mongoose from 'mongoose';

const clearanceRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true },
  fullName: { type: String, required: true },
  department: { type: String, required: true },
  clearanceType: { type: String, required: true },
  submissionDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Approved', 'Returned', 'Rejected'],
    default: 'Pending',
  },
  registrarStatus: {
    type: String,
    enum: ['Pending', 'In Progress', 'Approved', 'Returned', 'Rejected'],
    default: 'Pending',
  },
  academicVerificationStatus: { type: String, default: 'Pending' },
  documentVerificationStatus: { type: String, default: 'Pending' },
  reviewComment: { type: String, default: '' },
}, { timestamps: true });

const ClearanceRequest = mongoose.models.ClearanceRequest || mongoose.model('ClearanceRequest', clearanceRequestSchema);

export default ClearanceRequest;