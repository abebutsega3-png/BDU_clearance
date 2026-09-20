import mongoose from 'mongoose';

const AdminDashboardStatsSchema = new mongoose.Schema({
  totalUsers: { type: Number, default: 156 },
  activeUsers: { type: Number, default: 142 },
  inactiveUsers: { type: Number, default: 14 },
  totalEmployees: { type: Number, default: 2458 },
  totalClearanceRequests: { type: Number, default: 892 },
  pendingRequests: { type: Number, default: 135 },
  completedClearances: { type: Number, default: 684 },
  rejectedRequests: { type: Number, default: 73 },
  overdueRequests: { type: Number, default: 22 }
}, { timestamps: true });

export default mongoose.model('AdminDashboardStats', AdminDashboardStatsSchema);