import React, { useEffect, useMemo, useState } from 'react';
import { fetchClearances } from '../../until/clearanceHelper';
import {
  FileText, Clock, RefreshCw, CheckCircle2, XCircle, FileSpreadsheet,
  FileDown, ChevronLeft, ChevronRight, Users, Building2, Shield, History, UserCheck
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function SystemAdminReports() {
  const [clearances, setClearances] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [campus, setCampus] = useState('All Campuses');
  const [department, setDepartment] = useState('All Departments');
  const [reportType, setReportType] = useState('All Types');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const pageSize = 15;

  useEffect(() => {
    fetchClearances()
      .then((clearanceData) => setClearances(clearanceData))
      .catch(() => setError('Unable to load report data. Please sign in again.'))
      .finally(() => setLoading(false));
  }, []);

  const campusOf = (item) => item.campus || item.employee?.campus || 'Unknown campus';
  const departmentOf = (item) => item.department?.name || item.department || 'Unknown department';
  const nameOf = (item) => item.employeeName || item.employee?.fullName || item.employee || 'Unknown employee';
  const dateOf = (item) => item.requestDate || item.createdAt;
  const filteredRequests = useMemo(() => clearances.filter((item) => {
    const date = dateOf(item) ? new Date(dateOf(item)) : null;
    const start = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const end = toDate ? new Date(`${toDate}T23:59:59.999`) : null;
    return (!start || (date && date >= start)) && (!end || (date && date <= end))
      && (campus === 'All Campuses' || campusOf(item) === campus)
      && (department === 'All Departments' || departmentOf(item) === department)
      && (reportType === 'All Types' || (item.status || 'Pending') === reportType);
  }), [clearances, fromDate, toDate, campus, department, reportType]);
  const statusCounts = useMemo(() => filteredRequests.reduce((counts, item) => {
    const status = item.status || 'Pending';
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {}), [filteredRequests]);
  const campusCounts = useMemo(() => filteredRequests.reduce((counts, item) => {
    const value = campusOf(item);
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {}), [filteredRequests]);
  const campuses = [...new Set(clearances.map(campusOf))];
  const departments = [...new Set(clearances.map(departmentOf))];
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const visibleRequests = filteredRequests.slice((page - 1) * pageSize, page * pageSize);
  const percentage = (value) => filteredRequests.length ? `${((value / filteredRequests.length) * 100).toFixed(1)}%` : '0.0%';
  const trendData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, index) => ({ month: new Date(0, index).toLocaleString('en', { month: 'short' }), Total: 0, Completed: 0, Pending: 0, Rejected: 0 }));
    filteredRequests.forEach((item) => {
      const date = dateOf(item) ? new Date(dateOf(item)) : null;
      if (!date || Number.isNaN(date.getTime())) return;
      const month = months[date.getMonth()];
      month.Total += 1;
      const status = item.status || 'Pending';
      if (month[status] !== undefined) month[status] += 1;
    });
    return months;
  }, [filteredRequests]);
  const formatDate = (value) => value ? new Date(value).toLocaleDateString() : '-';
  const resetFilters = () => { setFromDate(''); setToDate(''); setCampus('All Campuses'); setDepartment('All Departments'); setReportType('All Types'); setPage(1); };
  const exportReport = (format) => {
    if (format === 'pdf') { window.print(); return; }
    const rows = [['Employee Name', 'Employee ID', 'Department', 'Request Date', 'Status'], ...filteredRequests.map((item) => [nameOf(item), item.employeeId || '-', departmentOf(item), formatDate(dateOf(item)), item.status || 'Pending'])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'admin-clearance-report.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 text-xs font-sans p-6 space-y-5">
      
      {/* HEADER TITLE */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">System Admin – Reports</h1>
        <p className="text-slate-500 text-[11px]">View and analyze system reports and statistics</p>
        {error && <p className="mt-2 text-red-600">{error}</p>}
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between gap-3">
        <div className="grid grid-cols-4 gap-3 flex-1">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Report Type</label>
            <select value={reportType} onChange={(event) => { setReportType(event.target.value); setPage(1); }} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 font-medium">
              <option>All Types</option><option>Pending</option><option>In Progress</option><option>Completed</option><option>Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Date Range</label>
            <div className="flex gap-1"><input aria-label="From date" type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1); }} className="w-1/2 bg-slate-50 border border-slate-200 rounded px-1 py-1.5 font-medium" /><input aria-label="To date" type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1); }} className="w-1/2 bg-slate-50 border border-slate-200 rounded px-1 py-1.5 font-medium" /></div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Campus</label>
            <select value={campus} onChange={(event) => { setCampus(event.target.value); setPage(1); }} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 font-medium">
              <option>All Campuses</option>{campuses.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Department</label>
            <select value={department} onChange={(event) => { setDepartment(event.target.value); setPage(1); }} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 font-medium">
              <option>All Departments</option>{departments.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-4">
          <button onClick={() => setMessage(`${filteredRequests.length} requests included in this report.`)} className="bg-blue-600 text-white font-medium px-4 py-2 rounded flex items-center gap-1 hover:bg-blue-700">
            <FileText size={14} /> Generate Report
          </button>
          <button onClick={() => exportReport('pdf')} className="bg-white border border-slate-200 text-slate-700 font-medium px-3 py-2 rounded flex items-center gap-1 hover:bg-slate-50">
            <FileDown size={14} className="text-red-500" /> Export PDF
          </button>
          <button onClick={() => exportReport('excel')} className="bg-white border border-slate-200 text-slate-700 font-medium px-3 py-2 rounded flex items-center gap-1 hover:bg-slate-50">
            <FileSpreadsheet size={14} className="text-emerald-600" /> Export Excel
          </button>
        </div>
        {message && <p className="text-[10px] text-emerald-600 col-span-full">{message}</p>}
      </div>

      {/* SUMMARY STATS CARDS */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard icon={<FileText className="text-blue-600" size={20} />} title="Total Clearance Requests" val={filteredRequests.length} sub="Selected period" bg="bg-blue-50" />
        <StatCard icon={<Clock className="text-amber-500" size={20} />} title="Pending Requests" val={statusCounts.Pending || 0} sub="Awaiting action" bg="bg-amber-50" />
        <StatCard icon={<RefreshCw className="text-blue-500" size={20} />} title="In Progress Requests" val={statusCounts['In Progress'] || 0} sub="Currently in process" bg="bg-blue-50" />
        <StatCard icon={<CheckCircle2 className="text-emerald-600" size={20} />} title="Completed Clearances" val={statusCounts.Completed || 0} sub="Successfully completed" bg="bg-emerald-50" />
        <StatCard icon={<XCircle className="text-red-500" size={20} />} title="Rejected Requests" val={statusCounts.Rejected || 0} sub="Rejected / returned" bg="bg-red-50" />
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-3 gap-5">
        
        {/* Donut Chart: Status */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Requests by Status</h3>
          <div className="flex items-center space-x-4 pt-2">
            <div className="w-32 h-32 rounded-full border-[18px] border-emerald-500 border-t-amber-400 border-r-blue-500 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-center">Total: {filteredRequests.length}</span>
            </div>
            <div className="space-y-2 text-[10px]">
              <p className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Completed ({statusCounts.Completed || 0})</p>
              <p className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Pending ({statusCounts.Pending || 0})</p>
              <p className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> In Progress ({statusCounts['In Progress'] || 0})</p>
              <p className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Rejected ({statusCounts.Rejected || 0})</p>
            </div>
          </div>
        </div>

        {/* Line Chart: Monthly Trend */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Monthly Clearance Trend (This Year)</h3>
          <div className="h-40 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={9} />
                <YAxis stroke="#94a3b8" fontSize={9} />
                <Tooltip />
                <Line type="monotone" dataKey="Total" stroke="#3b82f6" strokeWidth={1.5} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={1.5} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="Pending" stroke="#f59e0b" strokeWidth={1.5} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="Rejected" stroke="#ef4444" strokeWidth={1.5} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart: Campus */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Requests by Campus</h3>
          <div className="flex items-center space-x-4 pt-2">
            <div className="w-32 h-32 rounded-full border-[18px] border-blue-600 border-t-emerald-500 border-r-purple-500 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-center">{filteredRequests.length}<br/><span className="font-normal text-slate-400">Total</span></span>
            </div>
            <div className="space-y-1.5 text-[10px]">
              {Object.entries(campusCounts).slice(0, 4).map(([name, count], index) => <p key={name} className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${['bg-blue-600', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-400'][index]}`}></span> {name} <b>{count} ({percentage(count)})</b></p>)}
            </div>
          </div>
        </div>

      </div>

      {/* BOTTOM TABLES AND QUICK REPORTS */}
      <div className="grid grid-cols-3 gap-5">
        
        {/* Table: Recent Clearance Requests */}
        <div className="col-span-2 bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-800">Recent Clearance Requests</h3>
            <a href="#" className="text-blue-600 font-medium text-[10px]">View All Requests</a>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-[10px]">
                <th className="py-2">No.</th>
                <th>Employee Name</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Request Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[10px]">
              {loading ? <tr><td colSpan="6" className="py-6 text-center text-slate-400">Loading report data...</td></tr> : visibleRequests.length === 0 ? <tr><td colSpan="6" className="py-6 text-center text-slate-400">No requests match the selected filters.</td></tr> : visibleRequests.map((row, index) => (
                <tr key={row._id || row.requestId || `${dateOf(row)}-${index}`}>
                  <td className="py-2.5 text-slate-400">{(page - 1) * pageSize + index + 1}</td>
                  <td className="font-semibold text-slate-800">{nameOf(row)}</td>
                  <td className="text-slate-500">{row.employeeId || '-'}</td>
                  <td className="text-slate-600">{departmentOf(row)}</td>
                  <td className="text-slate-500">{formatDate(dateOf(row))}</td>
                  <td>
                    <StatusBadge status={row.status || 'Pending'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex justify-between items-center pt-2 text-[10px] text-slate-400">
            <span>Showing {visibleRequests.length ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, filteredRequests.length)} of {filteredRequests.length} requests</span>
            <div className="flex items-center space-x-1">
              <button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="p-1 border border-slate-200 rounded text-slate-400 disabled:opacity-40"><ChevronLeft size={12} /></button>
              <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold">{page}</span>
              <span>of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="p-1 border border-slate-200 rounded text-slate-700 disabled:opacity-40"><ChevronRight size={12} /></button>
            </div>
          </div>
        </div>

        {/* Quick Reports Section */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Quick Reports</h3>
          <div className="space-y-3">
            <QuickReportItem icon={<Users size={16} className="text-purple-600" />} title="User Management Report" sub="View system users and roles summary" />
            <QuickReportItem icon={<UserCheck size={16} className="text-emerald-600" />} title="Employee Overview Report" sub="View employee statistics and distribution" />
            <QuickReportItem icon={<Building2 size={16} className="text-amber-500" />} title="Organization Report" sub="View organization structure summary" />
            <QuickReportItem icon={<History size={16} className="text-blue-500" />} title="Audit / System Activity Report" sub="View system activity and audit logs" />
            <QuickReportItem icon={<Shield size={16} className="text-red-500" />} title="Security Report" sub="View security and login activity" />
          </div>
        </div>

      </div>

    </div>
  );
}

function StatCard({ icon, title, val, sub, bg }) {
  return (
    <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm flex items-start justify-between">
      <div>
        <span className="text-[10px] text-slate-500 font-medium block mb-1">{title}</span>
        <h2 className="text-xl font-bold text-slate-800">{val}</h2>
        <span className="text-[9px] text-slate-400 mt-1 block">{sub}</span>
      </div>
      <div className={`p-2 rounded-lg ${bg}`}>{icon}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  let styles = 'bg-slate-100 text-slate-600';
  if (status === 'Pending') styles = 'bg-amber-100 text-amber-700';
  if (status === 'In Progress') styles = 'bg-blue-100 text-blue-700';
  if (status === 'Completed') styles = 'bg-emerald-100 text-emerald-700';
  if (status === 'Rejected') styles = 'bg-red-100 text-red-700';

  return <span className={`px-2 py-0.5 rounded font-semibold text-[9px] ${styles}`}>{status}</span>;
}

function QuickReportItem({ icon, title, sub }) {
  return (
    <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-100">
      <div className="p-2 rounded-lg bg-slate-100">{icon}</div>
      <div>
        <h4 className="font-semibold text-slate-800 text-[11px]">{title}</h4>
        <p className="text-slate-400 text-[9px]">{sub}</p>
      </div>
    </div>
  );
}