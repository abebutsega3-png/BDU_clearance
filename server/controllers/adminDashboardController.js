import User from '../models/User.js';
import Employee from '../models/employee.js';
import Clearance from '../models/clearance.js';
import Department from '../models/department.js';
import AuditLog from '../models/AuditLog.js';

// 1. የዳሽቦርድ ሜትሪክስ እና ስታቲስቲክስ ማምጫ
export const getDashboardData = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalEmployees,
      totalClearanceRequests,
      clearanceByStatus,
      userRoles,
      campuses,
      departments,
      recentAuditLogs,
      recentUsers,
      recentEmployees
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'Active' }),
      Employee.countDocuments(),
      Clearance.countDocuments(),
      Clearance.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      User.aggregate([{ $group: { _id: { $toLower: { $ifNull: ['$role', ''] } }, count: { $sum: 1 } } }]),
      Employee.distinct('campus'),
      Department.countDocuments(),
      AuditLog.find().sort({ createdAt: -1 }).limit(5).lean(),
      User.find().select('name username role createdAt').sort({ createdAt: -1 }).lean(),
      Employee.find().select('fullName employeeId createdAt').sort({ createdAt: -1 }).lean()
    ]);

    const statusCounts = Object.fromEntries(clearanceByStatus.map(({ _id, count }) => [_id, count]));
    const roleCounts = Object.fromEntries(userRoles.map(({ _id, count }) => [_id, count]));
    const recentActivities = [
      ...recentAuditLogs.map((log) => ({
        text: log.description || `${log.action} in ${log.module}`,
        time: log.createdAt,
        action: log.action,
        module: log.module
      })),
      ...recentUsers.map((user) => ({
        text: `User added: ${user.name || user.username || 'Unknown user'}`,
        time: user.createdAt,
        action: 'USER_CREATED',
        module: 'Users'
      })),
      ...recentEmployees.map((employee) => ({
        text: `Employee added: ${employee.fullName} (${employee.employeeId})`,
        time: employee.createdAt,
        action: 'EMPLOYEE_CREATED',
        module: 'Employees'
      }))
    ].sort((first, second) => new Date(second.time) - new Date(first.time)).slice(0, 5);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers: Math.max(totalUsers - activeUsers, 0),
        totalEmployees,
        totalClearanceRequests,
        pendingRequests: statusCounts.Pending || 0,
        completedClearances: statusCounts.Completed || 0,
        rejectedRequests: statusCounts.Rejected || 0,
        inProgressRequests: statusCounts['In Progress'] || 0,
        overdueRequests: 0
      },
      userManagement: {
        systemAdmins: roleCounts.admin || roleCounts.administrator || 0,
        hrOfficers: roleCounts['hr officer'] || 0,
        departmentOfficers: roleCounts['department officer'] || roleCounts['department approver'] || 0,
        employees: roleCounts.employee || 0,
        activeAccounts: activeUsers,
        inactiveAccounts: Math.max(totalUsers - activeUsers, 0)
      },
      organization: {
        campuses: campuses.length,
        collegesInstitutes: 0,
        departments,
        sectionsTeams: 0,
        positions: (await Employee.distinct('position')).length,
        jobGrades: 0
      },
      security: {
        lastLogin: recentAuditLogs[0]?.createdAt || null,
        failedLoginAttemptsToday: 0,
        passwordResetRequestsToday: 0,
        recentlyActivatedAccounts: 0,
        recentlyDeactivatedAccounts: 0
      },
      recentActivities,
      recentUsers,
      recentEmployees
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};