const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  type: {
    type: String,
    enum: [
      'CLEARANCE_REQUEST',
      'CLEARANCE_RESUBMITTED',
      'ASSET_RETURNED',
      'ACTION_REQUIRED',
      'CLEARANCE_UPDATED'
    ],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  relatedRequestId: { type: String },
  relatedAssetId: { type: String },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);