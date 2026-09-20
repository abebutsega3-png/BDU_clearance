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
        "Other"
      ],
      required: true
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
        "Paid",
        "Cleared"
      ],
      default: "Outstanding"
    },

    description: {
      type: String,
      default: ""
    },

    paymentDate: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model(
  "FinancialRecord",
  financialDashboardSchema
);