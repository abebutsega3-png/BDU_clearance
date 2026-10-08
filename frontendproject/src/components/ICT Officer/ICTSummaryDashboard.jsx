import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  Laptop,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../../context/authContext';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000')
  .replace(/\/api\/clearance\/?$/i, '')
  .replace(/\/api\/?$/i, '')
  .replace(/\/+$/, '');

const normalizeStatus = (status = '') => {
  const value = String(status).trim().toLowerCase();
  if (value === 'pending' || value === 'pending review') return 'Pending';
  if (value === 'in progress' || value === 'under review' || value === 'in review') return 'In Review';
  if (value === 'approved' || value === 'completed') return 'Approved';
  if (value === 'returned' || value === 'rejected') return 'Returned';
  return status || 'Pending';
};

const getEmployee = (request) => request.employee || {};
const getEmployeeName = (request) => getEmployee(request).fullName || request.employeeName || request.employeeId || 'Unknown employee';
const getRequestDate = (request) => request.requestDate || request.createdAt;
const formatDate = (value, options = { month: 'short', day: 'numeric', year: 'numeric' }) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString(undefined, options);
};
const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

const statusStyle = {
  Pending: 'bg-amber-100 text-amber-800',
  'In Review': 'bg-blue-100 text-blue-800',
  Approved: 'bg-emerald-100 text-emerald-800',
  Returned: 'bg-rose-100 text-rose-800',
};

const timelineColors = ['bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-violet-500', 'bg-cyan-500', 'bg-orange-500'];
const sparks = [
  '0,18 12,14 24,20 36,11 48,17 60,9 72,14 84,6 96,12 108,8 120,14 132,7 144,11',
  '0,15 12,19 24,12 36,16 48,9 60,14 72,8 84,17 96,12 108,18 120,10 132,13 144,6',
  '0,18 12,12 24,17 36,8 48,14 60,7 72,12 84,5 96,10 108,6 120,14 132,9 144,11',
  '0,16 12,12 24,18 36,9 48,15 60,7 72,12 84,4 96,10 108,14 120,7 132,11 144,5',
];

