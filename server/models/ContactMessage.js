import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  employeeId: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  subject: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  targetDepartment: { type: String, enum: ['HR', 'Admin'], default: 'HR' },
  status: { type: String, enum: ['Unread', 'Read', 'Replied'], default: 'Unread' },
  replyMessage: { type: String, default: '' },
  repliedAt: { type: Date, default: null },
}, { timestamps: true });

contactMessageSchema.index({ targetDepartment: 1, createdAt: -1 });
contactMessageSchema.index({ employeeId: 1, createdAt: -1 });

const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);
export default ContactMessage;
