import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from 'recharts';
import {
  BarChart3, CalendarDays, ChevronLeft, ChevronRight, FileDown,
  FileSpreadsheet, FileText, Printer, Users
} from 'lucide-react';
import { fetchClearances } from '../../until/clearanceHelper';
import { useAdminLanguage } from '../admindashboared/AdminLanguage';

const STATUS_COLORS = {
  Completed: '#10b981',
  'In Progress': '#3b82f6',
  Pending: '#f59e0b',
  Rejected: '#ef4444',
  Overdue: '#a855f7',
};
const STATUS_FILTERS = ['All Types', 'Pending', 'In Progress', 'Completed', 'Rejected', 'Overdue'];
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_CAMPUS = 'Main Campus';
const COMPLETED_STEP_STATUSES = new Set(['approved', 'completed', 'cleared']);

const statusOf = (item) => {
  const status = String(item.status || 'Pending').toLowerCase();
  if (status === 'under review' || status === 'in progress') return 'In Progress';
  if (status === 'approved' || status === 'completed') return 'Completed';
  if (status === 'returned' || status === 'rejected') return 'Rejected';
  if (status === 'overdue') return 'Overdue';
  if (status === 'pending') return 'Pending';
  return item.status || 'Pending';
};
const campusOf = (item) => [item.campus, item.employee?.campus]
  .map((value) => String(value || '').trim())
  .find(Boolean) || DEFAULT_CAMPUS;
const departmentOf = (item) => item.department?.name || item.department?.departmentName
  || (typeof item.department === 'string' ? item.department : '')
  || item.employee?.department || 'Unknown department';
const nameOf = (item) => item.employeeName || item.employee?.fullName || item.employee?.name || (typeof item.employee === 'string' ? item.employee : '') || 'Unknown employee';
const reasonOf = (item) => String(item.reason || item.clearanceReason || item.clearanceType || '').trim() || 'Unspecified';
const dateOf = (item) => item.requestDate || item.submittedDate || item.createdAt;
const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const formatInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const officeDecisionDates = (request) => {
  const normalizeOffice = (value) => {
    const office = value.toLowerCase();
    if (/initial\s*hr/.test(office)) return 'Initial HR Review';
    if (/final\s*hr|hr\s*final/.test(office)) return 'Final HR Clearance';
    if (/department/.test(office)) return 'Department Head';
    if (/finance/.test(office)) return 'Finance Office';
    if (/library/.test(office)) return 'Library';
    if (/property|asset/.test(office)) return 'Property / Asset Office';
    if (/\bict\b/.test(office)) return 'ICT Office';
    if (/transport/.test(office)) return 'Transport Office';
    return value.trim();
  };
  const fields = [
    ['Initial HR Review', request.initialHRStatus, request.initialHRReviewedAt],
    ['Department Head', request.departmentStatus, request.departmentReviewedAt],
    ['Finance Office', request.financeStatus, request.financeReviewedAt],
    ['Library', request.libraryStatus, request.libraryReviewedAt],
    ['Property / Asset Office', request.propertyStatus, request.propertyReviewedAt],
    ['ICT Office', request.ictStatus || request.ictClearance?.status, request.ictReviewedAt || request.ictClearance?.reviewedAt],
    ['Transport Office', request.transportStatus, request.transportReviewedAt],
    ['Final HR Clearance', request.finalHRStatus, request.finalHRApprovalDate || request.completionDate],
  ].map(([office, status, date]) => ({
    office,
    status: String(status || '').toLowerCase(),
    date: parseDate(date),
  })).filter((step) => step.date && COMPLETED_STEP_STATUSES.has(step.status));

  const workflow = [...(Array.isArray(request.workflow) ? request.workflow : []),
    ...(Array.isArray(request.departmentClearances) ? request.departmentClearances : [])]
    .map((step) => ({
      office: normalizeOffice(String(step.office || step.name || step.department || '').trim()),
      status: String(step.status || '').toLowerCase(),
      date: parseDate(step.reviewedAt || step.completedAt || step.timestamp || step.updatedAt),
    }))
    .filter((step) => step.office && step.date && COMPLETED_STEP_STATUSES.has(step.status));

  const latestWorkflowSteps = new Map();
  workflow.forEach((step) => {
    const key = step.office.toLowerCase();
    if (!latestWorkflowSteps.has(key) || latestWorkflowSteps.get(key).date < step.date) {
      latestWorkflowSteps.set(key, step);
    }
  });
  const recordedOffices = new Set(latestWorkflowSteps.keys());
  return [
    ...latestWorkflowSteps.values(),
    ...fields.filter((step) => !recordedOffices.has(step.office.toLowerCase())),
  ].sort((first, second) => first.date - second.date);
};

