import mongoose from 'mongoose';

const SystemSettingsSchema = new mongoose.Schema({
  general: {
    systemName: { type: String, default: 'Bahir Dar University Employee Clearance System' },
    universityName: { type: String, default: 'Bahir Dar University' },
    systemLogo: { type: String, default: '/logo.png' },
    systemEmail: { type: String, default: 'admin@bdu.edu.et' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    timeZone: { type: String, default: 'Africa/Addis_Ababa' },
    language: { type: String, default: 'English' }
  },
  usersAndAccounts: {
    allowUserRegistration: { type: Boolean, default: false },
    requireEmailVerification: { type: Boolean, default: true },
    passwordExpiration: { type: Boolean, default: true },
    passwordExpiryDays: { type: Number, default: 90 },
    maximumLoginAttempts: { type: Number, default: 5 },
    sessionTimeout: { type: String, default: '30 minutes' },
    accountLockoutDuration: { type: String, default: '30 minutes' },
    forcePasswordChangeOnFirstLogin: { type: Boolean, default: true }
  },
  notifications: {
    emailNotifications: { type: Boolean, default: true },
    systemNotifications: { type: Boolean, default: true },
    notifyWhen: {
      newUserCreated: { type: Boolean, default: true },
      newEmployeeAdded: { type: Boolean, default: true },
      passwordResetRequested: { type: Boolean, default: true },
      securityAlert: { type: Boolean, default: true },
      userAccountDeactivated: { type: Boolean, default: true },
      employeeClearanceCompleted: { type: Boolean, default: true },
      systemErrorOccurred: { type: Boolean, default: true },
      backupCompleted: { type: Boolean, default: false }
    }
  },
  security: {
    twoFactorAuth: { type: Boolean, default: true },
    accountLockout: { type: Boolean, default: true },
    failedLoginAlert: { type: Boolean, default: true },
    passwordStrength: { type: String, default: 'Strong' },
    minimumPasswordLength: { type: Number, default: 8 },
    auditLogging: { type: Boolean, default: true },
    encryptSensitiveData: { type: Boolean, default: true },
    requireUppercase: { type: Boolean, default: true },
    requireNumber: { type: Boolean, default: true },
    requireSpecial: { type: Boolean, default: true },
    passwordChangeOnFirstLogin: { type: Boolean, default: true },
    maxFailedAttempts: { type: Number, default: 5 },
    accountLockDuration: { type: String, default: '30 Minutes' },
    sessionTimeout: { type: String, default: '30 Minutes' }
  },
  certificate: {
    template: { type: String, default: 'BDU Standard Certificate' },
    authorizedSignatory: { type: String, default: 'Registrar Office' },
    certificatePrefix: { type: String, default: 'BDU-CLR' },
    certificateNumberFormat: { type: String, default: 'BDU-CLR-0001' },
    qrVerification: { type: Boolean, default: true },
    autoGenerate: { type: Boolean, default: true }
  },
  backupAndMaintenance: {
    automaticBackup: { type: Boolean, default: true },
    backupFrequency: { type: String, default: 'Daily' },
    lastBackup: { type: String, default: '27/08/2026 01:00 AM' },
    nextBackup: { type: String, default: '28/08/2026 01:00 AM' },
    maintenanceMode: { type: Boolean, default: false }
  },
  hrSettings: {
    requiredOffices: {
      departmentHead: { type: Boolean, default: true },
      finance: { type: Boolean, default: true },
      property: { type: Boolean, default: true },
      ict: { type: Boolean, default: true },
      library: { type: Boolean, default: true }
    },
    finalHrClearanceEnabled: { type: Boolean, default: true },
    generateCertificateAfterApproval: { type: Boolean, default: true },
    notifications: {
      newClearanceRequest: { type: Boolean, default: true },
      clearanceProgressUpdated: { type: Boolean, default: true },
      clearanceResubmitted: { type: Boolean, default: true },
      allOfficesApproved: { type: Boolean, default: true },
      clearanceCompleted: { type: Boolean, default: true },
      certificateGenerated: { type: Boolean, default: true }
    },
    certificate: {
      generation: { type: String, default: 'Automatic (Recommended)' },
      trigger: { type: String, default: 'After HR Approval' },
      numberPrefix: { type: String, default: 'BDU-CLR' },
      format: { type: String, default: 'PDF' }
    },
    security: {
      sessionTimeout: { type: String, default: '30 minutes' },
      notifyOnNewLogin: { type: Boolean, default: true }
    }
  }
}, { timestamps: true });

const SystemSettings = mongoose.model('SystemSettings', SystemSettingsSchema);

export default SystemSettings;