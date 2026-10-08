import mongoose from 'mongoose';

const materialRecordSchema = new mongoose.Schema({
  materialId: { type: String, trim: true },
  title: { type: String, trim: true },
  materialType: { type: String, trim: true, default: '' },
  isbn: { type: String, trim: true, default: '' },
  publicationYear: { type: Number, min: 0, default: null },
  condition: { type: String, trim: true, default: '' },
  borrowDate: { type: Date },
  dueDate: { type: Date },
  returnDate: { type: Date, default: null },
  remark: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['Borrowed', 'Outstanding', 'Overdue', 'Returned', 'Lost'], default: 'Borrowed' },
  fineAmount: { type: Number, min: 0, default: 0 },
  finePaidAmount: { type: Number, min: 0, default: 0 },
  fineEvents: {
    type: [{
      type: { type: String, enum: ['Damaged', 'Lost', 'Payment', 'Return', 'Renewal', 'Adjustment'], required: true },
      amount: { type: Number, min: 0, required: true },
      note: { type: String, trim: true, default: '' },
      recordedBy: { type: String, default: '' },
      recordedAt: { type: Date, default: Date.now },
    }],
    default: [],
  },
}, { _id: true });

const libraryClearanceSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, unique: true }, // e.g., CLR-2026-00125
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    department: { type: String, required: true },
    position: { type: String, required: true },
    campus: { type: String, default: '' },
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