import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  BarChart3, CalendarDays, CheckCircle2, CircleDollarSign, Clock3, Download,
  Eye, FileSpreadsheet, Printer, Search, Timer, TrendingUp, Users, XCircle,
} from 'lucide-react';
import { getEmployeeHeaders } from '../../until/EmployeeHelper';

const API_URL = 'http://localhost:3000/api/reports/hr-clearance';
const AUDIT_API_URL = 'http://localhost:3000/api/audit-logs';
const STATUS_COLORS = {
  Approved: '#16a56b',
  Completed: '#16a56b',
  Pending: '#f2b533',
  'In Progress': '#4385e8',
  Rejected: '#ef5350',
  Returned: '#ef5350',
  Cancelled: '#94a3b8',
};
const CHART_COLORS = ['#3b82f6', '#14b8a6', '#f59e0b', '#a855f7', '#ef4444', '#64748b'];
const CONTROL_CLASS = 'h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const ACTION_CLASS = 'inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60';

const formatDate = (value, options) => {
  if (!value || value === '-') return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, options);
};

const normalizeStatus = (status) => {
  const value = String(status || 'Pending').trim().toLowerCase();
  if (['completed', 'approved', 'cleared'].includes(value)) return 'Approved';
  if (['in progress', 'under review'].includes(value)) return 'In Progress';
  if (['rejected'].includes(value)) return 'Rejected';
  if (['returned', 'on hold'].includes(value)) return 'Returned';
  if (['cancelled', 'canceled'].includes(value)) return 'Cancelled';
  return 'Pending';
};

const departmentName = (value) => {
  if (typeof value === 'string') return value;
  return value?.name || '';
};

const requestReport = async (filters) => {
  const response = await axios.get(API_URL, {
    headers: getEmployeeHeaders(),
    params: { ...filters, campus: 'All Campuses', clearanceType: 'All Types', reportType: 'Summary' },
  });
  if (!Array.isArray(response.data?.rows)) {
    throw new Error(response.data?.message || 'The HR report API returned an invalid response.');
  }
  return { summary: response.data.summary || {}, rows: response.data.rows };
};

const groupOutstandingItems = (rows) => {
  const groups = new Map([
    ['Property', new Set()],
    ['Finance', new Set()],
    ['Library', new Set()],
    ['Other', new Set()],
  ]);
  let fineTotal = 0;
  let fineRequests = 0;

  rows.forEach((row) => {
    const amount = Number(row.outstandingFineAmount) || 0;
    if (amount > 0) {
      fineTotal += amount;
      fineRequests += 1;
    }
    (Array.isArray(row.outstandingItems) ? row.outstandingItems : []).forEach((item) => {
      const label = String(item || '').trim();
      if (!label) return;
      const value = label.toLowerCase();
      const type = /book|library|fine|borrow/.test(value)
        ? 'Library'
        : /loan|finance|advance|payment|debt/.test(value)
          ? 'Finance'
          : /property|asset|laptop|chair|equipment/.test(value)
            ? 'Property'
            : 'Other';
      groups.get(type).add(label);
    });
  });

  if (fineTotal > 0) groups.get('Library').add(`${fineRequests} request(s) with an outstanding fine`);
  return [...groups.entries()]
    .filter(([, items]) => items.size > 0)
    .map(([name, items]) => ({
      name,
      count: items.size,
      details: name === 'Library' && fineTotal > 0
        ? `${fineTotal.toLocaleString()} ETB outstanding`
        : [...items].slice(0, 2).join(', ') + (items.size > 2 ? ', …' : ''),
    }));
};

