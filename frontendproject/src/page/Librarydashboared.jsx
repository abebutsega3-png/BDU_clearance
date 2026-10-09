import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileBarChart2,
  RefreshCw,
  RotateCcw,
  Search,
  Wallet,
} from 'lucide-react';
import LibrarySidebar from '../components/Library Management/librarysidbar';
import LibraryNavbar from '../components/Library Management/librarynavbar';
import SummaryCards from '../components/Library Management/Summary Cards';
import { LibraryLanguageProvider } from '../components/Library Management/LibraryLanguage';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const EMPTY_DASHBOARD = {
  stats: {
    total: 0, pending: 0, underReview: 0, approved: 0, returned: 0,
    booksNotReturned: 0, overdueBooks: 0, unpaidFines: 0, clearedEmployees: 0,
  },
  statusOverview: { pending: 0, underReview: 0, approved: 0, returned: 0 },
  monthlyRequests: Array(12).fill(0),
  recentRequests: [],
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
};

const statusStyle = {
  Pending: 'bg-amber-50 text-amber-800',
  'Under Review': 'bg-violet-50 text-violet-800',
  Approved: 'bg-emerald-50 text-emerald-800',
  Returned: 'bg-rose-50 text-rose-800',
};

const Dashboard = ({ children }) => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(!children);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get('http://localhost:3000/api/library/records/dashboard', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      if (!data?.success || !data.stats) throw new Error(data?.message || 'Library dashboard data was not returned.');
      setDashboard({
        ...EMPTY_DASHBOARD,
        ...data,
        stats: { ...EMPTY_DASHBOARD.stats, ...data.stats },
        statusOverview: { ...EMPTY_DASHBOARD.statusOverview, ...data.statusOverview },
        monthlyRequests: Array.isArray(data.monthlyRequests) ? data.monthlyRequests : EMPTY_DASHBOARD.monthlyRequests,
        recentRequests: Array.isArray(data.recentRequests) ? data.recentRequests : [],
      });
    } catch (loadError) {
      console.error('Unable to load library dashboard:', loadError);
      setError(loadError.response?.data?.message || loadError.message || 'Unable to load library dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!children) loadDashboard();
  }, [children, loadDashboard]);

  const dateLabel = useMemo(() => new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  }).format(new Date()).toUpperCase(), []);

  if (children) return <DashboardShell>{children}</DashboardShell>;

  const { stats, statusOverview, monthlyRequests, recentRequests } = dashboard;
  const maxMonthly = Math.max(1, ...monthlyRequests);
  const overviewTotal = Object.values(statusOverview).reduce((sum, count) => sum + Number(count || 0), 0);
  const overviewParts = [
    { key: 'pending', label: 'Pending', color: '#f59e0b' },
    { key: 'underReview', label: 'Under Review', color: '#8b5cf6' },
    { key: 'approved', label: 'Approved', color: '#059669' },
    { key: 'returned', label: 'Returned', color: '#e11d48' },
  ];
  let gradientStart = 0;
  const donutGradient = overviewParts.map(({ key, color }) => {
    const start = gradientStart;
    gradientStart += overviewTotal ? Number(statusOverview[key] || 0) / overviewTotal * 100 : 0;
    return `${color} ${start}% ${gradientStart}%`;
  }).join(', ');
  return (
    <DashboardShell>
      <main className="min-h-screen bg-[#f3f7f7] p-3 text-slate-800 sm:p-4">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4 text-slate-900 shadow-sm sm:px-5">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-teal-700">
              Library Clearance <span className="text-slate-400">·</span> {dateLabel}
            </p>
            <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">Library Officer Dashboard</h1>
            <p className="mt-1 text-xs text-slate-600">Review and process employee library clearance requests.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link to="/library-office/reports" className="inline-flex items-center gap-1.5 rounded-md bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-600"><FileBarChart2 size={14} />Generate Report</Link>
            <Link to="/library-office/clearance-requests?status=Pending" className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50">Review Pending</Link>
          </div>
        </header>

        {error && <div role="alert" className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs text-rose-700"><span>{error}</span><button type="button" onClick={loadDashboard} className="inline-flex shrink-0 items-center gap-1 font-semibold"><RefreshCw size={13} />Retry</button></div>}
        {loading && <p role="status" className="mb-3 text-xs text-slate-500">Loading library dashboard…</p>}

        <SummaryCards stats={stats} />

        <section aria-label="Library responsibility summary" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricCard icon={BookOpen} label="Books Not Returned" value={stats.booksNotReturned} tint="amber" />
          <MetricCard icon={AlertTriangle} label="Overdue Books" value={stats.overdueBooks} tint="rose" />
          <MetricCard icon={Wallet} label="Unpaid Fines (ETB)" value={Number(stats.unpaidFines || 0).toLocaleString('en-ET', { maximumFractionDigits: 2 })} tint="violet" />
          <MetricCard icon={ClipboardCheck} label="Cleared Employees" value={stats.clearedEmployees} tint="emerald" />
        </section>

        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(240px,0.8fr)]">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-3">
              <div><h2 className="text-xs font-bold text-slate-900">Recent Clearance Requests</h2><p className="mt-0.5 text-[9px] text-slate-500">Latest employee library clearance workload</p></div>
              <Link to="/library-office/clearance-requests" className="inline-flex items-center gap-1 text-[9px] font-semibold text-teal-700 hover:text-teal-900">View all <ArrowRight size={12} /></Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[530px] text-left text-[9px]">
                <thead className="bg-slate-50 text-[8px] uppercase text-slate-500"><tr><th className="px-3 py-2">Request ID</th><th className="px-3 py-2">Employee</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Action</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && <tr><td colSpan="5" className="p-6 text-center text-slate-400">Loading requests…</td></tr>}
                  {!loading && !recentRequests.length && <tr><td colSpan="5" className="p-6 text-center text-slate-400">No library clearance requests found.</td></tr>}
                  {!loading && recentRequests.map((request) => (
                    <tr key={request._id || request.requestId} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-semibold text-slate-700">{request.requestId || '—'}</td>
                      <td className="px-3 py-2"><span className="font-medium text-slate-800">{request.employeeName || 'Unknown employee'}</span><span className="ml-1 text-slate-400">{request.employeeId}</span></td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-500">{formatDate(request.createdAt)}</td>
                      <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${statusStyle[request.status] || 'bg-slate-100 text-slate-600'}`}>{request.status}</span></td>
                      <td className="px-3 py-2 text-right"><button type="button" onClick={() => navigate(`/library-office/clearance-requests?requestId=${encodeURIComponent(request._id || request.requestId)}`)} aria-label={`View ${request.requestId || 'request'}`} className="rounded border border-teal-200 px-2 py-1 font-semibold text-teal-700 hover:bg-teal-50"><Eye size={12} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!loading && recentRequests.length > 0 && <div className="flex items-start gap-2 border-t border-slate-100 px-3 py-2 text-[9px] text-slate-500"><CheckCircle2 size={13} className="shrink-0 text-teal-600" />This is all for now. New requests appear here when employees submit them.</div>}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between"><div><h2 className="text-xs font-bold text-slate-900">Status Overview</h2><p className="mt-0.5 text-[9px] text-slate-500">Library clearance requests</p></div><span className="rounded bg-slate-50 px-1.5 py-1 text-[8px] text-slate-500">Live data</span></div>
            <div className="mt-3 flex items-center justify-center">
              <div className="grid h-28 w-28 place-items-center rounded-full" style={{ background: `conic-gradient(${donutGradient || '#e2e8f0 0% 100%'})` }}>
                <div className="grid h-[74px] w-[74px] place-items-center rounded-full bg-white text-center"><div><p className="text-xl font-bold text-slate-900">{overviewTotal}</p><p className="text-[8px] text-slate-500">requests</p></div></div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1">
              {overviewParts.map(({ key, label, color }) => <div key={key} className="flex items-center gap-1.5 text-[9px] text-slate-600"><span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />{label} <strong className="ml-auto">{overviewTotal ? Math.round(Number(statusOverview[key] || 0) / overviewTotal * 100) : 0}%</strong></div>)}
            </div>
          </section>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(240px,0.8fr)]">
          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between"><div><h2 className="text-xs font-bold text-slate-900">Monthly Clearance Requests</h2><p className="mt-0.5 text-[9px] text-slate-500">Requests received this year</p></div><CalendarDays size={15} className="text-teal-700" /></div>
            <div className="mt-4 grid h-28 grid-cols-12 items-end gap-1.5">
              {monthlyRequests.map((count, index) => <div key={MONTHS[index]} className="flex h-full flex-col items-center justify-end gap-1">
                <span className="text-[8px] font-semibold text-slate-600">{count || ''}</span>
                <div title={`${MONTHS[index]}: ${count} requests`} className={`w-full max-w-8 rounded-t ${index === new Date().getMonth() ? 'bg-teal-700' : 'bg-teal-600/40'}`} style={{ height: `${Math.max(count ? 10 : 2, count / maxMonthly * 72)}%` }} />
                <span className="text-[8px] text-slate-500">{MONTHS[index]}</span>
              </div>)}
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h2 className="text-xs font-bold text-slate-900">Quick Actions</h2>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <QuickAction to="/library-office/clearance-requests?status=Pending" icon={Search} label="View Pending Requests" tone="amber" />
              <QuickAction to="/library-office/clearance-requests?status=In%20Progress" icon={CheckCircle2} label="Review Clearance" tone="emerald" />
              <QuickAction to="/library-office/clearance-history" icon={RotateCcw} label="Clearance History" tone="violet" />
              <QuickAction to="/library-office/reports" icon={FileBarChart2} label="Generate Report" tone="blue" />
            </div>
            <Link to="/library-office/notifications" className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[9px] font-semibold text-slate-600"><span className="flex items-center gap-1.5"><Bell size={12} className="text-teal-700" />Notifications</span><ArrowRight size={12} /></Link>
          </section>
        </div>
      </main>
    </DashboardShell>
  );
};

function DashboardShell({ children }) {
  return (
    <LibraryLanguageProvider>
      <div className="min-h-screen bg-slate-100"><LibrarySidebar /><div className="ml-72 min-h-screen"><LibraryNavbar />{children}</div></div>
    </LibraryLanguageProvider>
  );
}

function MetricCard({ icon: Icon, label, value, tint }) {
  const colors = {
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
    violet: 'bg-violet-50 text-violet-700',
    emerald: 'bg-emerald-50 text-emerald-700',
  };
  return <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${colors[tint]}`}><Icon size={15} /></span><div className="min-w-0"><p className="truncate text-[8px] font-medium text-slate-500">{label}</p><p className="text-sm font-bold text-slate-900">{value}</p></div></div>;
}

function QuickAction({ to, icon: Icon, label, tone }) {
  const colors = { amber: 'bg-amber-50 text-amber-800', emerald: 'bg-emerald-50 text-emerald-800', violet: 'bg-violet-50 text-violet-800', blue: 'bg-blue-50 text-blue-800' };
  return <Link to={to} className={`flex min-h-14 items-center gap-2 rounded-md p-2 text-[9px] font-semibold hover:brightness-95 ${colors[tone]}`}><Icon size={14} className="shrink-0" />{label}</Link>;
}

export default Dashboard;
