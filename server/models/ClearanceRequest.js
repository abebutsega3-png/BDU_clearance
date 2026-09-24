import mongoose from 'mongoose';

const assetItemSchema = new mongoose.Schema(
  {
    assetId: { type: String, default: '' },
    assetType: { type: String, default: '' },
    serialNumber: { type: String, default: '' },
    condition: { type: String, default: 'Good' },
    status: {
      type: String,
      enum: ['Assigned', 'Returned', 'Outstanding', 'Lost', 'Damaged'],
      default: 'Assigned'
    },
    assignedDate: { type: Date, default: null },
    returnDate: { type: Date, default: null },
    clearanceRequestId: { type: String, default: '' }
  },
  { _id: false }
);

const ClearanceRequestSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    requestId: { type: String, required: true, unique: true },
    clearanceReason: { type: String, required: true },
    requestDate: { type: Date },
    expectedLastWorkingDate: { type: Date, required: true },
    submittedDate: { type: Date, default: Date.now },
    department: { type: String, default: '' },
    position: { type: String, default: '' },
    campus: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Pending', 'Under Review', 'Approved', 'Returned', 'In Progress', 'Completed', 'Rejected'],
      default: 'Pending'
    },
    overallStatus: {
      type: String,
      enum: ['Pending', 'Under Review', 'Approved', 'Returned', 'In Progress', 'Completed', 'Rejected'],
      default: 'In Progress'
    },
    officerComment: { type: String, default: '' },
    returnReason: { type: String, default: '' },
    returnedBy: { type: String, default: '' },
    returnedOffice: { type: String, default: '' },
    returnedAt: { type: Date },
    returnedReason: { type: String, default: '' },
    returnedRemark: { type: String, default: '' },
    affectedField: { type: String, default: '' },
    reviewedAt: { type: Date },
    ictClearance: {
      status: {
        type: String,
        enum: ['Pending', 'Under Review', 'Approved', 'Returned', 'In Progress', 'Completed', 'Rejected'],
        default: 'Pending'
      },
      reviewedBy: { type: String, default: '' },
      reviewedAt: { type: Date, default: null },
      comment: { type: String, default: '' },
      returnReason: { type: String, default: '' },
      assets: [assetItemSchema]
    },
    workflow: [
      {
        office: { type: String, required: true },
        status: {
          type: String,
          enum: ['Pending', 'In Progress', 'Completed', 'Rejected'],
          default: 'Pending'
        },
        updatedAt: { type: Date }
      }
    ]
  },
  { timestamps: true }
);

const ClearanceRequestModel = mongoose.models.ClearanceRequest || mongoose.model('ClearanceRequest', ClearanceRequestSchema);

export default ClearanceRequestModel;