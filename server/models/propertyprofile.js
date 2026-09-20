const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  gender: { type: String, enum: ['Male', 'Female'], required: true },
  dateOfBirth: { type: Date },
  phone: { type: String, required: true },
  alternativePhone: { type: String, default: '' },
  email: { type: String, required: true, unique: true },
  department: { type: String, required: true },
  position: { type: String, required: true },
  employmentType: { type: String, enum: ['Permanent', 'Contract'], default: 'Permanent' },
  employmentDate: { type: Date, required: true },
  status: { type: String, enum: ['Active', 'On Leave', 'Terminated'], default: 'Active' },
  campus: { type: String, required: true },
  profilePhoto: { type: String, default: '' },
  documents: {
    idDocument: { type: String, default: '' },
    employmentLetter: { type: String, default: '' },
    appointmentLetter: { type: String, default: '' }
  }
}, { timestamps: true });

module.exports = mongoose.model('PropertyProfile', employeeSchema);