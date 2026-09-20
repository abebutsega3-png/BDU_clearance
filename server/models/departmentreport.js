import mongoose from 'mongoose';

const departmentReportSchema = new mongoose.Schema({
	department: { type: String, required: true, trim: true },
	period: { type: String, required: true, trim: true },
	submittedBy: { type: String, required: true, trim: true },
	submittedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
	summary: { type: mongoose.Schema.Types.Mixed, default: {} },
	rows: { type: [mongoose.Schema.Types.Mixed], default: [] },
	status: { type: String, enum: ['Submitted', 'Reviewed'], default: 'Submitted' },
}, { timestamps: true });

export default mongoose.model('DepartmentReport', departmentReportSchema);
