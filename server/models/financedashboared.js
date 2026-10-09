import mongoose from "mongoose";

const financialDashboardSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true
    },

    type: {
      type: String,
      enum: [
        "Advance",
        "Loan",
        "Overpayment",
        "Other",
        "Salary Advance",
        "Other Financial Obligation",
        "Payment / Repayment",
        "Payment Reversal",
        "Adjustment"
      ],
      required: true
    },

    adjustmentDirection: {
      type: String,
      enum: ["Increase", "Reduce"]
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    status: {
      type: String,
      enum: [
        "Outstanding",
        "Partially Paid",
        "Paid",
        "Cleared"
      ],
      default: "Outstanding"
    },

    description: {
      type: String,
      default: ""
    },

    notes: {
      type: String,
      default: ""
    },

    issueDate: {
      type: Date
    },

    dueDate: {
      type: Date
    },

    paidAmount: {
      type: Number,
      min: 0,
      default: 0
    },

    paymentDate: {
      type: Date
    },

    paymentFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinancialRecord',
      default: null
    },

    paymentMethod: {
      type: String,
      enum: ["Cash", "Bank Transfer", "Other"],
      trim: true
    },

    paymentReference: {
      type: String,
      trim: true,
      default: ''
    },

    recordedBy: {
      type: String,
      trim: true,
      default: ''
    },

    reversalOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinancialRecord',
      default: null
    }
  },
  {
    timestamps: true
  }
);

financialDashboardSchema.index(
  { reversalOf: 1 },
  {
    unique: true,
    partialFilterExpression: { reversalOf: { $type: 'objectId' } },
  }
);

export default mongoose.model(
  "FinancialRecord",
  financialDashboardSchema
);