export default function SystemAdminReports() {
  const { t } = useAdminLanguage();
  const [clearances, setClearances] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [datePreset, setDatePreset] = useState('All time');
  const [campus, setCampus] = useState('All Campuses');
  const [department, setDepartment] = useState('All Departments');
  const [reportType, setReportType] = useState('All Types');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchClearances()
      .then((clearanceData) => setClearances(clearanceData))
      .catch(() => setError('Unable to load report data. Please sign in again.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredRequests = useMemo(() => clearances.filter((item) => {
    const date = parseDate(dateOf(item));
    const start = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const end = toDate ? new Date(`${toDate}T23:59:59.999`) : null;
    return (!start || (date && date >= start)) && (!end || (date && date <= end))
      && (campus === 'All Campuses' || campusOf(item) === campus)
      && (department === 'All Departments' || departmentOf(item) === department)
      && (reportType === 'All Types' || statusOf(item) === reportType);
  }), [clearances, fromDate, toDate, campus, department, reportType]);
  const statusCounts = useMemo(() => filteredRequests.reduce((counts, item) => {
    const status = statusOf(item);
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {}), [filteredRequests]);
  const campuses = [...new Set(clearances.map(campusOf))].sort();
  const departments = [...new Set(clearances.map(departmentOf))].sort();
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const visibleRequests = filteredRequests.slice((page - 1) * pageSize, page * pageSize);
  const pendingRequests = filteredRequests.filter((item) => statusOf(item) === 'Pending').slice(0, 5);
  const overdueRequests = filteredRequests.filter((item) => statusOf(item) === 'Overdue').slice(0, 5);
  const statusData = ['Completed', 'In Progress', 'Pending', 'Rejected', 'Overdue']
    .map((name) => ({ name, value: statusCounts[name] || 0, color: STATUS_COLORS[name] }))
    .filter((entry) => entry.value > 0);
  const campusData = Object.entries(filteredRequests.reduce((counts, item) => {
    const name = campusOf(item);
    counts[name] = (counts[name] || 0) + 1;
    return counts;
  }, {})).map(([name, value], index) => ({
    name,
    value,
    color: ['#2563eb', '#10b981', '#a855f7', '#f59e0b', '#ef4444'][index % 5],
  })).sort((a, b) => b.value - a.value).slice(0, 5);
  const departmentRequestData = useMemo(() => Object.entries(filteredRequests.reduce((counts, item) => {
    const name = departmentOf(item);
    counts[name] = (counts[name] || 0) + 1;
    return counts;
  }, {})).map(([name, requests]) => ({ name, requests }))
    .sort((first, second) => second.requests - first.requests)
    .slice(0, 10), [filteredRequests]);
  const reasonData = useMemo(() => Object.entries(filteredRequests.reduce((counts, item) => {
    const reason = reasonOf(item);
    counts[reason] = (counts[reason] || 0) + 1;
    return counts;
  }, {})).map(([name, value], index) => ({
    name,
    value,
    color: ['#2563eb', '#10b981', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4'][index % 6],
  })).sort((first, second) => second.value - first.value).slice(0, 8), [filteredRequests]);
  const bottleneckData = useMemo(() => {
    const durationsByOffice = new Map();
    filteredRequests.forEach((request) => {
      const requestedAt = parseDate(dateOf(request));
      if (!requestedAt) return;
      let previousDate = requestedAt;
      officeDecisionDates(request).forEach((step) => {
        const days = (step.date - previousDate) / 86400000;
        if (days >= 0) {
          const durations = durationsByOffice.get(step.office) || [];
          durations.push(days);
          durationsByOffice.set(step.office, durations);
        }
        previousDate = step.date;
      });
    });
    return [...durationsByOffice.entries()].map(([name, durations]) => ({
      name,
      averageDays: durations.reduce((total, days) => total + days, 0) / durations.length,
      decisions: durations.length,
    })).sort((first, second) => second.averageDays - first.averageDays).slice(0, 8);
  }, [filteredRequests]);
  const monthlyData = useMemo(() => {
    const months = new Map();
    filteredRequests.forEach((item) => {
      const date = parseDate(dateOf(item));
      if (!date) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!months.has(key)) {
        months.set(key, {
          month: date.toLocaleString('en', { month: 'short', year: '2-digit' }),
          Completed: 0,
          'In Progress': 0,
          Pending: 0,
          Rejected: 0,
        });
      }
      const status = statusOf(item);
      if (months.get(key)[status] !== undefined) months.get(key)[status] += 1;
    });
    if (!fromDate && !toDate) {
      const year = new Date().getFullYear();
      for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
        const key = `${year}-${monthIndex}`;
        if (!months.has(key)) {
          months.set(key, {
            month: new Date(year, monthIndex, 1).toLocaleString('en', { month: 'short', year: '2-digit' }),
            Completed: 0,
            'In Progress': 0,
            Pending: 0,
            Rejected: 0,
          });
        }
      }
    }
    return [...months.entries()]
      .sort(([first], [second]) => {
        const [firstYear, firstMonth] = first.split('-').map(Number);
        const [secondYear, secondMonth] = second.split('-').map(Number);
        return firstYear - secondYear || firstMonth - secondMonth;
      })
      .map(([, value]) => value);
  }, [filteredRequests, fromDate, toDate]);
  const completedDurations = filteredRequests.flatMap((item) => {
    const requested = parseDate(dateOf(item));
    const completed = parseDate(item.completionDate || item.relievingDate);
    if (statusOf(item) !== 'Completed' || !requested || !completed || completed < requested) return [];
    return [(completed - requested) / 86400000];
  });
  const averageCompletionDays = completedDurations.length
    ? (completedDurations.reduce((total, days) => total + days, 0) / completedDurations.length).toFixed(1)
    : null;
  const completionRate = filteredRequests.length
    ? Math.round(((statusCounts.Completed || 0) / filteredRequests.length) * 100)
    : 0;
  const formatDate = (value) => parseDate(value)?.toLocaleDateString() || '-';
  const resetPage = (setter, value) => {
    setter(value);
    setPage(1);
  };
  const applyDatePreset = (preset) => {
    setDatePreset(preset);
    if (preset === 'All time') {
      setFromDate('');
      setToDate('');
      setPage(1);
      return;
    }
    if (preset === 'Custom date range') {
      setPage(1);
      return;
    }
    const today = new Date();
    let start;
    let end = today;
    if (preset === 'Today') {
      start = today;
    } else if (preset === 'This month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (preset === 'This year') {
      start = new Date(today.getFullYear(), 0, 1);
    } else {
      setPage(1);
      return;
    }
    setFromDate(formatInputDate(start));
    setToDate(formatInputDate(end));
    setPage(1);
  };
  const exportReport = (format) => {
    if (format === 'pdf' || format === 'print') {
      window.print();
      return;
    }
    const rows = [
      ['Employee Name', 'Employee ID', 'Department', 'Request Date', 'Status'],
      ...filteredRequests.map((item) => [nameOf(item), item.employeeId || '-', departmentOf(item), formatDate(dateOf(item)), statusOf(item)]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'admin-clearance-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="space-y-3 bg-slate-50 p-3 text-[11px] text-slate-800 sm:p-4">
      <section className="flex flex-col gap-3 rounded-lg border border-blue-100 bg-white p-3 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-2">
          <BarChart3 size={22} className="mt-0.5 shrink-0 text-blue-600" />
          <div>
            <h1 className="text-base font-bold text-blue-800">{t('System Admin Dashboard - Reports')}</h1>
            <p className="mt-0.5 text-[10px] text-slate-500">{t('View and analyze clearance reports and statistics')}</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:items-end">
          <FilterField label={t('Reporting Period')}>
            <select value={datePreset} onChange={(event) => applyDatePreset(event.target.value)} className="control">
              {['All time', 'Custom date range', 'Today', 'This month', 'This year'].map((value) => <option key={value} value={value}>{t(value)}</option>)}
            </select>
          </FilterField>
          <FilterField label="Campus">
            <select value={campus} onChange={(event) => resetPage(setCampus, event.target.value)} className="control">
              <option value="All Campuses">{t('All Campuses')}</option>{campuses.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </FilterField>
          <FilterField label="Department">
            <select value={department} onChange={(event) => resetPage(setDepartment, event.target.value)} className="control">
              <option value="All Departments">{t('All Departments')}</option>{departments.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </FilterField>
          <FilterField label="Report Type">
            <select value={reportType} onChange={(event) => resetPage(setReportType, event.target.value)} className="control">
              {STATUS_FILTERS.map((value) => <option key={value} value={value}>{t(value)}</option>)}
            </select>
          </FilterField>
          <FilterField label="Date Range">
            <div className="flex gap-1">
              <input aria-label={t('From date')} type="date" value={fromDate} onChange={(event) => { setDatePreset('Custom date range'); resetPage(setFromDate, event.target.value); }} className="control min-w-0" />
              <input aria-label={t('To date')} type="date" value={toDate} onChange={(event) => { setDatePreset('Custom date range'); resetPage(setToDate, event.target.value); }} className="control min-w-0" />
            </div>
          </FilterField>
          <button type="button" onClick={() => setMessage(`${filteredRequests.length} requests included in this report.`)} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700">
            <FileText size={14} /> {t('Generate Report')}
          </button>
        </div>
      </section>

      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">{message}</p>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Panel title={t('Clearance Status Distribution')}>
          {statusData.length ? (
            <div className="flex min-h-[132px] items-center justify-center gap-2">
              <div className="relative h-28 w-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius="57%" outerRadius="84%" paddingAngle={2}>
                      {statusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <strong className="text-lg text-blue-900">{filteredRequests.length}</strong>
                  <span className="text-[9px] text-slate-500">Total Requests</span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                {['Completed', 'In Progress', 'Pending', 'Rejected', 'Overdue'].map((status) => (
                  <div key={status} className="flex items-center justify-between gap-1 text-[9px]">
                    <span className="flex min-w-0 items-center gap-1"><i className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />                    <span className="truncate">{t(status)}</span></span>
                    <strong className="shrink-0">{statusCounts[status] || 0} ({filteredRequests.length ? Math.round(((statusCounts[status] || 0) / filteredRequests.length) * 100) : 0}%)</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : <EmptyMessage loading={loading} />}
        </Panel>

        <Panel title={t('Monthly Clearance Trend')}>
          <div className="h-[132px]">
            {loading ? <EmptyMessage loading={loading} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData} margin={{ top: 8, right: 6, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 8 }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} domain={[0, (maxValue) => Math.max(maxValue, 1)]} tick={{ fontSize: 8 }} width={26} />
                  <Tooltip />
                  <Line type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={1.5} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="In Progress" stroke="#3b82f6" strokeWidth={1.5} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="Pending" stroke="#f59e0b" strokeWidth={1.5} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="Rejected" stroke="#ef4444" strokeWidth={1.5} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel title={t('Requests by Campus')}>
          {campusData.length ? (
            <div className="flex min-h-[132px] items-center justify-center gap-2">
              <div className="relative h-28 w-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={campusData} dataKey="value" nameKey="name" innerRadius="57%" outerRadius="84%" paddingAngle={2}>
                      {campusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <strong className="text-sm text-blue-900">{filteredRequests.length}</strong>
                  <span className="text-[8px] text-slate-500">Total</span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                {campusData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between gap-1 text-[9px]">
                    <span className="flex min-w-0 items-center gap-1"><i className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} /><span className="truncate">{entry.name}</span></span>
                    <strong className="shrink-0">{entry.value} ({Math.round((entry.value / filteredRequests.length) * 100)}%)</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : <EmptyMessage loading={loading} />}
        </Panel>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <Panel title={t('Clearance Requests by Department')}>
          {loading || departmentRequestData.length ? (
            <div className="h-56">
              {loading ? <EmptyMessage loading /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentRequestData} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 9 }} />
                    <YAxis type="category" dataKey="name" width={112} tick={{ fontSize: 8 }} />
                    <Tooltip />
                    <Bar dataKey="requests" name={t('Requests')} fill="#2563eb" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          ) : <EmptyMessage loading={false} />}
        </Panel>

        <Panel title={t('Department Bottleneck Analysis')}>
          {loading || bottleneckData.length ? (
            <div className="h-56">
              {loading ? <EmptyMessage loading /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bottleneckData} layout="vertical" margin={{ top: 4, right: 18, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(value) => `${value.toFixed(1)}d`} />
                    <YAxis type="category" dataKey="name" width={112} tick={{ fontSize: 8 }} />
                    <Tooltip formatter={(value, _name, item) => [`${Number(value).toFixed(1)} days (${item.payload.decisions} decisions)`, t('Average decision time')]} />
                    <Bar dataKey="averageDays" name={t('Average days')} fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          ) : <EmptyMessage loading={false} />}
        </Panel>

        <Panel title={t('Clearance Reason Breakdown')}>
          {loading || reasonData.length ? (
            <div className="flex h-56 items-center justify-center gap-2">
              {loading ? <EmptyMessage loading /> : (
                <>
                  <div className="h-44 w-44 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={reasonData} dataKey="value" nameKey="name" innerRadius="48%" outerRadius="78%" paddingAngle={2}>
                          {reasonData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {reasonData.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between gap-1 text-[9px]">
                        <span className="flex min-w-0 items-center gap-1"><i className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} /><span className="truncate">{entry.name}</span></span>
                        <strong className="shrink-0">{entry.value}</strong>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : <EmptyMessage loading={false} />}
        </Panel>
      </section>

      <section>
        <Panel title={t('Quick Actions')}>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/employees" className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"><Users size={14} className="text-blue-600" />{t('View All Employees')}</Link>
            <button type="button" onClick={() => exportReport('pdf')} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"><FileDown size={14} className="text-red-500" />Export PDF</button>
            <button type="button" onClick={() => exportReport('excel')} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"><FileSpreadsheet size={14} className="text-emerald-600" />Export Excel</button>
            <button type="button" onClick={() => exportReport('print')} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"><Printer size={14} className="text-blue-600" />Print Report</button>
          </div>
        </Panel>
      </section>

      <section className="grid gap-3 xl:grid-cols-12">
        <Panel title="Employee Clearance Status Report" action={<span className="text-[10px] text-blue-600">View All</span>} className="xl:col-span-7">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[10px]">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="p-2">#</th><th className="p-2">Employee ID</th><th className="p-2">Employee Name</th><th className="p-2">Department</th><th className="p-2">Request Date</th><th className="p-2">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <TableMessage columns={6} text="Loading report data..." /> : visibleRequests.length === 0 ? <TableMessage columns={6} text="No requests match the selected filters." /> : visibleRequests.map((item, index) => (
                  <tr key={item._id || item.requestId || `${dateOf(item)}-${index}`} className="hover:bg-slate-50">
                    <td className="p-2 text-slate-400">{(page - 1) * pageSize + index + 1}</td>
                    <td className="p-2">{item.employeeId || '-'}</td><td className="p-2 font-medium">{nameOf(item)}</td>
                    <td className="p-2">{departmentOf(item)}</td><td className="p-2">{formatDate(dateOf(item))}</td>
                    <td className="p-2"><StatusBadge status={statusOf(item)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-200 px-3 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft size={15} /> Previous
              </button>
              <span className="whitespace-nowrap px-1 font-medium">Page {page} of {totalPages}</span>
              <button type="button" aria-label="Next page" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="inline-flex h-9 items-center gap-1 rounded-md bg-blue-600 px-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
                Next <ChevronRight size={15} />
              </button>
            </div>
            <label className="flex items-center gap-2 whitespace-nowrap">
              Show
              <select
                aria-label="Rows per page"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
              of {filteredRequests.length}
            </label>
          </div>
        </Panel>

        <Panel title="Pending Clearance Report" action={<span className="text-[10px] text-blue-600">Top 5</span>} className="xl:col-span-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[430px] text-left text-[10px]">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="p-2">#</th><th className="p-2">Employee Name</th><th className="p-2">Department</th><th className="p-2">Request Date</th><th className="p-2">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <TableMessage columns={5} text="Loading report data..." /> : pendingRequests.length === 0 ? <TableMessage columns={5} text="No pending requests." /> : pendingRequests.map((item, index) => (
                  <tr key={item._id || item.requestId || index} className="hover:bg-slate-50">
                    <td className="p-2 text-slate-400">{index + 1}</td><td className="p-2 font-medium">{nameOf(item)}</td>
                    <td className="p-2">{departmentOf(item)}</td><td className="p-2">{formatDate(dateOf(item))}</td>
                    <td className="p-2"><StatusBadge status={statusOf(item)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <Panel title="Overdue Clearance Report" action={<span className="text-[10px] text-blue-600">{statusCounts.Overdue || 0} total</span>}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-[10px]">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="p-2">Employee Name</th><th className="p-2">Department</th><th className="p-2">Request Date</th><th className="p-2">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <TableMessage columns={4} text="Loading report data..." /> : overdueRequests.length === 0 ? <TableMessage columns={4} text="No requests are marked overdue." /> : overdueRequests.map((item, index) => (
                  <tr key={item._id || item.requestId || index}>
                    <td className="p-2 font-medium">{nameOf(item)}</td><td className="p-2">{departmentOf(item)}</td>
                    <td className="p-2">{formatDate(dateOf(item))}</td><td className="p-2"><StatusBadge status={statusOf(item)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Performance Report">
          <div className="space-y-3">
            <PerformanceRow label="Completion Rate" value={`${completionRate}%`} percent={completionRate} color="bg-emerald-500" />
            <PerformanceRow label="Completed Requests" value={statusCounts.Completed || 0} percent={completionRate} color="bg-blue-500" />
            <PerformanceRow label="Average Completion Time" value={averageCompletionDays ? `${averageCompletionDays} days` : '—'} />
            <PerformanceRow label="Pending Requests" value={statusCounts.Pending || 0} />
            <PerformanceRow label="Overdue Requests" value={statusCounts.Overdue || 0} />
          </div>
        </Panel>
      </section>

      <p className="flex items-center justify-end gap-1 text-[9px] text-slate-400"><CalendarDays size={11} /> Report reflects the selected filters.</p>
    </main>
  );
}

function FilterField({ label, children }) {
  return <label className="block min-w-32 text-[9px] font-semibold text-slate-500">{label}<span className="mt-1 block">{children}</span></label>;
}

function Panel({ title, action, className = '', children }) {
  return (
    <section className={`min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${className}`}>
      <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2"><h2 className="font-bold text-blue-900">{title}</h2>{action}</div>
      {children}
    </section>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Pending: 'bg-amber-100 text-amber-700',
    'In Progress': 'bg-blue-100 text-blue-700',
    Completed: 'bg-emerald-100 text-emerald-700',
    Rejected: 'bg-red-100 text-red-700',
    Overdue: 'bg-purple-100 text-purple-700',
  };
  return <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-semibold ${styles[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;
}

function TableMessage({ columns, text }) {
  return <tr><td colSpan={columns} className="p-5 text-center text-slate-400">{text}</td></tr>;
}

function EmptyMessage({ loading }) {
  return <div className="flex h-40 items-center justify-center text-slate-400">{loading ? 'Loading report data...' : 'No data for the selected filters.'}</div>;
}

function PerformanceRow({ label, value, percent, color }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-[10px]"><span className="text-slate-600">{label}</span><strong className="whitespace-nowrap text-blue-900">{value}</strong></div>
      {percent !== undefined && <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} /></div>}
    </div>
  );
}
