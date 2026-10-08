import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  BarChart3, CalendarDays, CheckCircle2, Download, FileCheck2, FileSpreadsheet,
  FileText, Printer, Search, Users,
} from 'lucide-react';
import { fetchEmployees, getEmployeeHeaders } from '../../until/EmployeeHelper';

const API_URL = 'http://localhost:3000/api/reports/hr-clearance';
const STATUS_COLORS = {
  Completed: '#15803d',
  'In Progress': '#e5a315',
  Pending: '#2563eb',
  Returned: '#be123c',
  Cancelled: '#94a3b8',
};
const REASON_COLORS = ['#15803d', '#e5a315', '#be123c', '#7c3aed', '#475569'];
const CONTROL_CLASS = 'h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const ACTION_CLASS = 'inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60';

const formatDate = (value) => {
  if (!value || value === '-') return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
};

const normalizeStatus = (status) => {
  const value = String(status || 'Pending').trim().toLowerCase();
  if (['completed', 'approved', 'cleared'].includes(value)) return 'Completed';
  if (['in progress', 'under review'].includes(value)) return 'In Progress';
  if (['returned', 'rejected', 'on hold'].includes(value)) return 'Returned';
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
    params: { ...filters, clearanceType: 'All Types', reportType: 'Summary' },
  });
  return {
    summary: response.data.summary || {},
    rows: Array.isArray(response.data.rows) ? response.data.rows : [],
  };
};

