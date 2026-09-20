import mongoose from 'mongoose';

const ClearanceReportSchema = new mongoose.Schema({
  employeeName: { type: String, required: true },
  employeeId: { type: String, required: true },
  campus: { type: String, required: true },
  department: { type: String, required: true },
  reason: { type: String, required: true }, // Resignation, Retirement, etc.
  status: { 
    type: String, 
    enum: ['Completed', 'Pending', 'In Progress', 'Rejected', 'Returned'],
    default: 'Pending'
  },
  requestedDate: { type: Date, default: Date.now }
}, { timestamps: true });

const ClearanceReport = mongoose.model('ClearanceReport', ClearanceReportSchema);
export default ClearanceReport;