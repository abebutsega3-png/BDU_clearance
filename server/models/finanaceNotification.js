import mongoose from 'mongoose';

const financeNotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientRole: {
      type: String,
      required: true,
      enum: [
        'System Admin',
        'HR Officer',
        'Department Head',
        'Finance Officer',
        'Library Officer',
        'Property Officer',
        'ICT Officer',
        'Employee',
      ],
    },
    type: {
      type: String,
      required: true,
      enum: [
        'NEW_REQUEST',
        'REQUEST_ASSIGNED',
        'PENDING_REMINDER',
        'OBLIGATION_FOUND',
        'CORRECTION_REQUIRED',
        'FINANCE_APPROVED',
        'FINANCE_RETURNED',
        'FINAL_CLEARANCE',
      ],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    clearanceRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClearanceRequest',
      default: null,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    actionUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

const FinanceNotification = mongoose.models.finanacenotification || mongoose.model('finanacenotification', financeNotificationSchema);

export default FinanceNotification;