export default function HRReport() {
  const navigate = useNavigate();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [department, setDepartment] = useState('All Departments');
  const [status, setStatus] = useState('All Statuses');
  const [searchTerm, setSearchTerm] = useState('');
  const [report, setReport] = useState({ summary: {}, rows: [] });
  const [auditLogs, setAuditLogs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(true);
  const [error, setError] = useState('');
  const [auditError, setAuditError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadReport = async (filters = {
    fromDate, toDate, department, status,
  }) => {
    setLoading(true);
    setError('');
    try {
      const nextReport = await requestReport(filters);
      setReport(nextReport);
      setLastUpdated(new Date());
      setDepartments((current) => [...new Set([
        ...current,
        ...nextReport.rows.map((row) => departmentName(row.department)).filter(Boolean),
      ])].sort());
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to load the HR clearance report.');
      setReport({ summary: {}, rows: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    requestReport({
      fromDate: '',
      toDate: '',
      department: 'All Departments',
      status: 'All Statuses',
    }).then((nextReport) => {
      if (!active) return;
      setReport(nextReport);
      setLastUpdated(new Date());
      setDepartments([...new Set(nextReport.rows.map((row) => departmentName(row.department)).filter(Boolean))].sort());
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || requestError.message || 'Unable to load the HR clearance report.');
    }).finally(() => {
      if (active) setLoading(false);
    });

    axios.get(AUDIT_API_URL, { headers: getEmployeeHeaders(), params: { limit: 5 } })
      .then((response) => {
        if (active) setAuditLogs(Array.isArray(response.data?.data) ? response.data.data : []);
      })
      .catch((requestError) => {
        if (active) setAuditError(requestError.response?.data?.message || 'Unable to load recent activity.');
      })
      .finally(() => {
        if (active) setAuditLoading(false);
      });

    return () => { active = false; };
  }, []);

  const rows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return report.rows;
    return report.rows.filter((row) => [
      row.employeeName, row.employeeId, row.employeeEmail, row.employeePhone,
      row.department, row.requestId,
    ].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [report.rows, searchTerm]);

  const statusCounts = useMemo(() => rows.reduce((counts, row) => {
    const key = normalizeStatus(row.status);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {}), [rows]);

  const statusData = ['Approved', 'Pending', 'In Progress', 'Rejected', 'Returned']
    .map((name) => ({ name, value: statusCounts[name] || 0, color: STATUS_COLORS[name] }));

  const reasonData = useMemo(() => {
    const groups = rows.reduce((result, row) => {
      const reason = row.reason || row.clearanceType || 'Unspecified';
      result[reason] = (result[reason] || 0) + 1;
      return result;
    }, {});
    return Object.entries(groups).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [rows]);

  const departmentData = useMemo(() => {
    const groups = rows.reduce((result, row) => {
      const name = departmentName(row.department) || 'Unassigned';
      const key = normalizeStatus(row.status);
      result[name] ||= { name, Approved: 0, Pending: 0, Rejected: 0 };
      if (key === 'Approved') result[name].Approved += 1;
      else if (key === 'Rejected' || key === 'Returned') result[name].Rejected += 1;
      else result[name].Pending += 1;
      return result;
    }, {});
    return Object.values(groups).sort((a, b) => (
      b.Approved + b.Pending + b.Rejected - (a.Approved + a.Pending + a.Rejected)
    )).slice(0, 8);
  }, [rows]);

  const monthlyData = useMemo(() => {
    const groups = rows.reduce((result, row) => {
      const date = new Date(row.requestDate || row.submittedDate);
      if (Number.isNaN(date.getTime())) return result;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      result[key] ||= {
        key,
        month: date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
        Requests: 0,
        Approved: 0,
      };
      result[key].Requests += 1;
      if (normalizeStatus(row.status) === 'Approved') result[key].Approved += 1;
      return result;
    }, {});
    return Object.values(groups).sort((a, b) => a.key.localeCompare(b.key)).slice(-12);
  }, [rows]);

  const outstandingRows = useMemo(() => groupOutstandingItems(rows), [rows]);
  const pendingRows = useMemo(() => rows.filter((row) => (
    ['Pending', 'In Progress'].includes(normalizeStatus(row.status))
  )).sort((a, b) => new Date(a.requestDate || a.submittedDate) - new Date(b.requestDate || b.submittedDate)), [rows]);

  const pendingCount = (statusCounts.Pending || 0) + (statusCounts['In Progress'] || 0);

  const resetFilters = () => {
    setFromDate('');
    setToDate('');
    setDepartment('All Departments');
    setStatus('All Statuses');
    setSearchTerm('');
    void loadReport({ fromDate: '', toDate: '', department: 'All Departments', status: 'All Statuses' });
  };

  const exportExcel = () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['HR Clearance Report'],
      ['Generated', new Date().toLocaleString()],
      ['Total requests', rows.length],
      ['Pending', statusCounts.Pending || 0],
      ['In progress', statusCounts['In Progress'] || 0],
      ['Approved', statusCounts.Approved || 0],
      ['Rejected', statusCounts.Rejected || 0],
    ]), 'Summary');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.map((row) => ({
      'Request ID': row.requestId,
      'Employee ID': row.employeeId,
      'Employee Name': row.employeeName,
      Department: departmentName(row.department),
      'Current Stage': row.currentOffice,
      'Submitted Date': formatDate(row.requestDate || row.submittedDate),
      Status: row.status,
      Reason: row.reason || row.clearanceType,
      'Outstanding Items': (row.outstandingItems || []).join('; '),
      'Outstanding Fine (ETB)': row.outstandingFineAmount || 0,
    }))), 'Clearance Requests');
    XLSX.writeFile(workbook, 'hr-clearance-report.xlsx');
  };

  const exportPdf = () => {
    const document = new jsPDF({ orientation: 'landscape' });
    document.setFontSize(16);
    document.text('HR Clearance Report', 14, 16);
    document.setFontSize(9);
    document.text(
      `Generated ${new Date().toLocaleString()}  |  Requests: ${rows.length}  |  Pending: ${pendingCount}  |  Approved: ${statusCounts.Approved || 0}`,
      14, 23,
    );
    autoTable(document, {
      startY: 29,
      head: [['Request ID', 'Employee ID', 'Employee Name', 'Department', 'Current Stage', 'Submitted', 'Status']],
      body: rows.map((row) => [
        row.requestId || '—',
        row.employeeId || '—',
        row.employeeName || '—',
        departmentName(row.department) || '—',
        row.currentOffice || '—',
        formatDate(row.requestDate || row.submittedDate),
        row.status || 'Pending',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
    });
    document.save('hr-clearance-report.pdf');
  };

  const statCards = [
    { title: 'Total Requests', value: rows.length, icon: <Users size={18} />, tone: 'blue', subtitle: 'In selected report' },
    { title: 'Pending', value: statusCounts.Pending || 0, icon: <Clock3 size={18} />, tone: 'amber', subtitle: 'Awaiting review' },
    { title: 'Approved', value: statusCounts.Approved || 0, icon: <CheckCircle2 size={18} />, tone: 'green', subtitle: 'Completed clearances' },
    { title: 'Rejected', value: statusCounts.Rejected || 0, icon: <XCircle size={18} />, tone: 'red', subtitle: 'Rejected requests' },
    { title: 'In Progress', value: statusCounts['In Progress'] || 0, icon: <Timer size={18} />, tone: 'purple', subtitle: 'Currently processing' },
  ];

  return (
    <main className="min-h-full space-y-3 bg-slate-50 p-3 text-xs text-slate-800 sm:p-5 print:bg-white">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-slate-500">HR Officer / Reports</p>
            <h1 className="mt-1 text-xl font-bold text-slate-900">Reports</h1>
            <p className="mt-1 text-xs text-slate-500">View and analyze clearance activity using live system records.</p>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarDays size={14} />
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : new Date().toLocaleDateString()}
          </p>
        </div>

        <form className="grid items-end gap-2 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto_auto]" onSubmit={(event) => { event.preventDefault(); void loadReport(); }}>
          <label className="block text-[11px] font-medium text-slate-600">
            From
            <input aria-label="From date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className={`${CONTROL_CLASS} mt-1`} />
          </label>
          <label className="block text-[11px] font-medium text-slate-600">
            To
            <input aria-label="To date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className={`${CONTROL_CLASS} mt-1`} />
          </label>
          <label className="block text-[11px] font-medium text-slate-600">
            Department
            <select value={department} onChange={(event) => setDepartment(event.target.value)} className={`${CONTROL_CLASS} mt-1`}>
              <option>All Departments</option>
              {departments.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
          <label className="block text-[11px] font-medium text-slate-600">
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={`${CONTROL_CLASS} mt-1`}>
              {['All Statuses', 'Pending', 'In Progress', 'Approved', 'Completed', 'Rejected', 'Returned'].map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <button type="submit" disabled={loading} className={`${ACTION_CLASS} bg-blue-700 text-white hover:bg-blue-800`}>
            <BarChart3 size={15} />Apply
          </button>
          <button type="button" onClick={resetFilters} disabled={loading} className={`${ACTION_CLASS} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>
            Reset
          </button>
        </form>
      </section>

      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {auditError && <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">{auditError}</p>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-5">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} value={loading ? '—' : Number(card.value).toLocaleString()} />
        ))}
      </section>

      <section className="grid gap-3 xl:grid-cols-3">
        <Panel title="Clearance Status Overview">
          {loading ? <EmptyMessage>Loading report data…</EmptyMessage> : rows.length ? (
            <div className="flex min-h-52 flex-wrap items-center justify-center gap-3">
              <div className="relative h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData.filter((item) => item.value > 0)} dataKey="value" nameKey="name" innerRadius="56%" outerRadius="84%" paddingAngle={2}>
                      {statusData.filter((item) => item.value > 0).map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <strong className="text-2xl text-slate-900">{rows.length}</strong>
                  <span className="text-[11px] text-slate-500">Total Requests</span>
                </div>
              </div>
              <div className="min-w-40 flex-1 space-y-2">
                {statusData.filter((item) => item.value > 0).map((item) => (
                  <LegendRow key={item.name} name={item.name} value={item.value} total={rows.length} color={item.color} />
                ))}
              </div>
            </div>
          ) : <EmptyMessage>No clearance records match these filters.</EmptyMessage>}
        </Panel>

        <Panel title="Department-wise Status">
          {loading ? <EmptyMessage>Loading report data…</EmptyMessage> : departmentData.length ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData} margin={{ top: 8, right: 8, left: -22, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-18} textAnchor="end" height={48} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="Approved" stackId="status" fill="#16a56b" />
                  <Bar dataKey="Pending" stackId="status" fill="#f2b533" />
                  <Bar dataKey="Rejected" stackId="status" fill="#ef5350" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyMessage>No department data available.</EmptyMessage>}
        </Panel>

        <Panel title="Separation Reason Report">
          {loading ? <EmptyMessage>Loading report data…</EmptyMessage> : reasonData.length ? (
            <div className="flex min-h-52 flex-wrap items-center justify-center gap-2">
              <div className="h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={reasonData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="82%" paddingAngle={2}>
                      {reasonData.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="min-w-32 flex-1 space-y-2">
                {reasonData.slice(0, 6).map((entry, index) => (
                  <LegendRow key={entry.name} name={entry.name} value={entry.value} total={rows.length} color={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </div>
            </div>
          ) : <EmptyMessage>No separation reasons available.</EmptyMessage>}
        </Panel>
      </section>

      <section className="grid gap-3 xl:grid-cols-12">
        <Panel title="Monthly / Yearly Report" className="xl:col-span-5">
          {loading ? <EmptyMessage>Loading report data…</EmptyMessage> : monthlyData.length ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="Requests" fill="#4385e8" radius={[3, 3, 0, 0]} />
                  <Line dataKey="Approved" stroke="#16a56b" strokeWidth={2} dot={{ r: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyMessage>No dated requests available.</EmptyMessage>}
        </Panel>

        <Panel title="Audit Log (Recent)" className="xl:col-span-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-left text-[10px]">
              <thead className="bg-slate-50 text-slate-600">
                <tr><th className="p-2">Date &amp; Time</th><th className="p-2">User</th><th className="p-2">Action</th><th className="p-2">Details</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLoading ? <TableMessage colSpan={4}>Loading activity…</TableMessage> : auditLogs.length ? auditLogs.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap p-2">{formatDate(entry.date, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td className="p-2">{entry.user || 'Unknown user'}</td>
                    <td className="p-2">{entry.action || '—'}</td>
                    <td className="max-w-36 truncate p-2" title={entry.description || entry.module}>{entry.description || entry.module || '—'}</td>
                  </tr>
                )) : <TableMessage colSpan={4}>No recent audit activity.</TableMessage>}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Outstanding Liabilities" className="xl:col-span-3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[240px] text-left text-[10px]">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="p-2">Type</th><th className="p-2">Count</th><th className="p-2">Details</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <TableMessage colSpan={3}>Loading…</TableMessage> : outstandingRows.length ? outstandingRows.map((item) => (
                  <tr key={item.name}>
                    <td className="p-2 font-medium">{item.name}</td>
                    <td className="p-2">{item.count}</td>
                    <td className="max-w-28 truncate p-2" title={item.details}>{item.details}</td>
                  </tr>
                )) : <TableMessage colSpan={3}>No outstanding liabilities recorded.</TableMessage>}
              </tbody>
            </table>
          </div>
          <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-500"><CircleDollarSign size={13} />Based on outstanding items and fines in clearance records.</p>
        </Panel>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><CalendarDays size={16} /></span>
            <div><h2 className="text-sm font-bold text-slate-900">Pending Clearances</h2><p className="text-[10px] text-slate-500">{pendingRows.length} pending or in-progress request(s)</p></div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
            <label className="relative min-w-52 flex-1 lg:flex-none">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input aria-label="Search clearance requests" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by employee name or ID…" className="h-8 w-full rounded-md border border-slate-200 pl-8 pr-2 text-[11px] outline-none focus:border-blue-500" />
            </label>
            <button type="button" onClick={exportPdf} disabled={loading || rows.length === 0} className={`${ACTION_CLASS} h-8 bg-red-50 px-2.5 text-red-700 hover:bg-red-100`}>
              <Download size={13} />Export PDF
            </button>
            <button type="button" onClick={exportExcel} disabled={loading || rows.length === 0} className={`${ACTION_CLASS} h-8 bg-emerald-50 px-2.5 text-emerald-700 hover:bg-emerald-100`}>
              <FileSpreadsheet size={13} />Export Excel
            </button>
            <button type="button" onClick={() => window.print()} className={`${ACTION_CLASS} h-8 bg-slate-100 px-2.5 text-slate-700 hover:bg-slate-200 print:hidden`}>
              <Printer size={13} />Print
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-[10px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-2.5">#</th><th className="p-2.5">Employee Name</th><th className="p-2.5">ID</th>
                <th className="p-2.5">Department</th><th className="p-2.5">Current Stage</th>
                <th className="p-2.5">Days Pending</th><th className="p-2.5">Submitted Date</th><th className="p-2.5">Status</th><th className="p-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <TableMessage colSpan={9}>Loading clearance requests…</TableMessage> : pendingRows.length ? pendingRows.map((row, index) => {
                const date = new Date(row.requestDate || row.submittedDate);
                const daysPending = Number.isNaN(date.getTime()) ? '—' : Math.max(0, Math.floor((new Date().getTime() - date.getTime()) / 86400000));
                const currentStatus = normalizeStatus(row.status);
                return (
                  <tr key={row.id || row.requestId} className="hover:bg-slate-50">
                    <td className="p-2.5 text-slate-400">{index + 1}</td>
                    <td className="p-2.5 font-medium text-slate-800">{row.employeeName || 'Unknown employee'}</td>
                    <td className="p-2.5">{row.employeeId || '—'}</td>
                    <td className="p-2.5">{departmentName(row.department) || '—'}</td>
                    <td className="p-2.5">{row.currentOffice || '—'}</td>
                    <td className="p-2.5">{daysPending}</td>
                    <td className="whitespace-nowrap p-2.5">{formatDate(row.requestDate || row.submittedDate)}</td>
                    <td className="p-2.5"><StatusBadge status={currentStatus} /></td>
                    <td className="p-2.5">
                      <button type="button" onClick={() => navigate('/hr-office/clearance-requests')} className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline">
                        <Eye size={12} />View
                      </button>
                    </td>
                  </tr>
                );
              }) : <TableMessage colSpan={9}>{rows.length ? 'No pending clearances match this search.' : 'No clearance requests found.'}</TableMessage>}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
          <p>Showing {pendingRows.length ? 1 : 0}–{pendingRows.length} of {pendingRows.length} pending clearances</p>
          <p><TrendingUp size={13} className="mr-1 inline text-blue-600" />{lastUpdated ? `Report updated ${lastUpdated.toLocaleString()}` : 'Live report data'}</p>
        </div>
      </section>
    </main>
  );
}

function StatCard({ title, value, icon, tone, subtitle }) {
  const tones = {
    blue: 'border-blue-100 bg-blue-50 text-blue-800',
    amber: 'border-amber-100 bg-amber-50 text-amber-800',
    green: 'border-emerald-100 bg-emerald-50 text-emerald-800',
    red: 'border-red-100 bg-red-50 text-red-800',
    purple: 'border-violet-100 bg-violet-50 text-violet-800',
  };
  return (
    <article className={`flex min-h-20 items-center gap-3 rounded-lg border p-3 ${tones[tone]}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80">{icon}</span>
      <div className="min-w-0"><h2 className="text-[11px] font-semibold">{title}</h2><p className="mt-1 text-xl font-bold leading-none">{value}</p><p className="mt-1 text-[10px] opacity-75">{subtitle}</p></div>
    </article>
  );
}

function Panel({ title, className = '', children }) {
  return (
    <section className={`min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${className}`}>
      <h2 className="mb-2 border-b border-slate-100 pb-2 text-[11px] font-bold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

function LegendRow({ name, value, total, color }) {
  const percentage = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center justify-between gap-2 text-[10px]">
      <span className="flex min-w-0 items-center gap-2"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} /><span className="truncate">{name}</span></span>
      <strong className="shrink-0">{value} ({percentage}%)</strong>
    </div>
  );
}

function StatusBadge({ status }) {
  const color = status === 'Approved'
    ? 'bg-emerald-100 text-emerald-800'
    : status === 'In Progress'
      ? 'bg-blue-100 text-blue-800'
      : status === 'Rejected' || status === 'Returned'
        ? 'bg-red-100 text-red-800'
        : 'bg-amber-100 text-amber-800';
  return <span className={`rounded-full px-2 py-1 font-semibold ${color}`}>{status}</span>;
}

function TableMessage({ children, colSpan = 3 }) {
  return <tr><td colSpan={colSpan} className="p-4 text-center text-slate-500">{children}</td></tr>;
}

function EmptyMessage({ children }) {
  return <div className="flex min-h-52 items-center justify-center text-center text-xs text-slate-500">{children}</div>;
}
