import mongoose from "mongoose";

const financialObligationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "Employee Advance",
        "Staff Loan",
        "Outstanding Payment",
        "Other Financial Liability",
      ],
      required: true,
    },
    amountDue: { type: Number, required: true, default: 0 },
    amountPaid: { type: Number, required: true, default: 0 },
    balance: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const financeReportSchema = new mongoose.Schema(
  {
    requestNumber: { type: String, required: true, unique: true },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    employeeName: { type: String, required: true },
    employeeId: { type: String, required: true },
    department: { type: String, required: true },
    campus: { type: String, required: true },
    position: { type: String, default: "" },
    clearanceReason: {
      type: String,
      required: true,
      enum: ["Resignation", "Retirement", "Contract End", "Termination", "Transfer", "Other"],
    },
    financeStatus: {
      type: String,
      enum: [
        "Pending",
        "Under Review",
        "Approved",
        "Returned",
        "Rejected",
        "Completed",
      ],
      default: "Pending",
    },
    financialObligation: { type: financialObligationSchema, default: null },
    financeRemarks: { type: String, default: "" },
    financeReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    financeReviewedByName: { type: String, default: "" },
    financeReviewedAt: { type: Date, default: null },
    financeReferenceNumber: { type: String, default: "" },
  },
  { timestamps: true }
);

const FinanceReport = mongoose.models.FinanceReport || mongoose.model("FinanceReport", financeReportSchema);

export default FinanceReport;