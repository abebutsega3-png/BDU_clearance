import mongoose from "mongoose";

const financeSettingsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    clearanceRules: {
      requireFinancialReview: { type: Boolean, default: true },
      requireRemarksOnReturn: { type: Boolean, default: true },
      requireRemarksOnReject: { type: Boolean, default: true },
      requireReferenceNumber: { type: Boolean, default: true },
      allowApprovalWithBalance: { type: Boolean, default: false },
    },
    obligationRules: {
      enableChecking: { type: Boolean, default: true },
      allowedTypes: {
        employeeAdvance: { type: Boolean, default: true },
        staffLoan: { type: Boolean, default: true },
        outstandingPayment: { type: Boolean, default: true },
        otherLiability: { type: Boolean, default: true },
      },
      outstandingBalanceRule: {
        type: String,
        enum: ["BLOCK_CLEARANCE", "ALLOW_WITH_WARNING", "ALLOW_OFFICER_DECISION"],
        default: "ALLOW_OFFICER_DECISION",
      },
    },
    notifications: {
      newClearanceRequest: { type: Boolean, default: true },
      requestAssigned: { type: Boolean, default: true },
      pendingReminder: { type: Boolean, default: true },
      obligationFound: { type: Boolean, default: true },
      correctionRequired: { type: Boolean, default: true },
      returnedToFinance: { type: Boolean, default: true },
      systemAnnouncements: { type: Boolean, default: true },
      inAppChannel: { type: Boolean, default: true },
      emailChannel: { type: Boolean, default: false },
    },
    reminders: {
      enableReminder: { type: Boolean, default: true },
      remindAfterDays: { type: Number, default: 3 },
      repeatEveryDays: { type: Number, default: 2 },
    },
    reports: {
      defaultDateRange: { type: String, default: "THIS_MONTH" },
      defaultReportType: { type: String, default: "SUMMARY" },
      exportFormats: {
        pdf: { type: Boolean, default: true },
        excel: { type: Boolean, default: true },
      },
      includeEmployeeId: { type: Boolean, default: true },
      includeDepartment: { type: Boolean, default: true },
      includeReferenceNumber: { type: Boolean, default: true },
      includeObligationDetails: { type: Boolean, default: true },
    },
    security: {
      requireApprovalConfirmation: { type: Boolean, default: true },
      requireReturnConfirmation: { type: Boolean, default: true },
      enableAuditLogging: { type: Boolean, default: true },
      autoLogoutMinutes: { type: Number, default: 30 },
    },
  },
  { timestamps: true }
);

export default mongoose.model("FinanceSettings", financeSettingsSchema);