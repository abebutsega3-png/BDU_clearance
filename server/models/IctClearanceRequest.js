import mongoose from "mongoose";

const assetCheckSchema = new mongoose.Schema({
  assetName: { type: String, default: "" },
  assetId: { type: String, default: "" },
  assetType: { type: String, default: "" },
  serialNumber: { type: String, default: "" },
  assetTag: { type: String, default: "" },
  status: { type: String, default: "Assigned" },
  returnDate: { type: Date, default: null },
  isReturned: { type: Boolean, default: false },
}, { _id: false });

const accountDeactivationSchema = new mongoose.Schema({
  bduEmailDeactivated: { type: Boolean, default: false },
  portalAccessRevoked: { type: Boolean, default: false },
  wifiDomainAccessRevoked: { type: Boolean, default: false },
}, { _id: false });

const ictChecklistSchema = new mongoose.Schema({
  laptopReturned: { type: Boolean, default: false },
  desktopReturned: { type: Boolean, default: false },
  monitorReturned: { type: Boolean, default: false },
  otherEquipmentReturned: { type: Boolean, default: false },
  accountAccessChecked: { type: Boolean, default: false },
  noOutstandingObligation: { type: Boolean, default: false },
}, { _id: false });

const ictClearanceRequestSchema = new mongoose.Schema(
  {
    clearanceId: { type: String, required: true, unique: true },
    requestId: { type: String, default: "" },
    employee: {
      employeeId: { type: String, default: "" },
      fullName: { type: String, default: "" },
      department: { type: String, default: "" },
      campus: { type: String, default: "Main Campus" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      position: { type: String, default: "" },
      employmentType: { type: String, default: "" },
    },
    clearanceReason: { type: String, default: "" },
    clearanceType: { type: String, default: "" },
    requestDate: { type: Date, default: null },
    lastWorkingDate: { type: String, default: "" },
    overallStatus: { type: String, default: "In Progress" },
    employeeRequestDetails: {
      comment: { type: String, default: "" },
      expectedClearanceDate: { type: String, default: "" },
    },
    clearanceProgress: { type: [mongoose.Schema.Types.Mixed], default: [] },
    status: {
      type: String,
      enum: ["Pending", "Under Review", "Approved", "Returned", "Completed", "Cancelled"],
      default: "Pending",
    },
    assetsIssued: [assetCheckSchema],
    accountDeactivation: accountDeactivationSchema,
    ictChecklist: ictChecklistSchema,
    remarks: { type: String, default: "" },
    returnReason: { type: String, default: "" },
    referenceNo: { type: String, default: "" },
    processedBy: {
      officerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      officerName: { type: String, default: "" },
      processedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

export default mongoose.model("IctClearanceRequest", ictClearanceRequestSchema);