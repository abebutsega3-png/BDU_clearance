import mongoose from 'mongoose';

const clearanceRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  department: { type: String, required: true },
  date: { type: String, required: true },
  status: {
    type: String,
    enum: ['Pending', 'Under Review', 'Approved', 'Returned'],
    default: 'Pending'
  },
  overallStatus: {
    type: String,
    enum: ['Pending', 'Under Review', 'Approved', 'Returned'],
    default: 'Pending'
  }
}, { timestamps: true });

const ClearanceRequestModel = mongoose.models.ClearanceRequest || mongoose.model('ClearanceRequest', clearanceRequestSchema);

const outstandingAssetSchema = new mongoose.Schema({
  assetId: { type: String, required: true, unique: true },
  assetName: { type: String, required: true },
  employeeName: { type: String, required: true },
  employeeId: { type: String, required: true },
  status: { type: String, default: 'Outstanding' }
}, { timestamps: true });

const activityLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  requestId: { type: String, required: true },
  timeAgo: { type: String, required: true },
  type: { type: String, enum: ['Approved', 'Returned', 'Review'], required: true }
}, { timestamps: true });

export const ClearanceRequest = ClearanceRequestModel;
export const OutstandingAsset = mongoose.models.OutstandingAsset || mongoose.model('OutstandingAsset', outstandingAssetSchema);
export const ActivityLog = mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);