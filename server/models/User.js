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
        employeeInformationUpdated: { type: Boolean, default: true },
        propertyVerificationRequired: { type: Boolean, default: true },
        clearanceApproved: { type: Boolean, default: true },
        clearanceReturned: { type: Boolean, default: true },
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
    propertyOffice: {
        name: { type: String, default: 'Property / Asset Management Office' },
        email: { type: String, default: '' },
        phone: { type: String, default: '' },
        campus: { type: String, default: 'Main Campus' },
        location: { type: String, default: '' }
    },
    propertySettings: {
        assetCategories: {
            type: [{ name: String, enabled: { type: Boolean, default: true } }],
            default: [
                { name: 'Computer / Laptop', enabled: true },
                { name: 'Monitor', enabled: true },
                { name: 'Printer', enabled: true },
                { name: 'Office Furniture', enabled: true },
                { name: 'Laboratory Equipment', enabled: true },
                { name: 'Other Equipment', enabled: true }
            ]
        },
        clearanceChecklist: {
            type: [{ key: String, label: String, enabled: { type: Boolean, default: true } }],
            default: [
                { key: 'assignedAssetsChecked', label: 'Assigned Assets Checked', enabled: true },
                { key: 'assetsReturned', label: 'Assets Returned', enabled: true },
                { key: 'assetRecordsUpdated', label: 'Asset Records Updated', enabled: true },
                { key: 'noOutstandingProperty', label: 'No Outstanding Property', enabled: true },
                { key: 'propertyResponsibilityCleared', label: 'Property Responsibility Cleared', enabled: true }
            ]
        },
        emailPreferences: {
            inSystemNotifications: { type: Boolean, default: true },
            emailNotifications: { type: Boolean, default: true },
            newRequestEmail: { type: Boolean, default: true },
            returnedRequestEmail: { type: Boolean, default: true }
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date,
        default: null
    },
    passwordChangedAt: {
        type: Date,
        default: null
    },
    twoFactorEnabled: {
        type: Boolean,
        default: false
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