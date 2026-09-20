import mongoose from 'mongoose';

const ICTSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  notifications: {
    newClearanceRequest: { type: Boolean, default: true },
    requestResubmitted: { type: Boolean, default: true },
    pendingReminder: { type: Boolean, default: true },
    clearanceReturned: { type: Boolean, default: true },
    clearanceApproved: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true }
  },
  security: {
    twoFactorAuth: { type: Boolean, default: false },
    loginAlerts: { type: Boolean, default: true }
  },
  appearance: {
    theme: { type: String, enum: ['Light', 'Dark', 'System'], default: 'System' },
    language: { type: String, enum: ['English', 'Amharic'], default: 'English' },
    rowsPerPage: { type: Number, default: 10 }
  },
  clearancePreferences: {
    defaultView: { 
      type: String, 
      enum: ['Pending Requests', 'All Requests'], 
      default: 'Pending Requests' 
    },
    defaultSort: { type: String, enum: ['Newest First', 'Oldest First'], default: 'Newest First' },
    showReturnedRequests: { type: Boolean, default: true },
    showCompletedRequests: { type: Boolean, default: true }
  }
}, { timestamps: true });

export default mongoose.model('ICTSettings', ICTSettingsSchema);