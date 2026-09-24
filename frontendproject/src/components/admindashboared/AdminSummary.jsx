import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AdminNotificationBell from './AdminNotificationBell';
import {
  Users, UserCheck, UserX, FileText, Clock, CheckCircle2,
  XCircle, Shield, Building2, GraduationCap, GitFork, Briefcase,
  Award, PlusCircle, Settings, Bell, ChevronDown, Lock, AlertTriangle,
  FileBarChart, History
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [dashboardError, setDashboardError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/admin/dashboard-data');
        setDashboard(response.data);
        setDashboardError('');
      } catch (error) {
        setDashboardError('Dashboard data could not be loaded from the database.');
      }
    };

    loadDashboard();
    const refreshTimer = setInterval(loadDashboard, 30000);
    window.addEventListener('focus', loadDashboard);
    return () => {
      clearInterval(refreshTimer);
      window.removeEventListener('focus', loadDashboard);
    };
  }, []);

  const stats = dashboard?.stats || {};
  const userManagement = dashboard?.userManagement || {};
  const organization = dashboard?.organization || {};
  const security = dashboard?.security || {};
  const recentUsers = dashboard?.recentUsers || [];
  const recentEmployees = dashboard?.recentEmployees || [];
  const formatNumber = (value) => Number(value || 0).toLocaleString();
  const topCards = [
    { title: 'Total Users', val: stats.totalUsers, sub: 'All system users', icon: <Users className="text-blue-600" size={18} />, bg: 'bg-blue-50' },
    { title: 'Active Users', val: stats.activeUsers, sub: 'Active accounts', icon: <UserCheck className="text-emerald-600" size={18} />, bg: 'bg-emerald-50' },
    { title: 'Inactive Users', val: stats.inactiveUsers, sub: 'Inactive accounts', icon: <UserX className="text-amber-500" size={18} />, bg: 'bg-amber-50' },
    { title: 'Total Employees', val: stats.totalEmployees, sub: 'All employees', icon: <Users className="text-purple-600" size={18} />, bg: 'bg-purple-50' },
    { title: 'Total Clearance Requests', val: stats.totalClearanceRequests, sub: 'All requests', icon: <FileText className="text-blue-500" size={18} />, bg: 'bg-blue-50' },
    { title: 'Pending Requests', val: stats.pendingRequests, sub: 'Awaiting action', icon: <Clock className="text-amber-500" size={18} />, bg: 'bg-amber-50' },
    { title: 'Completed Clearances', val: stats.completedClearances, sub: 'Successfully completed', icon: <CheckCircle2 className="text-teal-600" size={18} />, bg: 'bg-teal-50' },
    { title: 'Rejected Requests', val: stats.rejectedRequests, sub: 'Rejected requests', icon: <XCircle className="text-red-500" size={18} />, bg: 'bg-red-50' },
  ];

  const recentActivities = dashboard?.recentActivities?.length
    ? dashboard.recentActivities.map((activity) => ({
        ...activity,
        time: activity.time ? new Date(activity.time).toLocaleString() : 'Recently',
        icon: <History size={14} className="text-blue-500" />
      }))
    : [];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 text-xs font-sans pb-10">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">System Admin Dashboard</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200 px-3 py-1 rounded text-slate-600">
            <span>{new Date().toLocaleDateString()}</span>
            <ChevronDown size={14} />
          </div>
          <AdminNotificationBell />
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-[10px]">SA</div>
            <div>
              <p className="font-semibold text-xs leading-none">System Admin</p>
              <p className="text-[10px] text-slate-400">Super Administrator</p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-6 space-y-6">
        {dashboardError && <p className="border border-amber-200 bg-amber-50 px-4 py-2 text-amber-700">{dashboardError}</p>}
        
        {/* TOP STATS CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8 gap-3">
          {topCards.map((card, idx) => (
            <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-500 font-medium">{card.title}</span>
                <div className={`p-1 rounded ${card.bg}`}>{card.icon}</div>
              </div>
              <h2 className="text-base font-bold text-slate-800">{formatNumber(card.val)}</h2>
              <p className="text-[9px] text-slate-400 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* MIDDLE SECTION: OVERVIEWS */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* User Management Overview */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800">User Management Overview</h3>
              <a href="#" className="text-blue-600 text-[10px] font-medium hover:underline">View All</a>
            </div>
            <div className="space-y-2.5 text-[11px]">
              <OverviewRow icon={<Shield size={14} className="text-purple-600" />} label="System Admins" val={userManagement.systemAdmins} />
              <OverviewRow icon={<Users size={14} className="text-blue-600" />} label="HR Officers" val={userManagement.hrOfficers} />
              <OverviewRow icon={<Briefcase size={14} className="text-amber-500" />} label="Department Officers" val={userManagement.departmentOfficers} />
              <OverviewRow icon={<Users size={14} className="text-emerald-500" />} label="Employees (Users)" val={userManagement.employees} />
              <OverviewRow icon={<CheckCircle2 size={14} className="text-emerald-600" />} label="Active Accounts" val={userManagement.activeAccounts} isGreen />
              <OverviewRow icon={<XCircle size={14} className="text-red-500" />} label="Inactive Accounts" val={userManagement.inactiveAccounts} isRed />
            </div>
          </div>

          {/* Clearance Requests Overview Chart */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800">Clearance Requests Overview</h3>
              <a href="#" className="text-blue-600 text-[10px] font-medium hover:underline">View All</a>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-28 h-28 rounded-full border-[14px] border-emerald-500 border-t-amber-400 border-r-blue-500 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-center">{formatNumber(stats.totalClearanceRequests)}<br/><span className="text-[8px] font-normal text-slate-400">Total</span></span>
              </div>
              <div className="space-y-1.5 text-[10px] flex-1">
                <StatusRow color="bg-amber-400" label="Pending" value={stats.pendingRequests} total={stats.totalClearanceRequests} />
                <StatusRow color="bg-blue-500" label="In Progress" value={stats.inProgressRequests} total={stats.totalClearanceRequests} />
                <StatusRow color="bg-emerald-500" label="Completed" value={stats.completedClearances} total={stats.totalClearanceRequests} />
                <StatusRow color="bg-red-500" label="Rejected" value={stats.rejectedRequests} total={stats.totalClearanceRequests} />
                <StatusRow color="bg-purple-500" label="Overdue" value={stats.overdueRequests} total={stats.totalClearanceRequests} />
              </div>
            </div>
          </div>

          {/* Organization Overview */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800">Organization Overview</h3>
              <a href="#" className="text-blue-600 text-[10px] font-medium hover:underline">View All</a>
            </div>
            <div className="space-y-2.5 text-[11px]">
              <OverviewRow icon={<Building2 size={14} className="text-blue-600" />} label="Campuses" val={organization.campuses} />
              <OverviewRow icon={<GraduationCap size={14} className="text-purple-600" />} label="Colleges / Institutes" val={organization.collegesInstitutes} />
              <OverviewRow icon={<GitFork size={14} className="text-indigo-600" />} label="Departments" val={organization.departments} />
              <OverviewRow icon={<Users size={14} className="text-teal-600" />} label="Sections / Teams" val={organization.sectionsTeams} />
              <OverviewRow icon={<Briefcase size={14} className="text-amber-600" />} label="Positions" val={organization.positions} />
              <OverviewRow icon={<Award size={14} className="text-rose-500" />} label="Job Grades" val={organization.jobGrades} />
            </div>
          </div>

        </div>

        {/* BOTTOM SECTION */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Recent System Activity */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800">Recent System Activity</h3>
              <a href="#" className="text-blue-600 text-[10px] font-medium hover:underline">View All</a>
            </div>
            <div className="space-y-3">
              {recentActivities.length === 0 && <p className="text-slate-400 py-3">No recent activity.</p>}
              {recentActivities.map((act, idx) => (
                <div key={idx} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center space-x-2">
                    <div className="p-1 rounded bg-slate-50">{act.icon}</div>
                    <span className="text-slate-700">{act.text}</span>
                  </div>
                  <span className="text-slate-400 shrink-0">{act.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recently added records */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800">Recently Added</h3>
              <button type="button" onClick={() => navigate('/admin/users')} className="text-blue-600 text-[10px] font-medium hover:underline">View Users</button>
            </div>
            <div className="space-y-2 text-[10px]">
              {recentUsers.length === 0 && <p className="text-slate-400 py-1">No users added yet.</p>}
              {recentUsers.map((user) => (
                <div key={user._id} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-none">
                  <div>
                    <p className="font-semibold text-slate-700">{user.name || user.username || 'Unnamed user'}</p>
                    <p className="text-slate-400">{user.role || 'No role'}</p>
                  </div>
                  <span className="text-slate-400">User</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 pt-2">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-slate-700">Employees</h4>
                <button type="button" onClick={() => navigate('/admin/employees')} className="text-blue-600 text-[10px] font-medium hover:underline">View Employees</button>
              </div>
              <div className="space-y-2 text-[10px]">
                {recentEmployees.length === 0 && <p className="text-slate-400 py-1">No employees added yet.</p>}
                {recentEmployees.map((employee) => (
                  <div key={employee._id} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-none">
                    <div>
                      <p className="font-semibold text-slate-700">{employee.fullName}</p>
                      <p className="text-slate-400">{employee.employeeId}</p>
                    </div>
                    <span className="text-slate-400">Employee</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* User Activity / Security */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800">User Activity / Security</h3>
              <a href="#" className="text-blue-600 text-[10px] font-medium hover:underline">View All</a>
            </div>
            <div className="space-y-2 text-[10px]">
              <SecurityRow icon={<Clock size={14} className="text-amber-500" />} label="Last Login (System Admin)" val={security.lastLogin} />
              <SecurityRow icon={<AlertTriangle size={14} className="text-red-500" />} label="Failed Login Attempts (Today)" val={security.failedLoginAttemptsToday} isBold />
              <SecurityRow icon={<Lock size={14} className="text-blue-500" />} label="Password Reset Requests (Today)" val={security.passwordResetRequestsToday} isBold />
              <SecurityRow icon={<UserCheck size={14} className="text-emerald-500" />} label="Recently Activated Accounts" val={security.recentlyActivatedAccounts} isBold />
              <SecurityRow icon={<UserX size={14} className="text-rose-500" />} label="Recently Deactivated Accounts" val={security.recentlyDeactivatedAccounts} isBold />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Quick Actions</h3>
            <div className="grid grid-cols-3 gap-2">
              <ActionButton icon={<PlusCircle size={16} className="text-blue-600" />} title="Create User" onClick={() => navigate('/admin/add-user')} />
              <ActionButton icon={<Users size={16} className="text-blue-600" />} title="Manage Users" onClick={() => navigate('/admin/users')} />
              <ActionButton icon={<UserCheck size={16} className="text-emerald-600" />} title="Manage Employees" onClick={() => navigate('/admin/employees')} />
              <ActionButton icon={<Shield size={16} className="text-purple-600" />} title="Manage Roles" onClick={() => navigate('/admin/roles-permissions')} />
              <ActionButton icon={<Building2 size={16} className="text-blue-600" />} title="Manage Departments" onClick={() => navigate('/admin/departments')} />
              <ActionButton icon={<GitFork size={16} className="text-amber-500" />} title="Clearance Steps" onClick={() => navigate('/admin/clearance-steps')} />
              <ActionButton icon={<FileBarChart size={16} className="text-slate-700" />} title="View Reports" onClick={() => navigate('/admin/reports')} />
              <ActionButton icon={<History size={16} className="text-slate-700" />} title="Audit Logs" onClick={() => navigate('/admin/audit-logs')} />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

function OverviewRow({ icon, label, val, isGreen, isRed }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-50 last:border-none">
      <div className="flex items-center space-x-2">
        {icon}
        <span className="text-slate-600">{label}</span>
      </div>
      <span className={`font-bold ${isGreen ? 'text-emerald-600' : isRed ? 'text-red-500' : 'text-slate-800'}`}>{val}</span>
    </div>
  );
}

function SecurityRow({ icon, label, val, isBold }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-50 last:border-none">
      <div className="flex items-center space-x-2">
        {icon}
        <span className="text-slate-600">{label}</span>
      </div>
      <span className={`text-slate-800 ${isBold ? 'font-bold' : ''}`}>{val}</span>
    </div>
  );
}

function StatusRow({ color, label, value, total }) {
  const percentage = total ? ((value / total) * 100).toFixed(1) : '0.0';

  return (
    <p className="flex justify-between items-center">
      <span className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${color}`}></span>{label}</span>
      <b>{formatValue(value)} ({percentage}%)</b>
    </p>
  );
}

function formatValue(value) {
  return Number(value || 0).toLocaleString();
}

function ActionButton({ icon, title, onClick }) {
  return (
    <button type="button" onClick={onClick} className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2 rounded flex flex-col items-center justify-center text-center space-y-1 cursor-pointer transition-colors">
      {icon}
      <span className="font-semibold text-slate-700 text-[10px] leading-tight">{title}</span>
    </button>
  );
}