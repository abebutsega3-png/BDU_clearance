import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, Bell, CheckCircle2, ClipboardCheck, Clock3, Eye, FileCheck2, LoaderCircle, RotateCcw, Search, WalletCards } from 'lucide-react';

const defaultReviews = [
  { name: 'No pending requests', status: 'Pending' },
];

const defaultNotes = [
  'No recent notifications.',
];

const toneClasses = {
  blue: 'bg-blue-50 text-blue-700',
  amber: 'bg-amber-50 text-amber-700',
  green: 'bg-emerald-50 text-emerald-700',
  rose: 'bg-rose-50 text-rose-700',
};

export const SummaryCard = ({ title, value, description, icon: Icon, tone = 'blue' }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
    <div className="mb-4 flex items-center justify-between">
      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${toneClasses[tone] || toneClasses.blue}`}>
        {title}
      </span>
      {Icon && (
        <span className="rounded-xl bg-slate-100 p-2 text-slate-600">
          <Icon size={16} />
        </span>
      )}
    </div>
    <p className="text-3xl font-bold tracking-tight text-slate-900">{value}</p>
    {description && <p className="mt-2 text-[11px] text-slate-500">{description}</p>}
  </div>
);

export const PendingClearances = ({ requests = defaultReviews, onViewAll }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Pending Financial Clearance</h2>
        <p className="text-xs text-slate-500">Requests requiring your review</p>
      </div>
      <button type="button" onClick={onViewAll} className="text-xs font-semibold text-blue-600 hover:text-blue-700">View All</button>
    </div>

    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-xs">
        <thead className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-400"><tr><th className="py-2 pr-3 font-semibold">Employee</th><th className="px-3 py-2 font-semibold">ID</th><th className="px-3 py-2 font-semibold">Reason</th><th className="px-3 py-2 font-semibold">Date</th><th className="py-2 pl-3 text-right font-semibold">Action</th></tr></thead>
        <tbody>
          {requests.length === 0 ? <tr><td colSpan="5" className="py-8 text-center text-sm text-slate-500">No pending financial clearance requests.</td></tr> : requests.map((request, index) => (
            <tr key={`${request.id || request.name}-${index}`} className="border-b border-slate-100 last:border-0"><td className="py-3 pr-3 font-semibold text-slate-800">{request.name}</td><td className="px-3 py-3 text-slate-600">{request.employeeId}</td><td className="px-3 py-3 text-slate-600">{request.reason}</td><td className="whitespace-nowrap px-3 py-3 text-slate-600">{request.date}</td><td className="py-3 pl-3 text-right"><button type="button" onClick={() => onViewAll?.(request.id)} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 font-semibold text-white transition hover:bg-blue-700"><Eye size={13} /> View</button></td></tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const FinancialOverview = ({ summary = { approved: 0, pending: 0, inProgress: 0, returned: 0 } }) => {
  const items = [
    { name: 'Approved', value: summary.approved || 0, color: 'bg-emerald-500' },
    { name: 'Pending', value: summary.pending || 0, color: 'bg-amber-500' },
    { name: 'In Progress', value: summary.inProgress || 0, color: 'bg-blue-500' },
    { name: 'Returned', value: summary.returned || 0, color: 'bg-rose-500' },
  ];

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Financial Clearance Status</h2>
      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div key={item.name}>
            <div className="mb-1.5 flex items-center justify-between text-xs text-slate-600">
              <span>{item.name}</span>
              <span className="font-semibold text-slate-800">{item.value}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className={`${item.color} h-full rounded-full`} style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const RecentNotifications = ({ notifications = defaultNotes, onViewAll }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900">Notifications</h2><button type="button" onClick={onViewAll} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"><Bell size={15} /> View All</button></div>
    <ul className="mt-4 space-y-3 text-sm text-slate-600">
      {notifications.length === 0 ? (
        <li className="text-slate-500">No notes available.</li>
      ) : (
        notifications.map((note, index) => (
          <li key={index} className="flex gap-2">
            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span>{typeof note === 'string' ? note : note.message || note.title || 'Finance update'}</span>
          </li>
        ))
      )}
    </ul>
  </div>
);

const SummaryCardDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    summary: { pending: 0, inProgress: 0, approved: 0, returned: 0, outstandingAmount: 0, totalRequests: 0 },
    pendingRequests: [],
    outstandingObligations: [],
    notifications: [],
    activities: [],
  });

  useEffect(() => {
    const fetchFinanceDashboard = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:3000/api/finance/dashboard', { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
        const data = response.data || {};
        setDashboardData({
          summary: data.summary || { pending: 0, inProgress: 0, approved: 0, returned: 0, outstandingAmount: 0, totalRequests: 0 },
          pendingRequests: data.pendingRequests || [],
          outstandingObligations: data.outstandingObligations || [],
          notifications: data.notifications || [],
          activities: data.activities || [],
        });
      } catch (error) {
        console.error('Error fetching finance dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFinanceDashboard();
  }, []);

  const summary = dashboardData.summary || { pending: 0, inProgress: 0, approved: 0, returned: 0, outstandingAmount: 0, totalRequests: 0 };
  const cardsData = [
    { title: 'Total Requests', value: summary.totalRequests || 0, description: 'All finance requests', icon: ClipboardCheck, tone: 'blue' },
    { title: 'Pending', value: summary.pending || 0, description: 'Awaiting review', icon: LoaderCircle, tone: 'amber' },
    { title: 'Under Review', value: summary.inProgress || 0, description: 'Currently being reviewed', icon: Clock3, tone: 'blue' },
    { title: 'Financially Cleared', value: summary.approved || 0, description: 'Finance clearance approved', icon: CheckCircle2, tone: 'green' },
    { title: 'Returned', value: summary.returned || 0, description: 'Needs employee action', icon: RotateCcw, tone: 'rose' },
  ];

  const recentRequests = (dashboardData.pendingRequests || [])
    .filter((request) => !request.status || String(request.status).toLowerCase() === 'pending')
    .slice(0, 5)
    .map((request) => ({
    id: request._id || request.requestId,
    name: request.employeeName || request.name || 'Unknown Employee',
    employeeId: request.employeeId || 'N/A',
    reason: request.reason || request.clearanceReason || request.clearanceType || 'Clearance request',
    date: request.date ? new Date(request.date).toLocaleDateString('en-GB') : 'N/A',
    }));

  const notifications = (dashboardData.notifications || []).slice(0, 3).map((item) => ({
    message: item.message || item.title || 'Finance update',
  }));

  const activities = (dashboardData.activities || []).slice(0, 3).map((item) => ({
    message: item.description || item.action || item.message || 'Financial clearance updated',
    approved: /approv|clear/i.test(item.description || item.action || item.message || ''),
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Finance Officer Dashboard</h1>
            <p className="text-sm text-slate-500">Monitor and complete employee financial clearances</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
            <Bell size={14} className="text-slate-500" />
            {loading ? 'Loading live data' : 'Active Summary'}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cardsData.map((card, index) => (
          <SummaryCard key={`${card.title}-${index}`} {...card} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <PendingClearances requests={recentRequests} onViewAll={(requestId) => window.location.assign(requestId ? `/finance-office/requests?requestId=${encodeURIComponent(requestId)}` : '/finance-office/requests')} />
        <FinancialOverview summary={{ approved: summary.approved || 0, pending: summary.pending || 0, inProgress: summary.inProgress || 0, returned: summary.returned || 0 }} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-900">Recent Activity</h2><p className="text-xs text-slate-500">Latest finance clearance actions</p></div><Activity size={18} className="text-slate-500" /></div><div className="space-y-3">{activities.length ? activities.map((item, index) => <div key={index} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700"><span className={item.approved ? 'text-emerald-600' : 'text-amber-600'}>{item.approved ? <CheckCircle2 size={17} /> : <RotateCcw size={17} />}</span>{item.message}</div>) : <p className="text-sm text-slate-500">No recent finance activity.</p>}</div></div>
        <RecentNotifications notifications={notifications.length > 0 ? notifications : defaultNotes} onViewAll={() => window.location.assign('/finance-office/notifications')} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-900">Quick Actions</h2><p className="text-xs text-slate-500">Open finance work areas</p></div><WalletCards size={18} className="text-slate-500" /></div><div className="flex flex-wrap gap-3"><button type="button" onClick={() => window.location.assign('/finance-office/requests')} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><Search size={16} /> View Pending Requests</button><button type="button" onClick={() => window.location.assign('/finance-office/requests')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><FileCheck2 size={16} /> View All Requests</button><button type="button" onClick={() => window.location.assign('/finance-office/reports')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ClipboardCheck size={16} /> View Clearance History</button></div></div>
    </div>
  );
};

export default SummaryCardDashboard;