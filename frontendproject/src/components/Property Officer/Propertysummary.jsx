import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Activity, AlertTriangle, BellRing, Boxes, CalendarDays, CheckCircle2,
  ChevronRight, Clock, FileText, History, ListCheck, Loader2, RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { usePropertyLanguage } from './propertyLanguage';

const EMPTY_DASHBOARD = {
  summary: {
    totalRequests: 0,
    pendingRequests: 0,
    underReview: 0,
    approved: 0,
    returned: 0,
    outstandingAssetsCount: 0,
  },
  pendingRequests: [],
  outstandingAssets: [],
  recentActivities: [],
};

const dateText = (value, t) => {
  if (!value) return t('Date unavailable', 'ቀኑ አይገኝም');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t('Date unavailable', 'ቀኑ አይገኝም');
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const activityTime = (value, t) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t('Recently', 'በቅርቡ');
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (elapsedMinutes < 1) return t('Just now', 'አሁን');
  if (elapsedMinutes < 60) return t(`${elapsedMinutes}m ago`, `${elapsedMinutes} ደቂቃ በፊት`);
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return t(`${elapsedHours}h ago`, `${elapsedHours} ሰዓት በፊት`);
  const elapsedDays = Math.floor(elapsedHours / 24);
  return elapsedDays < 7 ? t(`${elapsedDays}d ago`, `${elapsedDays} ቀን በፊት`) : dateText(value, t);
};

