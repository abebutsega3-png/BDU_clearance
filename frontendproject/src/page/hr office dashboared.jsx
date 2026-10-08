import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import HRSidebar from '../components/hrofficedashboared/hrsidbar';
import HRNavbar from '../components/hrofficedashboared/hrnavbar';
import HrSummary from '../components/hrofficedashboared/hrsummary';
import ClearanceOverview from '../components/hrofficedashboared/clearanceoverview';
import RecentClearanceRequests from '../components/hrofficedashboared/Recent Clearance Requests';
import EmployeesByCampus from '../components/hrofficedashboared/Employees by Campus';
import Notifications from '../components/hrofficedashboared/Notifications';
import RecentActivity from '../components/hrofficedashboared/Recent Activity';
import { fetchEmployeeSummary } from '../until/EmployeeHelper';
import { fetchClearances } from '../until/clearanceHelper';
import { fetchAuditLogs } from '../until/auditLogHelper';
import { fetchNotifications } from '../until/NotificationHelper';
import { useAuth } from '../context/authContext';
import { HRLanguageProvider, HRTranslatedView } from '../components/hrofficedashboared/HRLanguage';

const getCount = (clearances, predicate) => clearances.filter(predicate).length;

const isStatus = (value, expected) => String(value || '').toLowerCase() === expected.toLowerCase();

const hasFinalHRApproval = (clearance) => clearance.finalHRApproval === true
  || isStatus(clearance.finalHRStatus, 'Approved')
  || (isStatus(clearance.status, 'Completed') && clearance.finalHRApproval !== false);

const PendingActions = ({ pending = 0, returned = 0, finalReview = 0 }) => {
  const actions = [
    ['Clearance requests need HR review', pending, 'text-orange-500'],
    ['Returned requests need follow-up', returned, 'text-amber-500'],
    ['Ready for final HR review', finalReview, 'text-blue-500'],
  ];

  return (
    <HRTranslatedView>
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#10254b]">Pending Actions</h2>
        <Link to="/hr-office/clearance-requests" className="text-[10px] font-semibold text-blue-600">View All</Link>
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
    </HRTranslatedView>
  );
};

const HrDashboard = ({ children }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    employeeSummary: { totalEmployees: 0, activeEmployees: 0, campuses: [] },
    clearances: [],
    activities: [],
    notifications: [],
  });
  const [loadErrors, setLoadErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    if (children) return undefined;

    let active = true;
    setLoading(true);
    setLoadErrors([]);

    const loadSection = (label, request, applyResult) => request
      .then((result) => {
        if (active) applyResult(result);
      })
      .catch((error) => {
        if (!active) return;
        const message = error.response?.data?.message || error.message || 'Unable to load data.';
        setLoadErrors((errors) => [...errors, `${label}: ${message}`]);
      });

    Promise.all([
      loadSection('employee summary', fetchEmployeeSummary(), (summary) => {
        setDashboardData((current) => ({ ...current, employeeSummary: summary }));
      }),
      loadSection('clearance requests', fetchClearances(), (rows) => {
        setDashboardData((current) => ({
          ...current,
          clearances: Array.isArray(rows) ? rows : [],
        }));
      }),
      loadSection('recent activity', fetchAuditLogs({ limit: 5 }), (result) => {
        setDashboardData((current) => ({
          ...current,
          activities: Array.isArray(result?.data) ? result.data : [],
        }));
      }),
      loadSection('notifications', fetchNotifications(), (rows) => {
        setDashboardData((current) => ({
          ...current,
          notifications: Array.isArray(rows) ? rows : [],
        }));
      }),
    ]).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [children, location.pathname, refreshCount]);

  const { employeeSummary, clearances, activities, notifications } = dashboardData;
  const initialPending = getCount(clearances, (item) => isStatus(item.initialHRStatus, 'Pending'));
  const underReview = getCount(clearances, (item) => isStatus(item.initialHRStatus, 'Under Review'));
  const returned = getCount(clearances, (item) => isStatus(item.initialHRStatus, 'Returned')
    || isStatus(item.finalHRStatus, 'Returned')
    || (isStatus(item.status, 'Returned') && !isStatus(item.initialHRStatus, 'Approved')));
  const completed = getCount(clearances, hasFinalHRApproval);
  const rejected = getCount(clearances, (item) => isStatus(item.status, 'Rejected')
    || isStatus(item.finalHRStatus, 'Rejected'));
  const finalReview = getCount(clearances, (item) => (
    isStatus(item.initialHRStatus, 'Approved')
    && isStatus(item.departmentStatus, 'Approved')
    && /final hr/i.test(String(item.currentStep || ''))
    && !hasFinalHRApproval(item)
  ));
  const metrics = {
    totalEmployees: employeeSummary.totalEmployees,
    activeEmployees: employeeSummary.activeEmployees,
    pending: initialPending,
    inProgress: underReview,
    returned,
    readyForFinalHR: finalReview,
    completed,
    rejected,
  };
  const requests = [...clearances]
    .sort((first, second) => new Date(second.createdAt || second.requestDate || 0) - new Date(first.createdAt || first.requestDate || 0))
    .slice(0, 5);
  const campuses = employeeSummary.campuses;
  const activityRows = activities.map((item) => ({
    description: item.description || `${item.action || 'Activity'} in ${item.module || 'system'}`,
    time: item.date ? new Date(item.date).toLocaleString() : '-',
  }));
  const notificationRows = notifications.slice(0, 4).map((item) => ({
    id: item._id || item.id,
    message: item.message || item.text || 'HR notification',
    time: item.createdAt ? new Date(item.createdAt).toLocaleString() : '-',
  }));

  return (
    <HRLanguageProvider>
    <div className='min-h-screen bg-gray-100'>
      <HRSidebar />
      <div className='ml-72 min-h-screen'>
        <HRNavbar />
        <main className='p-4 sm:p-5 lg:p-6'>
          <HRTranslatedView>
          {children || <>
            {loadErrors.length > 0 && (
              <div role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <ul className="list-inside list-disc">{loadErrors.map((error) => <li key={error}>{error}</li>)}</ul>
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    setRefreshCount((count) => count + 1);
                  }}
                  className="shrink-0 font-semibold underline"
                >
                  Retry
                </button>
              </div>
            )}
            {loading && <p role="status" className="mb-3 text-xs text-slate-500">Loading HR dashboard data...</p>}
            <HrSummary metrics={metrics} name={user?.fullName || user?.name} />
            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(250px,0.8fr)_minmax(0,2fr)]"><ClearanceOverview values={metrics} /><RecentClearanceRequests requests={requests} /></div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3"><PendingActions pending={metrics.pending} returned={metrics.returned} finalReview={metrics.readyForFinalHR} /><EmployeesByCampus campuses={campuses} /><Notifications notifications={notificationRows} /></div>
            <div className="mt-4"><RecentActivity activities={activityRows} /></div>
          </>}
          </HRTranslatedView>
        </main>
      </div>
    </div>
    </HRLanguageProvider>
  );
};

export default HrDashboard;