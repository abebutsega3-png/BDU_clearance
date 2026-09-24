import mongoose from 'mongoose';

const notificationTypeEnum = [
  'NEW_CLEARANCE_REQUEST',
  'CLEARANCE_REQUEST_RETURNED',
  'CLEARANCE_INFO_UPDATED',
  'IT_ASSET_UPDATED',
  'PENDING_REMINDER',
  'CLEARANCE_FOLLOWUP',
  'ICT_CLEARANCE_APPROVED',
  'ICT_CLEARANCE_RETURNED',
  'CANCELLED',
  'CLEARANCE_REQUEST',
  'NEW_CLEARANCE_REQUEST',
  'CLEARANCE_RESUBMITTED',
  'ASSET_RETURNED',
  'ACTION_REQUIRED',
  'CLEARANCE_UPDATED',
  'INITIAL_HR_APPROVED',
  'CLEARANCE_APPROVED',
  'CLEARANCE_RETURNED',
  'CLEARANCE_READY_FOR_REVIEW',
  'CLEARANCE_READY_FOR_LIBRARY',
  'CLEARANCE_READY_FOR_PROPERTY',
  'CLEARANCE_READY_FOR_ICT',
  'REVIEW_REMINDER',
  'EMPLOYEE_UPDATED_REQUEST_DEPARTMENT',
  'CLEARANCE_RETURNED',
  'ALL_DEPARTMENT_TASKS_COMPLETED',
  'FINAL_HR_CLEARANCE_UPDATE',
  'CLEARANCE_INFORMATION_UPDATED',
  'IT_ASSET_INFORMATION_UPDATED',
  'PENDING_CLEARANCE_REMINDER',
  'PROPERTY_PENDING_REMINDER',
  'CLEARANCE_FOLLOW_UP',
  'NEW_REQUEST',
  'REQUEST_ASSIGNED',
  'OBLIGATION_FOUND',
  'CORRECTION_REQUIRED',
  'CLEARANCE_READY_FOR_FINANCE',
  'REQUEST_RETURNED_TO_FINANCE',
  'EMPLOYEE_UPDATED_REQUEST',
  'FINANCE_APPROVED',
  'FINANCE_RETURNED',
  'CLEARANCE_COMPLETED',
  'FINAL_HR_CLEARANCE_COMPLETED',
  'REQUEST_SUBMITTED',
  'CLEARANCE_IN_PROGRESS',
  'CLEARANCE_PROGRESS_UPDATED',
  'ALL_CLEARANCES_COMPLETED',
  'CERTIFICATE_ISSUED',
  'new_request',
  'request_received',
  'stage_started',
  'dept_completed',
  'pending',
  'returned',
  'action_required',
  'in_progress',
  'ready_review',
  'resignation',
  'dismissed',
  'final_review',
  'final_completed',
  'certificate_available',
  'cancelled',
  'New Clearance Request',
  'Clearance Awaiting Your Review',
  'Clearance Resubmitted',
  'Outstanding Library Material',
  'Outstanding Library Fine',
  'Library Action Required'
  ,'SYSTEM_USER_CREATED'
  ,'SYSTEM_DEPARTMENT_ADDED'
  ,'SYSTEM_DEPARTMENT_UPDATED'
  ,'SYSTEM_POSITION_CREATED'
  ,'SYSTEM_POSITION_UPDATED'
  ,'SYSTEM_POSITION_DELETED'
  ,'SYSTEM_SETTINGS_UPDATED'
  ,'SYSTEM_PASSWORD_RESET'
  ,'SYSTEM_ACCOUNT_DISABLED'
  ,'SYSTEM_SECURITY_EVENT'
  ,'SYSTEM_ERROR'
  ,'SYSTEM_AUDIT_EVENT'
];

const NotificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  targetName: { type: String, default: '' },
  employeeId: { type: String, default: '' },
  type: { type: String, enum: notificationTypeEnum, required: true },
  actionText: { type: String, default: 'View Request' },
  actionLink: { type: String, default: '#' },
  relatedRequestId: { type: String, default: null },
  clearanceRequestId: { type: String, default: null },
  relatedAssetId: { type: String, default: null },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

NotificationSchema.pre('validate', function() {
  if (!this.clearanceRequestId && this.relatedRequestId) {
    this.clearanceRequestId = this.relatedRequestId;
  }
  if (!this.relatedRequestId && this.clearanceRequestId) {
    this.relatedRequestId = this.clearanceRequestId;
  }
});

const Notification = mongoose.model('Notification', NotificationSchema);
export default Notification;