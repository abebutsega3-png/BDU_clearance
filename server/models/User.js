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
        departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null, index: true },
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
        approvalNotifications: { type: Boolean, default: true },
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
        clearanceRules: {
            requireNoOutstandingAssets: { type: Boolean, default: true },
            requireOfficerComment: { type: Boolean, default: false }
        },
        assetCategories: {
            type: [{
                name: { type: String, trim: true },
                categoryCode: { type: String, trim: true, uppercase: true },
                description: { type: String, trim: true, default: '' },
                enabled: { type: Boolean, default: true }
            }],
            default: [
                { name: 'Computer / Laptop', categoryCode: 'LAP', description: 'Computers, laptops, accessories', enabled: true },
                { name: 'Monitor', categoryCode: 'MON', description: 'Computer monitors and displays', enabled: true },
                { name: 'Printer', categoryCode: 'PRN', description: 'Printers and scanners', enabled: true },
                { name: 'Office Furniture', categoryCode: 'FUR', description: 'Tables, chairs, office furniture', enabled: true },
                { name: 'Laboratory Equipment', categoryCode: 'LAB', description: 'University laboratory equipment', enabled: true },
                { name: 'Other Equipment', categoryCode: 'OTH', description: 'Other university assets', enabled: true }
            ]
        },
        assetStatuses: {
            type: [{
                name: { type: String, trim: true },
                description: { type: String, trim: true, default: '' },
                color: { type: String, enum: ['Blue', 'Green', 'Red', 'Orange', 'Purple'], default: 'Blue' }
            }],
            default: [
                { name: 'Assigned', description: 'Still assigned to employee', color: 'Blue' },
                { name: 'Returned', description: 'Returned to university', color: 'Green' },
                { name: 'Missing', description: 'Not found / lost', color: 'Red' },
                { name: 'Damaged', description: 'Damaged or broken', color: 'Orange' },
                { name: 'Cleared', description: 'All items checked and cleared', color: 'Purple' }
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
            returnedRequestEmail: { type: Boolean, default: true },
            assetReturnEmail: { type: Boolean, default: true },
            clearanceApprovedEmail: { type: Boolean, default: true },
            clearanceReturnedEmail: { type: Boolean, default: true },
            systemNotificationEmail: { type: Boolean, default: true }
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
    tokenVersion: {
        type: Number,
        default: 0
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

userSchema.index({ email: 1 }, { collation: { locale: 'en', strength: 2 } });
userSchema.index({ username: 1 }, { collation: { locale: 'en', strength: 2 } });
userSchema.index({ createdAt: -1, _id: -1 });

userSchema.methods.matchPassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;