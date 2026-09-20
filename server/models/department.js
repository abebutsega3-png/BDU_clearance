import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  departmentName: { type: String, required: true, trim: true },
  departmentCode: { type: String, required: true, trim: true, uppercase: true },
  description: { type: String, default: '', trim: true },
  departmentType: { type: String, required: true, trim: true },
  campus: { type: String, default: '', trim: true },
  collegeInstitute: { type: String, default: '', trim: true },
  building: { type: String, default: '' },
  office: { type: String, default: '' },
  departmentHead: { type: String, default: '', trim: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  delegatedAssistant: { type: String, default: '' },
  isApprovingDepartment: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const Department = mongoose.model('Department', departmentSchema);
export default Department;
