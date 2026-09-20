import mongoose from 'mongoose';

const positionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  code: { type: String, trim: true, default: '' },
  department: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const Position = mongoose.model('Position', positionSchema);
export default Position;
