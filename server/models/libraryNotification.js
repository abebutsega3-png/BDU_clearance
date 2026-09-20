const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientRole: {
      type: String,
      default: 'Library Officer'
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: [
        'New Clearance Request',
        'Request Resubmitted',
        'Clearance Process Update',
        'Report Request',
        'Report Sent Successfully'
      ],
      required: true
    },
    category: {
      type: String,
      enum: ['Clearance', 'Reports'],
      required: true
    },
    requestId: {
      type: String,
      default: null
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);