import React, { useEffect, useState } from 'react';
import HRSidebar from '../components/hrofficedashboared/hrsidbar';
import HRNavbar from '../components/hrofficedashboared/hrnavbar';
import HrSummary from '../components/hrofficedashboared/hrsummary';
import ClearanceOverview from '../components/hrofficedashboared/clearanceoverview';
import RecentClearanceRequests from '../components/hrofficedashboared/Recent Clearance Requests';
import EmployeesByCampus from '../components/hrofficedashboared/Employees by Campus';
import Notifications from '../components/hrofficedashboared/Notifications';
import RecentActivity from '../components/hrofficedashboared/Recent Activity';
import { fetchEmployees } from '../until/EmployeeHelper';
import { fetchClearances } from '../until/clearanceHelper';
import { fetchAuditLogs } from '../until/auditLogHelper';

const PendingActions = ({ pending = 0 }) => {
  const actions = [
    ['Clearance requests need HR review', pending, 'text-orange-500'],
    ['Pending employees need completion', 0, 'text-blue-500'],
    ['Returned clearance requests', 0, 'text-amber-500'],
    ['HR clearance approvals', 0, 'text-emerald-500'],
  ];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#10254b]">Pending Actions</h2>
        <button type="button" className="text-[10px] font-semibold text-blue-600">View All</button>
      </div>
      <div className="space-y-3">
        {actions.map(([label, count, color]) => (
          <div key={label} className="flex items-center gap-2 text-[10px] text-slate-600">
            <span className={`h-2 w-2 rounded-sm bg-current ${color}`} />
            <span className="flex-1">{label}</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">{count}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

const HrDashboard = ({ children }) => {
  const [dashboardData, setDashboardData] = useState({ employees: [], clearances: [], activities: [] });

  useEffect(() => {
    let active = true;
    Promise.allSettled([fetchEmployees(), fetchClearances(), fetchAuditLogs({ limit: 5 })]).then(([employees, clearances, audits]) => {
      if (!active) return;
      const employeeRows = employees.status === 'fulfilled' && Array.isArray(employees.value) ? employees.value : [];
      const clearanceRows = clearances.status === 'fulfilled' && Array.isArray(clearances.value) ? clearances.value : [];
      const auditRows = audits.status === 'fulfilled' && Array.isArray(audits.value?.data) ? audits.value.data : [];
      setDashboardData({ employees: employeeRows, clearances: clearanceRows, activities: auditRows });
    });
    return () => { active = false; };
  }, []);

  const { employees, clearances, activities } = dashboardData;
  const statusCount = (status) => clearances.filter((item) => item.status?.toLowerCase() === status.toLowerCase()).length;
  const metrics = { totalEmployees: employees.length, activeEmployees: employees.filter((item) => item.status?.toLowerCase() === 'active').length, pending: statusCount('pending'), inProgress: statusCount('in progress'), completed: statusCount('completed'), rejected: statusCount('rejected') };
  const requests = clearances.slice(0, 5).map((item) => [item.employee?.fullName || item.employeeName || item.employee || 'Unknown employee', item.department?.name || item.department || '-', item.requestDate || item.date || '-', item.status || 'Pending']);
  const campusTotals = employees.reduce((totals, employee) => { const campus = employee.campus || 'Unknown campus'; totals[campus] = (totals[campus] || 0) + 1; return totals; }, {});
  const campuses = Object.entries(campusTotals).sort(([, a], [, b]) => b - a);
  const activityRows = activities.map((item) => [item.description || `${item.action || 'Activity'} in ${item.module || 'system'}`, item.date ? new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-']);
  return (
    <div className='min-h-screen bg-gray-100'>
      <HRSidebar />
      <div className='ml-72 min-h-screen'>
        <HRNavbar />
        <main className='p-4 sm:p-5 lg:p-6'>
          {children || <><HrSummary metrics={metrics} /><div className="mt-4 grid gap-4 xl:grid-cols-[minmax(250px,0.8fr)_minmax(0,2fr)]"><ClearanceOverview values={metrics} /><RecentClearanceRequests requests={requests} /></div><div className="mt-4 grid gap-4 lg:grid-cols-3"><PendingActions pending={metrics.pending} /><EmployeesByCampus campuses={campuses} /><Notifications /></div><div className="mt-4"><RecentActivity activities={activityRows} /></div></>}
        </main>
      </div>
    </div>
  );
};

export default HrDashboard;