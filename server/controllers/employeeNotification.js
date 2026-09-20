const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    relatedTo: { type: String, required: true }, // e.g., 'CLR-2026-0089'
    type: { 
      type: String, 
      enum: ['submit', 'check', 'users', 'clock', 'shield', 'award', 'completed', 'download'], 
      default: 'check' 
    },
    status: { type: String, enum: ['Unread', 'Read'], default: 'Unread' },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);