export default function HRReport() {
  const navigate = useNavigate();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [department, setDepartment] = useState('All Departments');
  const [searchTerm, setSearchTerm] = useState('');
  const [report, setReport] = useState({ summary: {}, rows: [] });
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employeeLoading, setEmployeeLoading] = useState(true);
  const [error, setError] = useState('');
  const [employeeError, setEmployeeError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadReport = async (filters = {
    fromDate,
    toDate,
    campus: 'All Campuses',
    department,
    status: 'All Statuses',
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
      setError(requestError.response?.data?.message || 'Unable to load the HR clearance report.');
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
      campus: 'All Campuses',
      department: 'All Departments',
      status: 'All Statuses',
    }).then((nextReport) => {
      if (!active) return;
      setReport(nextReport);
      setLastUpdated(new Date());
      setDepartments([...new Set(nextReport.rows.map((row) => departmentName(row.department)).filter(Boolean))].sort());
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'Unable to load the HR clearance report.');
    }).finally(() => {
      if (active) setLoading(false);
    });

    fetchEmployees().then((items) => {
      if (active) setEmployees(Array.isArray(items) ? items : []);
    }).catch((requestError) => {
      if (active) setEmployeeError(requestError.response?.data?.message || 'Unable to load employee totals.');
    }).finally(() => {
      if (active) setEmployeeLoading(false);
    });

    return () => { active = false; };
  }, []);

  const employeeDepartments = employees.map((employee) => departmentName(employee.department)).filter(Boolean);
  const departmentOptions = [...new Set([...departments, ...employeeDepartments])].sort();
  const rows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return report.rows;
    return report.rows.filter((row) => [
      row.employeeName,
      row.employeeId,
      row.employeeEmail,
      row.employeePhone,
      row.department,
    ].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [report.rows, searchTerm]);

  const statusCounts = useMemo(() => rows.reduce((counts, row) => {
    const status = normalizeStatus(row.status);
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {}), [rows]);
  const statusData = ['Completed', 'In Progress', 'Pending', 'Returned', 'Cancelled']
    .map((name) => ({ name, value: statusCounts[name] || 0, color: STATUS_COLORS[name] }));
  const reasonData = Object.entries(rows.reduce((groups, row) => {
    const reason = row.reason || row.clearanceType || 'Unspecified';
    groups[reason] = (groups[reason] || 0) + 1;
    return groups;
  }, {})).map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const pendingByDepartment = Object.entries(rows.reduce((groups, row) => {
    if (!['Pending', 'In Progress'].includes(normalizeStatus(row.status))) return groups;
    const name = departmentName(row.department) || 'Unknown department';
    groups[name] = (groups[name] || 0) + 1;
    return groups;
  }, {})).map(([name, pending]) => ({
    name,
    pending,
    percent: rows.length ? Math.round((pending / rows.length) * 100) : 0,
  })).sort((a, b) => b.pending - a.pending).slice(0, 5);
  const finalApprovalRows = rows.filter((row) => {
    const status = String(row.finalHRStatus || '').toLowerCase();
    return status === 'pending'
      || (String(row.currentOffice || '').toLowerCase().includes('final hr')
        && normalizeStatus(row.status) !== 'Completed');
  }).slice(0, 5);
  const certificateRows = rows.filter((row) => row.certificateStatus === 'Issued')
    .sort((a, b) => new Date(b.certificateIssuedAt || 0) - new Date(a.certificateIssuedAt || 0))
    .slice(0, 3);
  const recentCertificateCount = rows.filter((row) => {
    if (row.certificateStatus !== 'Issued' || !row.certificateIssuedAt) return false;
    const issuedAt = new Date(row.certificateIssuedAt);
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);
    return !Number.isNaN(issuedAt.getTime()) && issuedAt >= cutoff;
  }).length;
  const turnaroundDays = rows.flatMap((row) => {
    if (normalizeStatus(row.status) !== 'Completed' || !row.requestDate || !row.completionDate) return [];
    const days = (new Date(row.completionDate) - new Date(row.requestDate)) / 86400000;
    return Number.isFinite(days) && days >= 0 ? [days] : [];
  });
  const averageTurnaround = turnaroundDays.length
    ? `${Math.round(turnaroundDays.reduce((sum, days) => sum + days, 0) / turnaroundDays.length)} Days`
    : '—';
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((employee) => String(employee.status || '').toLowerCase() === 'active').length;
  const peakReason = reasonData[0];
  const totalRequests = rows.length;
  const pendingCount = (statusCounts.Pending || 0) + (statusCounts['In Progress'] || 0);
  const stats = [
    { title: 'Total Employees', value: totalEmployees, detail: `${activeEmployees} Active`, icon: <Users size={18} />, color: 'blue' },
    { title: 'Clearance Requests', value: totalRequests, detail: 'In selected report', icon: <FileCheck2 size={18} />, color: 'green' },
    { title: 'Pending Clearance', value: pendingCount, detail: `${pendingByDepartment.length} departments shown`, icon: <CalendarDays size={18} />, color: 'amber' },
    { title: 'Completed Clearance', value: statusCounts.Completed || 0, detail: 'Approved / cleared', icon: <CheckCircle2 size={18} />, color: 'purple' },
  ];

  const resetFilters = () => {
    setFromDate('');
    setToDate('');
    setDepartment('All Departments');
    setSearchTerm('');
    void loadReport({
      fromDate: '',
      toDate: '',
      campus: 'All Campuses',
      department: 'All Departments',
      status: 'All Statuses',
    });
  };

  const exportExcel = () => {
    const workbook = XLSX.utils.book_new();
    const summary = [
      ['HR Officer Clearance Report'],
      ['Generated', new Date().toLocaleString()],
      ['Total requests', rows.length],
      ['Completed', statusCounts.Completed || 0],
      ['Pending / in progress', pendingCount],
      ['Returned', statusCounts.Returned || 0],
      [],
      ['Reason', 'Requests'],
      ...reasonData.map(({ name, value }) => [name, value]),
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summary), 'Summary');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.map((row) => ({
      'Request ID': row.requestId,
      'Employee ID': row.employeeId,
      'Employee Name': row.employeeName,
      Department: departmentName(row.department),
      Campus: row.campus,
      Reason: row.reason || row.clearanceType,
      'Request Date': formatDate(row.requestDate),
      'Last Working Date': formatDate(row.lastWorkingDate),
      Status: row.status,
      'Current Office': row.currentOffice,
      'Final HR Approval': row.finalHRStatus,
      'Certificate Number': row.certificateNumber,
      'Certificate Issued': formatDate(row.certificateIssuedAt),
    }))), 'Clearance Requests');
    XLSX.writeFile(workbook, 'hr-clearance-report.xlsx');
  };

  const exportPdf = () => {
    const document = new jsPDF({ orientation: 'landscape' });
    document.setFontSize(16);
    document.text('HR Officer Clearance Performance Report', 14, 16);
    document.setFontSize(9);
    document.text(`Generated ${new Date().toLocaleString()}  |  Requests: ${rows.length}  |  Completed: ${statusCounts.Completed || 0}  |  Pending: ${pendingCount}`, 14, 23);
    autoTable(document, {
      startY: 29,
      head: [['Request ID', 'Employee ID', 'Employee Name', 'Department', 'Reason', 'Request Date', 'Status', 'Current Office']],
      body: rows.map((row) => [
        row.requestId || '—',
        row.employeeId || '—',
        row.employeeName || '—',
        departmentName(row.department) || '—',
        row.reason || row.clearanceType || '—',
        formatDate(row.requestDate),
        row.status || 'Pending',
        row.currentOffice || '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
    });
    document.save('hr-clearance-report.pdf');
  };

  return (
    <main className="space-y-4 bg-slate-50 p-3 text-xs text-slate-800 sm:p-5 print:bg-white">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-slate-500">Dashboard / Reports</p>
            <h1 className="mt-1 text-xl font-bold text-slate-900">HR Officer Clearance Performance &amp; Turnaround Metrics Dashboard</h1>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarDays size={14} />
            {new Date().toLocaleString()}
          </p>
        </div>

        <form className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-[minmax(200px,1.5fr)_minmax(180px,1fr)_minmax(140px,1fr)_auto_auto]" onSubmit={(event) => { event.preventDefault(); void loadReport(); }}>
          <label className="block text-[11px] font-medium text-slate-600">
            Search by name, ID, phone or email
            <span className="relative mt-1 block">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input aria-label="Search by name, ID, phone or email" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by name, ID, phone or email..." className={`${CONTROL_CLASS} pl-9`} />
            </span>
          </label>
          <label className="block text-[11px] font-medium text-slate-600">
            Date Range
            <span className="mt-1 grid grid-cols-2 gap-2">
              <input aria-label="From date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className={CONTROL_CLASS} />
              <input aria-label="To date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className={CONTROL_CLASS} />
            </span>
          </label>
          <label className="block text-[11px] font-medium text-slate-600">
            Department
            <select value={department} onChange={(event) => setDepartment(event.target.value)} className={`${CONTROL_CLASS} mt-1`}>
              <option>All Departments</option>
              {departmentOptions.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
          <button type="submit" disabled={loading} className={`${ACTION_CLASS} bg-blue-700 hover:bg-blue-800`}>
            <FileText size={15} />Generate Report
          </button>
          <button type="button" onClick={resetFilters} disabled={loading} className={`${ACTION_CLASS} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>
            Reset Filters
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <button type="button" onClick={exportPdf} disabled={loading || rows.length === 0} className={`${ACTION_CLASS} bg-emerald-700 hover:bg-emerald-800`}>
            <Download size={14} />Generate &amp; Export PDF Report
          </button>
          <button type="button" onClick={exportExcel} disabled={loading || rows.length === 0} className={`${ACTION_CLASS} bg-blue-700 hover:bg-blue-800`}>
            <FileSpreadsheet size={14} />Generate &amp; Export Excel Report
          </button>
          <button type="button" onClick={() => window.print()} className={`${ACTION_CLASS} bg-slate-600 hover:bg-slate-700 print:hidden`}>
            <Printer size={14} />Print
          </button>
        </div>
      </section>

      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {employeeError && <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{employeeError}</p>}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map(({ title, value, detail, icon, color }) => (
          <StatCard key={title} title={title} value={employeeLoading && title === 'Total Employees' ? '—' : loading ? '—' : Number(value || 0).toLocaleString()} detail={detail} icon={icon} color={color} />
        ))}
      </section>

      <section className="grid gap-3 xl:grid-cols-12">
        <Panel title="SECTION 1: OVERALL STATUS SUMMARY" className="xl:col-span-4">
          {loading ? <EmptyMessage>Loading report data…</EmptyMessage> : rows.length ? (
            <div className="flex min-h-52 flex-wrap items-center justify-center gap-3">
              <div className="relative h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData.filter((item) => item.value > 0)} dataKey="value" nameKey="name" innerRadius="54%" outerRadius="84%" paddingAngle={2}>
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
                {statusData.map((entry) => <LegendRow key={entry.name} name={entry.name} value={entry.value} total={rows.length} color={entry.color} />)}
              </div>
            </div>
          ) : <EmptyMessage>No clearance records match these filters.</EmptyMessage>}
        </Panel>

        <Panel title="SECTION 2: RESIGNATION & REASON ANALYTICS" className="xl:col-span-4">
          {loading ? <EmptyMessage>Loading report data…</EmptyMessage> : reasonData.length ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reasonData} margin={{ top: 8, right: 8, left: -20, bottom: 22 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-22} textAnchor="end" interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Requests" radius={[4, 4, 0, 0]}>
                    {reasonData.map((entry, index) => <Cell key={entry.name} fill={REASON_COLORS[index % REASON_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyMessage>No reason analytics available.</EmptyMessage>}
        </Panel>

        <Panel title="SECTION 3: FINAL HR CLEARANCE & CERTIFICATES" className="xl:col-span-4">
          <h3 className="mb-1 font-semibold text-slate-700">Pending Final HR Approval</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[340px] text-left text-[11px]">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="p-2">Employee</th><th className="p-2">Department</th><th className="p-2">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <TableMessage>Loading…</TableMessage> : finalApprovalRows.length ? finalApprovalRows.map((row) => (
                  <tr key={row.id || row.requestId}>
                    <td className="p-2 font-medium">{row.employeeName || 'Unknown employee'}</td>
                    <td className="p-2">{departmentName(row.department) || '—'}</td>
                    <td className="p-2"><button type="button" onClick={() => navigate(`/hr-office/final-hr-clearance/${row.requestId}`)} className="whitespace-nowrap font-semibold text-blue-700 hover:underline">Review &amp; Approve</button></td>
                  </tr>
                )) : <TableMessage>No pending final approvals.</TableMessage>}
              </tbody>
            </table>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <h3 className="font-semibold text-slate-700">Certificates Issued (Last 3 Months)</h3>
              <span className="font-bold text-blue-800">{loading ? '—' : recentCertificateCount}</span>
            </div>
            {certificateRows.length ? (
              <ul className="divide-y divide-slate-100">
                {certificateRows.map((row) => (
                  <li key={row.id || row.requestId} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="truncate">{row.certificateNumber || row.employeeName}</span>
                    <span className="shrink-0 text-slate-500">{formatDate(row.certificateIssuedAt)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="py-2 text-[11px] text-slate-500">{loading ? 'Loading…' : 'No generated certificates in this report.'}</p>}
          </div>
        </Panel>
      </section>

      <section className="grid gap-3 xl:grid-cols-12">
        <Panel title="SECTION 4: KEY PERFORMANCE INDICATORS" className="xl:col-span-7">
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard title="Avg. Clearance Turnaround Time" value={averageTurnaround} detail="Request to final completion" />
            <MetricCard title="Peak Reason" value={peakReason ? `${peakReason.name} (${Math.round((peakReason.value / Math.max(rows.length, 1)) * 100)}%)` : '—'} detail="Most frequent clearance reason" />
            <MetricCard title="Top Pending Department" value={pendingByDepartment[0]?.name || '—'} detail={pendingByDepartment[0] ? `${pendingByDepartment[0].pending} active hold(s)` : 'No pending departments'} />
          </div>
        </Panel>
        <Panel title="Pending Requests by Department" className="xl:col-span-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[300px] text-left text-[11px]">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="p-2">#</th><th className="p-2">Department</th><th className="p-2">Pending</th><th className="p-2">%</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <TableMessage>Loading…</TableMessage> : pendingByDepartment.length ? pendingByDepartment.map((item, index) => (
                  <tr key={item.name}><td className="p-2 text-slate-400">{index + 1}</td><td className="p-2 font-medium">{item.name}</td><td className="p-2">{item.pending}</td><td className="p-2">{item.percent}%</td></tr>
                )) : <TableMessage>No pending requests.</TableMessage>}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-3 text-[11px] text-slate-600 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p><BarChart3 size={14} className="mr-1 inline text-blue-700" />Showing <strong>{rows.length}</strong> matching clearance request(s) from the HR report API.</p>
          <p>Last updated: {lastUpdated ? lastUpdated.toLocaleString() : '—'}</p>
        </div>
      </section>
    </main>
  );
}

function StatCard({ title, value, detail, icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-800',
    green: 'bg-emerald-50 text-emerald-800',
    amber: 'bg-amber-50 text-amber-800',
    purple: 'bg-violet-50 text-violet-800',
  };
  return (
    <article className={`flex min-h-24 items-center gap-3 rounded-lg border border-slate-100 p-3 ${colorClasses[color]}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/80">{icon}</span>
      <div className="min-w-0"><h2 className="text-[11px] font-semibold">{title}</h2><p className="mt-1 text-xl font-bold leading-none">{value}</p><p className="mt-1 text-[10px] opacity-75">{detail}</p></div>
    </article>
  );
}

function Panel({ title, className = '', children }) {
  return (
    <section className={`min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${className}`}>
      <h2 className="mb-3 border-b border-slate-100 pb-2 text-[11px] font-bold uppercase tracking-wide text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

function MetricCard({ title, value, detail }) {
  return <article className="min-h-24 rounded-md border border-slate-100 bg-slate-50 p-3"><h3 className="text-[11px] text-slate-600">{title}</h3><p className="mt-2 break-words text-base font-bold text-slate-900">{value}</p><p className="mt-1 text-[10px] text-slate-500">{detail}</p></article>;
}

function LegendRow({ name, value, total, color }) {
  const percentage = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="flex min-w-0 items-center gap-2"><i className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} /><span className="truncate">{name}</span></span>
      <strong className="shrink-0">{value} ({percentage}%)</strong>
    </div>
  );
}

function TableMessage({ children }) {
  return <tr><td colSpan={3} className="p-4 text-center text-slate-500">{children}</td></tr>;
}

function EmptyMessage({ children }) {
  return <div className="flex min-h-52 items-center justify-center text-center text-xs text-slate-500">{children}</div>;
}
