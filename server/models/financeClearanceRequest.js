import mongoose from "mongoose";

const clearanceRequestSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, unique: true, trim: true },
    employeeId: { type: String, required: true, index: true },
    reason: { type: String, required: true },
    financeStatus: {
      type: String,
      enum: ["Pending", "In Progress", "Approved", "Returned"],
      default: "Pending",
      index: true,
    },
    remarks: { type: String, default: "" },
    reviewedBy: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("financeClearanceRequest", financeclearanceRequestSchema);