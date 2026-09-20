const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: '' },
  password: { type: String, required: true }, // Hashed password
  role: { 
    type: String, 
    enum: ['PROPERTY_OFFICER', 'LIBRARY_OFFICER', 'HR_OFFICER', 'EMPLOYEE', 'SYSTEM_ADMIN'],
    required: true 
  },
  department: { type: String, required: true },
  campus: { type: String, required: true },

  // Notification Preferences
  notificationPreferences: {
    newClearanceRequest: { type: Boolean, default: true },
    requestResubmitted: { type: Boolean, default: true },
    assetReturn: { type: Boolean, default: true },
    actionRequired: { type: Boolean, default: true },
    systemNotification: { type: Boolean, default: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);