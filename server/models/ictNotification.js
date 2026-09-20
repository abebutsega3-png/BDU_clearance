import mongoose from 'mongoose';

const ictNotificationSchema = new mongoose.Schema({
  recipientRole: {
    type: String,
    enum: ['ICT_Officer', 'HR_Officer', 'Department_Head', 'Property_Officer', 'Finance_Officer', 'Employee'],
    required: true
  },
  type: {
    type: String,
    enum: [
      'New Clearance Request',
      'Outstanding ICT Asset Alert',
      'Clearance Returned',
      'Clearance Approved',
      'Pending Clearance Reminder',
      'Clearance Request Updated',
      'New Comment on ICT Clearance'
    ],
    required: true
  },
  category: {
    type: String,
    enum: ['Clearance', 'Asset', 'Reminder', 'System'],
    required: true
  },
  employeeName: { type: String, required: true },
  employeeId: { type: String, required: true },
  clearanceId: { type: String },
  assetDetails: {
    assetName: String,
    assetId: String,
    status: String
  },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical', 'success'],
    default: 'info'
  }
}, { timestamps: true });

export default mongoose.model('ictNotification', ictNotificationSchema);