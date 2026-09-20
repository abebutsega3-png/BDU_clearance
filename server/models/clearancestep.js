import mongoose from 'mongoose';

const clearanceStepSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  type: { type: String, required: true, trim: true },
  order: { type: Number, required: true, min: 1 },
  required: { type: String, enum: ['Yes', 'No'], default: 'Yes' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  description: { type: String, default: '', trim: true },
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  approver: { type: String, default: '', trim: true },
  allowRejection: { type: String, enum: ['Yes', 'No'], default: 'Yes' },
  allowComments: { type: String, enum: ['Yes', 'No'], default: 'Yes' },
}, { timestamps: true });

clearanceStepSchema.index({ name: 1 }, { unique: true });
clearanceStepSchema.index({ order: 1 }, { unique: true });

const ClearanceStep = mongoose.model('ClearanceStep', clearanceStepSchema);
export default ClearanceStep;
