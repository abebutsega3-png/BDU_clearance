import mongoose from 'mongoose';

const materialRecordSchema = new mongoose.Schema({
  materialId: { type: String, trim: true },
  title: { type: String, trim: true },
  borrowDate: { type: Date },
  dueDate: { type: Date },
  status: { type: String, enum: ['Borrowed', 'Outstanding', 'Overdue', 'Returned'], default: 'Borrowed' },
}, { _id: true });

const libraryClearanceSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, unique: true }, // e.g., CLR-2026-00125
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    department: { type: String, required: true },
    position: { type: String, required: true },
    employmentType: { type: String, default: 'Permanent' },
    submittedDate: { type: Date, default: Date.now },
    
    // Library Verification Checks
    borrowedItemsStatus: { type: String, enum: ['Clear', 'Not Clear'], default: 'Clear' },
    outstandingFineAmount: { type: Number, default: 0 },
    outstandingFineStatus: { type: String, enum: ['Clear', 'Not Clear'], default: 'Clear' },
    otherObligationsStatus: { type: String, enum: ['None', 'Pending'], default: 'None' },
    materials: { type: [materialRecordSchema], default: [] },

    // Status Workflow
    status: {
      type: String,
      enum: ['Pending', 'Under Review', 'Approved', 'Returned', 'Completed'],
      default: 'Pending'
    },
    verificationResult: { type: String, enum: ['Clear', 'Not Clear', ''], default: '' },
    comment: { type: String, default: '' },
    returnReason: { type: String, default: '' },
    returnedBy: { type: String, default: '' },
    returnedOffice: { type: String, default: '' },
    returnedAt: { type: Date },
    returnedReason: { type: String, default: '' },
    returnedRemark: { type: String, default: '' },
    affectedField: { type: String, default: '' }
  },
  { timestamps: true }
);

export default mongoose.model('LibraryClearance', libraryClearanceSchema);