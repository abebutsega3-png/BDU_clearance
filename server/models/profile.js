const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  employeeId: { type: String, required: true, unique: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  dateOfBirth: { type: Date },
  phoneNumber: { type: String },
  email: { type: String, required: true, unique: true },
  avatar: { type: String, default: '' },
  
  // Employment Details
  department: { type: String, default: 'Human Resources' },
  position: { type: String, default: 'HR Officer' },
  jobGrade: { type: String, default: 'Grade 8' },
  employmentType: { type: String, default: 'Full Time' },
  hireDate: { type: Date },
  campus: { type: String, default: 'Main Campus' },
  sectionTeam: { type: String, default: 'HR Operations' },
  employeeStatus: { type: String, default: 'Active' },
  workEmail: { type: String },
  officeLocation: { type: String, default: 'HR Office, Room 203' },
  
  aboutMe: { type: String },
  
  // Account Information
  role: { type: String, default: 'HR Officer' },
  accountStatus: { type: String, default: 'Active' },
  lastLogin: { type: Date },
  accountCreated: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);