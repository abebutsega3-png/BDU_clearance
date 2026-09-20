import mongoose from "mongoose";

const clearanceChecklistSchema = new mongoose.Schema(
  {
    checklistName: {
      type: String,
      required: true,
      trim: true,
    },

    clearanceStep: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClearanceStep",
      required: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    order: {
      type: Number,
      required: true,
      min: 1,
    },

    required: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "ClearanceChecklist",
  clearanceChecklistSchema
);