function MetricCard({ label, value, Icon, color, trend, spark, detail }) {
  return (
    <article className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${color}`}>
            <Icon size={19} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-bold leading-none text-slate-900">{value}</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{trend}</span>
      </div>
      <svg viewBox="0 0 144 24" preserveAspectRatio="none" className="mt-3 h-7 w-full text-blue-500" aria-hidden="true">
        <polyline points={spark} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="mt-1 text-[10px] text-slate-500">{detail}</p>
    </article>
  );
}

export default function ICTSummaryDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState('');
  const [assetError, setAssetError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    const loadDashboard = async () => {
      setLoading(true);
      setRequestError('');
      setAssetError('');
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [requestResult, assetResult] = await Promise.allSettled([
        fetch(`${API_BASE}/api/ict/clearance-requests?status=All`, { headers }),
        fetch(`${API_BASE}/api/ict-assets`, { headers }),
      ]);

      if (!isCurrent) return;

      if (requestResult.status === 'fulfilled') {
        try {
          const response = requestResult.value;
          const data = await response.json();
          if (!response.ok || !data.success || !Array.isArray(data.data)) {
            throw new Error(data.message || 'Unable to load ICT clearance requests.');
          }
          setRequests(data.data);
        } catch (error) {
          setRequestError(error.message || 'Unable to load ICT clearance requests.');
        }
      } else {
        setRequestError(requestResult.reason?.message || 'Unable to connect to ICT clearance requests.');
      }

      if (assetResult.status === 'fulfilled') {
        try {
          const response = assetResult.value;
          const data = await response.json();
          if (!response.ok || !data.success || !Array.isArray(data.data)) {
            throw new Error(data.message || 'Unable to load ICT asset inventory.');
          }
          setAssets(data.data);
        } catch (error) {
          setAssetError(error.message || 'Unable to load ICT asset inventory.');
        }
      } else {
        setAssetError(assetResult.reason?.message || 'Unable to connect to ICT asset inventory.');
      }
      setLoading(false);
    };

    loadDashboard();
    return () => { isCurrent = false; };
  }, [refreshKey]);

  const counts = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((item) => normalizeStatus(item.status) === 'Pending').length,
    review: requests.filter((item) => normalizeStatus(item.status) === 'In Review').length,
    approved: requests.filter((item) => normalizeStatus(item.status) === 'Approved').length,
  }), [requests]);

  const assignedAssets = assets.filter((asset) => asset.assetStatus === 'Assigned').length;
  const recentRequests = requests.slice(0, 7);
  const notifications = requests.slice(0, 4);
  const today = new Date();
  const metrics = [
    { label: 'Total Requests', value: counts.total, Icon: FileText, color: 'bg-cyan-500 text-white', trend: 'ICT', spark: sparks[0], detail: 'Across all departments' },
    { label: 'Pending Requests', value: counts.pending, Icon: Clock3, color: 'bg-orange-500 text-white', trend: 'Open', spark: sparks[1], detail: 'Awaiting ICT decision' },
    { label: 'In Review', value: counts.review, Icon: Search, color: 'bg-blue-500 text-white', trend: 'Active', spark: sparks[2], detail: 'Additional verification needed' },
    { label: 'Approved', value: counts.approved, Icon: CheckCircle2, color: 'bg-emerald-500 text-white', trend: 'Done', spark: sparks[3], detail: 'Completed ICT reviews' },
  ];

  return (
    <div className="min-h-[calc(100vh-6rem)] rounded-xl bg-white p-3 sm:p-4 lg:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-[#0a3552] sm:text-2xl">
            <span aria-hidden="true">👋</span> Welcome, {user?.name || 'ICT Officer'}
          </h1>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            <span className="font-semibold text-blue-700">ICT Officer Dashboard</span>
            <span className="mx-2 text-slate-400">|</span>
            Manage and monitor employee clearance requests
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-white/80 px-3 py-2 text-xs text-slate-700 shadow-sm">
          <CalendarDays size={18} className="text-blue-700" />
          <div>
            <p className="font-semibold text-blue-900">Today</p>
            <p>{formatDate(today)}</p>
          </div>
          <button type="button" aria-label="Refresh dashboard" onClick={() => setRefreshKey((value) => value + 1)} className="ml-2 rounded-md p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {(requestError || assetError) && (
        <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <span>{[requestError, assetError].filter(Boolean).join(' ')}</span>
          <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="font-semibold underline">Retry</button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} value={loading ? '—' : metric.value} />
        ))}
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_270px]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 text-slate-800">
            <h2 className="flex items-center gap-2 text-sm font-bold sm:text-base">
              <Clock3 size={18} className="text-blue-700" /> Recent Clearance Requests Timeline
            </h2>
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Live updates
            </span>
          </div>

          {loading ? (
            <p className="p-8 text-center text-sm text-slate-500">Loading clearance requests...</p>
          ) : recentRequests.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">No ICT clearance requests found.</p>
          ) : (
            <div className="relative space-y-2 bg-slate-50/60 p-3 sm:p-4">
              <div className="absolute bottom-8 left-[23px] top-8 w-px bg-slate-300" aria-hidden="true" />
              {recentRequests.map((request, index) => {
                const employee = getEmployee(request);
                const status = normalizeStatus(request.status);
                const when = getRequestDate(request);
                return (
                  <Link
                    key={request._id || request.clearanceId || request.requestId || index}
                    to="/ict-office/requests"
                    className="relative grid grid-cols-[16px_36px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2.5 transition hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-sm sm:grid-cols-[16px_38px_minmax(0,1fr)_minmax(110px,auto)_minmax(90px,auto)_16px] sm:gap-3 sm:px-3"
                  >
                    <span className={`z-10 h-2.5 w-2.5 rounded-full ring-4 ring-white ${timelineColors[index % timelineColors.length]}`} />
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-blue-200 text-blue-800">
                      <UserRound size={17} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-slate-800">{getEmployeeName(request)}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                        {employee.campus || 'Campus unavailable'} <span className="mx-1">·</span> {employee.department || 'Department unavailable'}
                      </span>
                    </span>
                    <span className="hidden min-w-[100px] items-center gap-2 text-[10px] text-slate-600 sm:flex">
                      <Building2 size={14} className="text-blue-700" />
                      {request.clearanceType || request.clearanceReason || 'ICT Clearance'}
                    </span>
                    <span className={`hidden rounded-full px-2.5 py-1 text-center text-[10px] font-semibold sm:block ${statusStyle[status] || 'bg-slate-100 text-slate-700'}`}>
                      {status}
                    </span>
                    <span className="hidden text-right text-[9px] leading-4 text-slate-500 sm:block">
                      {formatDate(when, { month: 'short', day: 'numeric', year: 'numeric' })}
                      <br />{formatTime(when)}
                    </span>
                    <ArrowRight size={15} className="text-blue-600" />
                  </Link>
                );
              })}
              <Link to="/ict-office/requests" className="mx-auto flex w-fit items-center gap-2 rounded-full bg-sky-100 px-4 py-2 text-[11px] font-semibold text-blue-800 transition hover:bg-sky-200">
                View All Requests <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </section>

        <aside className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 text-slate-800">
              <h2 className="flex items-center gap-2 text-sm font-bold"><Bell size={17} className="text-blue-700" /> Notifications</h2>
              <Link to="/ict-office/notifications" className="text-[10px] font-semibold text-blue-700 underline underline-offset-2">View All</Link>
            </div>
            <div className="divide-y divide-slate-100 px-3">
              {notifications.length ? notifications.map((request, index) => {
                const status = normalizeStatus(request.status);
                const Icon = status === 'Pending' ? Clock3 : status === 'Approved' ? CheckCircle2 : FileCheck2;
                const color = status === 'Pending' ? 'bg-orange-100 text-orange-600' : status === 'Approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600';
                return (
                  <Link to="/ict-office/requests" key={request._id || request.clearanceId || index} className="flex items-center gap-2.5 py-3 hover:bg-slate-50">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color}`}><Icon size={15} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[10px] font-bold text-slate-800">{status === 'Pending' ? 'Pending ICT Review' : `${status} ICT Clearance`}</span>
                      <span className="block truncate text-[9px] text-slate-500">{getEmployeeName(request)} ({getEmployee(request).campus || 'Campus unavailable'})</span>
                    </span>
                    <span className="text-[9px] text-slate-400">{formatDate(getRequestDate(request), { hour: '2-digit', minute: '2-digit' })}</span>
                  </Link>
                );
              }) : <p className="py-5 text-center text-xs text-slate-500">{loading ? 'Loading notifications...' : 'No recent notifications.'}</p>}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold"><Activity size={17} className="text-blue-700" /> System Health</h2>
              <span className={`flex items-center gap-1.5 text-[9px] ${assetError || requestError ? 'text-amber-700' : 'text-emerald-700'}`}>
                <span className={`h-2 w-2 rounded-full ${assetError || requestError ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                {assetError || requestError ? 'Check connection' : 'Services operational'}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { value: loading ? '—' : assets.length, label: 'ICT Assets', Icon: Laptop },
                { value: loading ? '—' : assignedAssets, label: 'Assigned', Icon: UserRound },
                { value: loading ? '—' : counts.pending, label: 'Pending', Icon: Clock3 },
              ].map(({ value, label, Icon }) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <Icon size={15} className="mx-auto text-blue-600" />
                  <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
                  <p className="text-[9px] text-slate-500">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 flex items-center gap-1.5 border-t border-slate-200 pt-2 text-[10px] text-slate-600">
              <ShieldCheck size={14} /> Asset inventory and clearance workflow
            </p>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:col-span-2 xl:col-span-1">
            <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-bold text-slate-800"><Wrench size={16} className="text-blue-700" /> Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'View Requests', to: '/ict-office/requests', Icon: FileCheck2, color: 'bg-cyan-600' },
                { label: 'ICT Assets', to: '/ict-office/assets', Icon: Laptop, color: 'bg-blue-600' },
                { label: 'Generate Report', to: '/ict-office/reports', Icon: FileText, color: 'bg-violet-600' },
                { label: 'Settings', to: '/ict-office/settings', Icon: Settings, color: 'bg-slate-600' },
              ].map(({ label, to, Icon, color }) => (
                <Link key={to} to={to} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[10px] font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white ${color}`}><Icon size={14} /></span>
                  {label}
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-cyan-900/10 px-1 pt-3 text-[10px] text-slate-600">
        <span>Bahir Dar University <span className="mx-2 text-slate-400">|</span> ICT Department</span>
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Real-time updates <span className="ml-2 text-slate-400">v1.0.0</span></span>
      </footer>
    </div>
  );
}