export default function PropertyDashboard() {
  const { t } = usePropertyLanguage();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchDashboard = useCallback(async (backgroundRefresh = false) => {
    if (backgroundRefresh) setRefreshing(true);
    try {
      const response = await axios.get('http://localhost:3000/api/property/dashboard/dashboard');
      const payload = response.data;
      if (!payload?.summary) throw new Error(t('The dashboard response is incomplete.', 'የዳሽቦርዱ ምላሽ ያልተሟላ ነው።'));
      const summary = payload.summary;
      setDashboardData({
        ...EMPTY_DASHBOARD,
        ...payload,
        summary: {
          totalRequests: Number(summary.totalRequests) || 0,
          pendingRequests: Number(summary.pendingRequests ?? summary.pending) || 0,
          underReview: Number(summary.underReview) || 0,
          approved: Number(summary.approved) || 0,
          returned: Number(summary.returned) || 0,
          outstandingAssetsCount: Number(summary.outstandingAssetsCount ?? summary.outstandingAssets) || 0,
        },
        pendingRequests: Array.isArray(payload.pendingRequests) ? payload.pendingRequests : [],
        outstandingAssets: Array.isArray(payload.outstandingAssets) ? payload.outstandingAssets : [],
        recentActivities: Array.isArray(payload.recentActivities) ? payload.recentActivities : [],
      });
      setLastUpdated(new Date());
      setError('');
    } catch (requestError) {
      console.error('Unable to load Property Officer dashboard:', requestError);
      setError(requestError.response?.data?.message || requestError.message || t('Could not load dashboard information.', 'የዳሽቦርዱን መረጃ መጫን አልተቻለም።'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    fetchDashboard();
    const refreshTimer = window.setInterval(() => fetchDashboard(true), 60000);
    return () => window.clearInterval(refreshTimer);
  }, [fetchDashboard]);

  const statusBreakdown = useMemo(() => {
    const { approved, pendingRequests, underReview, returned } = dashboardData.summary;
    const values = [
      { label: 'Approved', value: approved, color: '#059669', textColor: 'text-emerald-700' },
      { label: 'Pending', value: pendingRequests, color: '#f59e0b', textColor: 'text-amber-700' },
      { label: 'Under Review', value: underReview, color: '#3b82f6', textColor: 'text-blue-700' },
      { label: 'Returned', value: returned, color: '#f43f5e', textColor: 'text-rose-700' },
    ];
    const total = values.reduce((sum, item) => sum + item.value, 0);
    let offset = 0;
    const segments = values.map((item) => {
      const percent = total ? item.value / total * 100 : 0;
      const start = offset;
      offset += percent;
      return `${item.color} ${start}% ${offset}%`;
    });
    return { values, total, background: total ? `conic-gradient(${segments.join(', ')})` : '#e2e8f0' };
  }, [dashboardData.summary]);

  const { summary, pendingRequests, outstandingAssets, recentActivities } = dashboardData;
  const cards = [
    { label: 'Total Requests', value: summary.totalRequests, icon: ListCheck, style: 'border-slate-200 text-slate-800', iconColor: 'text-sky-600', path: '/property/clearance-requests' },
    { label: 'Pending', value: summary.pendingRequests, icon: BellRing, style: 'border-amber-300 bg-amber-50/70 text-amber-900', iconColor: 'text-amber-600', path: '/property/clearance-requests' },
    { label: 'Under Review', value: summary.underReview, icon: Clock, style: 'border-slate-200 text-slate-800', iconColor: 'text-slate-500', path: '/property/clearance-requests' },
    { label: 'Approved', value: summary.approved, icon: CheckCircle2, style: 'border-emerald-200 bg-emerald-50/70 text-emerald-900', iconColor: 'text-emerald-600', path: '/property/clearance-history' },
    { label: 'Returned', value: summary.returned, icon: RotateCcw, style: 'border-rose-200 bg-rose-50/70 text-rose-900', iconColor: 'text-rose-600', path: '/property/clearance-history' },
    { label: 'Outstanding Assets', value: `${summary.outstandingAssetsCount} ${t('Assets', 'ንብረቶች')}`, icon: AlertTriangle, style: 'border-rose-300 bg-rose-50/60 text-rose-900', iconColor: 'text-rose-700', path: '/property/asset-records' },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 animate-spin" size={18} />{t('Loading Property Officer dashboard...', 'የንብረት ኦፊሰር ዳሽቦርድ በመጫን ላይ...')}
      </div>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] space-y-4 bg-slate-50 p-3 text-xs text-slate-700 sm:p-4">
      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-rose-800">
          <span>{error}</span>
          <button type="button" onClick={() => fetchDashboard(true)} className="inline-flex items-center gap-1 font-semibold underline">
            <RefreshCw size={12} /> {t('Retry', 'እንደገና ይሞክሩ')}
          </button>
        </div>
      )}

      <section className="relative flex min-h-[76px] items-center overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
        <div className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: 'linear-gradient(110deg, rgba(255,255,255,.98) 8%, rgba(240,247,250,.78) 58%, rgba(224,239,245,.6)), repeating-linear-gradient(35deg, transparent 0 26px, rgba(148,163,184,.12) 27px 28px), repeating-linear-gradient(145deg, transparent 0 42px, rgba(148,163,184,.1) 43px 44px)' }} />
        <div className="relative z-10 min-w-0">
          <div className="flex items-center gap-2">
            <Boxes className="shrink-0 text-teal-700" size={17} />
            <h1 className="text-sm font-bold text-slate-900 sm:text-base">{t('PROPERTY / ASSET OFFICER DASHBOARD', 'የንብረት ኦፊሰር ዳሽቦርድ')}</h1>
          </div>
          <p className="mt-1 text-[10px] text-slate-600 sm:text-[11px]">{t('Bahir Dar University · Employee Clearance Management System', 'ባህር ዳር ዩኒቨርሲቲ · የሰራተኞች ክሊራንስ አስተዳደር ስርዓት')}</p>
          <p className="mt-1 flex items-center gap-1 text-[9px] text-slate-500">
            <CalendarDays size={10} /> {dateText(new Date(), t)}
            <span className="ml-1 inline-flex items-center gap-1 text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{t('System Online', 'ስርዓቱ በመስመር ላይ ነው')}</span>
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map(({ label, value, icon: Icon, style, iconColor, path }) => (
          <button key={label} type="button" onClick={() => navigate(path)} className={`group min-h-[78px] rounded-xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${style}`}>
            <span className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-semibold leading-tight">{t(label, ({ 'Total Requests': 'ጠቅላላ ጥያቄዎች', Pending: 'በመጠባበቅ ላይ', 'Under Review': 'በግምገማ ላይ', Approved: 'ጸድቋል', Returned: 'ተመልሷል', 'Outstanding Assets': 'ያልተመለሱ ንብረቶች' })[label])}</span>
              <Icon size={14} className={`shrink-0 ${iconColor}`} />
            </span>
            <span className="mt-2 block text-lg font-bold leading-none">{value}</span>
            <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/70">
              <span className="block h-full w-2/3 rounded-full bg-current opacity-25 transition-all group-hover:w-full" />
            </span>
          </button>
        ))}
      </section>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(250px,1fr)]">
        <div className="space-y-3">
          <DashboardTable
            title={t('Pending Clearance Requests', 'በመጠባበቅ ላይ ያሉ የክሊራንስ ጥያቄዎች')}
            icon={Clock}
            iconColor="text-amber-600"
            actionLabel={t('View All', 'ሁሉንም ይመልከቱ')}
            onAction={() => navigate('/property/clearance-requests')}
          >
            <table className="w-full min-w-[620px] text-left">
              <thead className="bg-slate-50 text-[10px] text-slate-600">
                <tr>{['Request ID', 'Employee', 'Department', 'Date', 'Status', 'Action'].map((label) => <th key={label} className="px-2.5 py-2 font-semibold">{t(label, ({ 'Request ID': 'የጥያቄ መለያ', Employee: 'ሰራተኛ', Department: 'ዲፓርትመንት', Date: 'ቀን', Status: 'ሁኔታ', Action: 'ተግባር' })[label])}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingRequests.length ? pendingRequests.map((request) => (
                  <tr key={request._id || request.requestId} className="hover:bg-slate-50">
                    <td className="px-2.5 py-2 font-mono text-[9px] font-semibold text-slate-700">{request.requestId}</td>
                    <td className="px-2.5 py-2 font-medium text-slate-800">{request.employeeName}</td>
                    <td className="px-2.5 py-2 text-slate-600">{request.department}</td>
                    <td className="whitespace-nowrap px-2.5 py-2 text-slate-600">{dateText(request.date, t)}</td>
                    <td className="px-2.5 py-2"><span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-semibold text-amber-800">{t(request.status || 'Pending', ({ Pending: 'በመጠባበቅ ላይ', Approved: 'ጸድቋል', Returned: 'ተመልሷል', 'Under Review': 'በግምገማ ላይ', Completed: 'ተጠናቋል' })[request.status || 'Pending'])}</span></td>
                    <td className="px-2.5 py-2 text-right">
                      <button type="button" onClick={() => navigate('/property/clearance-requests')} className="inline-flex items-center gap-1 rounded bg-teal-700 px-2.5 py-1.5 text-[9px] font-semibold text-white hover:bg-teal-800"><FileText size={11} />{t('View', 'ይመልከቱ')}</button>
                    </td>
                  </tr>
                )) : <tr><td colSpan="6" className="px-3 py-5 text-center text-slate-400">{t('There are no pending clearance requests.', 'በመጠባበቅ ላይ ያሉ የክሊራንስ ጥያቄዎች የሉም።')}</td></tr>}
              </tbody>
            </table>
          </DashboardTable>

          <DashboardTable
            title={t('Outstanding Assets (Unreturned University Property)', 'ያልተመለሱ ንብረቶች (ያልተመለሱ የዩኒቨርሲቲ ንብረቶች)')}
            icon={AlertTriangle}
            iconColor="text-rose-600"
            actionLabel={t('View All', 'ሁሉንም ይመልከቱ')}
            onAction={() => navigate('/property/asset-records')}
          >
            <table className="w-full min-w-[540px] text-left">
              <thead className="bg-slate-50 text-[10px] text-slate-600">
                <tr>{['Employee', 'Asset', 'Asset ID', 'Status'].map((label) => <th key={label} className="px-2.5 py-2 font-semibold">{t(label, ({ Employee: 'ሰራተኛ', Asset: 'ንብረት', 'Asset ID': 'የንብረት መለያ', Status: 'ሁኔታ' })[label])}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {outstandingAssets.length ? outstandingAssets.map((asset) => (
                  <tr key={asset._id || asset.assetId} className="hover:bg-slate-50">
                    <td className="px-2.5 py-2 font-medium text-slate-800">{asset.employeeName}</td>
                    <td className="px-2.5 py-2 font-medium text-slate-700">{asset.assetName}</td>
                    <td className="px-2.5 py-2 font-mono text-slate-500">{asset.assetId}</td>
                    <td className="px-2.5 py-2"><span className="rounded-full bg-rose-100 px-2 py-1 text-[9px] font-semibold text-rose-800">{t(asset.status || 'Outstanding', ({ Outstanding: 'ያልተመለሰ', Damaged: 'የተበላሸ' })[asset.status || 'Outstanding'])}</span></td>
                  </tr>
                )) : <tr><td colSpan="4" className="px-3 py-5 text-center text-slate-400">{t('No outstanding asset records were found.', 'ያልተመለሱ የንብረት መዝገቦች አልተገኙም።')}</td></tr>}
              </tbody>
            </table>
          </DashboardTable>
        </div>

        <aside className="space-y-3">
          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <PanelHeading icon={Boxes} title={t('Clearance Status', 'የክሊራንስ ሁኔታ')} />
            <div className="flex items-center justify-center gap-4 py-3">
              <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: statusBreakdown.background }}>
                <div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-white text-center">
                  <span><strong className="block text-lg leading-none text-slate-800">{summary.totalRequests}</strong><span className="mt-1 block text-[9px] text-slate-500">{t('Requests', 'ጥያቄዎች')}</span></span>
                </div>
              </div>
              <div className="space-y-2">
                {statusBreakdown.values.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="min-w-[65px] text-[10px] text-slate-600">{t(item.label, ({ Approved: 'ጸድቋል', Pending: 'በመጠባበቅ ላይ', 'Under Review': 'በግምገማ ላይ', Returned: 'ተመልሷል' })[item.label])}</span>
                    <strong className={`text-[10px] ${item.textColor}`}>{item.value}</strong>
                    <span className="text-[9px] text-slate-400">{statusBreakdown.total ? Math.round(item.value / statusBreakdown.total * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <PanelHeading icon={Activity} title={t('Recent Activity', 'የቅርብ ጊዜ እንቅስቃሴ')} />
              <button type="button" onClick={() => fetchDashboard(true)} disabled={refreshing} title={t('Refresh dashboard', 'ዳሽቦርዱን ያድሱ')} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {recentActivities.length ? recentActivities.map((activity) => (
                <div key={activity._id || activity.id} className="flex items-start gap-2 rounded-lg bg-slate-50 p-2">
                  <ActivityIcon type={activity.type} />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-[10px] font-medium text-slate-700">{activity.action || t('Property record updated', 'የንብረት መዝገብ ተዘምኗል')}</p>
                    <p className="mt-1 text-[9px] text-slate-400">{activityTime(activity.timeAgo, t)}</p>
                  </div>
                </div>
              )) : <p className="py-3 text-center text-[10px] text-slate-400">{t('No recent activity to show.', 'ለማሳየት የቅርብ ጊዜ እንቅስቃሴ የለም።')}</p>}
            </div>
            {lastUpdated && <p className="mt-2 text-right text-[9px] text-slate-400">{t('Updated', 'የተዘመነው')} {activityTime(lastUpdated, t)}</p>}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <PanelHeading icon={ChevronRight} title={t('Quick Actions', 'ፈጣን እርምጃዎች')} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <QuickAction icon={Clock} label={t('Pending Requests', 'በመጠባበቅ ላይ ያሉ ጥያቄዎች')} color="amber" onClick={() => navigate('/property/clearance-requests')} />
              <QuickAction icon={AlertTriangle} label={t('Outstanding Assets', 'ያልተመለሱ ንብረቶች')} color="rose" onClick={() => navigate('/property/asset-records')} />
              <QuickAction icon={History} label={t('Clearance History', 'የክሊራንስ ታሪክ')} color="slate" onClick={() => navigate('/property/clearance-history')} />
              <QuickAction icon={FileText} label={t('Reports', 'ሪፖርቶች')} color="teal" onClick={() => navigate('/property/reports')} />
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function DashboardTable({ title, icon: Icon, iconColor, actionLabel, onAction, children }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
        <h2 className="flex items-center gap-2 text-[11px] font-bold text-slate-800"><Icon size={14} className={iconColor} />{title}</h2>
        <button type="button" onClick={onAction} className="inline-flex shrink-0 items-center gap-0.5 text-[9px] font-semibold text-teal-700 hover:text-teal-900">{actionLabel}<ChevronRight size={12} /></button>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function PanelHeading({ icon: Icon, title }) {
  return <h2 className="flex items-center gap-2 text-[11px] font-bold text-slate-800"><Icon size={14} className="text-teal-700" />{title}</h2>;
}

function ActivityIcon({ type }) {
  if (type === 'Approved') return <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-600" />;
  if (type === 'Returned') return <RotateCcw size={13} className="mt-0.5 shrink-0 text-rose-600" />;
  return <Clock size={13} className="mt-0.5 shrink-0 text-blue-600" />;
}

function QuickAction({ icon: Icon, label, color, onClick }) {
  const styles = {
    amber: 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100',
    rose: 'border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100',
    slate: 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100',
    teal: 'border-teal-200 bg-teal-50 text-teal-900 hover:bg-teal-100',
  };
  return (
    <button type="button" onClick={onClick} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center text-[9px] font-semibold transition ${styles[color]}`}>
      <Icon size={13} />{label}
    </button>
  );
}
