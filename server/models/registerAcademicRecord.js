import mongoose from 'mongoose';

const academicRecordSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  fullName: { type: String, required: true },
  department: { type: String, required: true },
  degreeLevel: { type: String, enum: ['BSc', 'MSc', 'PhD', 'Diploma'], required: true },
  gradYear: { type: Number, required: true },
  gradInstitution: { type: String, required: true },
  documentStatus: { 
    type: String, 
    enum: ['Verified', 'Pending', 'Returned', 'Missing Document'], 
    default: 'Pending' 
  },
  gradeSubmissionStatus: { 
    type: String, 
    enum: ['All Submitted', 'Missing Grades', 'Pending'], 
    default: 'All Submitted' 
  }
}, { timestamps: true });

const AcademicRecord = mongoose.models.registerAcademicRecord
  || mongoose.model('registerAcademicRecord', academicRecordSchema);

export default AcademicRecord;