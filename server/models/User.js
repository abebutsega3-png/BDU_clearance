import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    username: { type: String, trim: true, default: '' },
    employeeId: { type: String, trim: true, default: '' },
    email: {
        type: String,
        lowercase: true,
        trim: true,
        default: ''
    },
    gender: { type: String, trim: true, default: '' },
    dateOfBirth: { type: String, trim: true, default: '' },
    phoneNumber: { type: String, trim: true, default: '' },
    alternativePhone: { type: String, trim: true, default: '' },
    position: { type: String, trim: true, default: '' },
    campus: { type: String, trim: true, default: 'Main (Peda) Campus' },
    dateJoined: { type: Date },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        trim: true,
        required: true
    },
        department: { type: String, trim: true, default: '' },
        status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    profileImage: {
        type: String
    },
    notificationPreferences: {
        emailNotifications: { type: Boolean, default: true },
        newClearanceRequest: { type: Boolean, default: true },
        requestResubmitted: { type: Boolean, default: true },
        pendingReviewReminder: { type: Boolean, default: true },
        hrClearanceUpdate: { type: Boolean, default: true },
        importantUpdates: { type: Boolean, default: true },
        inSystemNewRequest: { type: Boolean, default: true },
        inSystemRequestResubmitted: { type: Boolean, default: true },
        assetReturn: { type: Boolean, default: true },
        actionRequired: { type: Boolean, default: true },
        systemNotification: { type: Boolean, default: true }
    },
    displayPreferences: {
        theme: { type: String, enum: ['system', 'light', 'dark'], default: 'system' },
        language: { type: String, default: 'English' }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date,
        default: null
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

userSchema.methods.matchPassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;