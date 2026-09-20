const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema(
  {
    // Read-Only Fields (Managed by Admin/HR)
    employeeId: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    gender: { type: String, enum: ['Male', 'Female'], required: true },
    dateOfBirth: { type: String, required: true },
    department: { type: String, default: 'Library' },
    position: { type: String, default: 'Library Officer' },
    campus: { type: String, default: 'Main (Peda) Campus' },
    employeeStatus: { type: String, default: 'Active' },
    employmentDate: { type: String, required: true },

    // Editable Fields by Library Officer
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    alternativePhone: { type: String, default: '' },
    profilePhoto: { type: String, default: '' },

    // Security Field
    password: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserProfile', userProfileSchema);