import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  BarChart3,
  CheckCircle,
  Clock3,
  Download,
  FileText,
  Filter,
  Printer,
  RotateCcw,
  Search,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_URL = 'http://localhost:3000/api/ict/reports';
const initialFilters = {
  startDate: '',
  endDate: '',
  campus: 'All',
  department: 'All',
  status: 'All',
  reason: 'All',
};

const statuses = [
  { name: 'Approved', color: '#22c55e', icon: CheckCircle },
  { name: 'Pending', color: '#f59e0b', icon: Clock3 },
  { name: 'Under Review', color: '#3b82f6', icon: Search },
  { name: 'Returned', color: '#ef4444', icon: RotateCcw },
];

const normalizeStatus = (status = '') => {
  const value = String(status).trim().toLowerCase();
  if (value === 'pending' || value === 'pending review') return 'Pending';
  if (value === 'in progress' || value === 'under review') return 'Under Review';
  if (value === 'returned' || value === 'rejected') return 'Returned';
  if (value === 'completed') return 'Completed';
  if (value === 'approved') return 'Approved';
  return 'Pending';
};

const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-GB') : 'Not recorded';
const getAuthConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export default function ICTReports() {
  const [filters, setFilters] = useState(initialFilters);
  const [summary, setSummary] = useState({ total: 0, pending: 0, underReview: 0, approved: 0, returned: 0 });
  const [statusCounts, setStatusCounts] = useState([]);
  const [reasonCounts, setReasonCounts] = useState([]);
  const [items, setItems] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReports = async (event, filterValues = filters) => {
    event?.preventDefault();
    setLoading(true);
    try {
      const response = await axios.get(API_URL, { params: filterValues, ...getAuthConfig() });
      const payload = response.data || {};
      setSummary(payload.summary || { total: 0, pending: 0, underReview: 0, approved: 0, returned: 0 });
      setStatusCounts(payload.statusCounts || []);
      setReasonCounts(payload.reasonCounts || []);
      setItems(payload.items || []);
      setRecentReports((current) => [{ name: 'ICT Clearance Summary Report', filters: `${filterValues.startDate || 'All dates'} - ${filterValues.endDate || 'All dates'}`, generatedDate: new Date().toLocaleString(), format: 'Live' }, ...current].slice(0, 5));
    } catch (error) {
      console.error('Unable to load ICT reports:', error);
      setSummary({ total: 0, pending: 0, underReview: 0, approved: 0, returned: 0 });
      setStatusCounts([]);
      setReasonCounts([]);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const counts = useMemo(() => statuses.map((status) => ({
    ...status,
    value: Number(statusCounts.find((item) => normalizeStatus(item.status) === status.name)?.count || summary[status.name === 'Under Review' ? 'underReview' : status.name.toLowerCase()] || 0),
  })), [statusCounts, summary]);
  const chartTotal = counts.reduce((total, item) => total + item.value, 0);
  const chartStyle = useMemo(() => {
    let offset = 0;
    const stops = counts.map((item) => {
      const start = offset;
      offset += chartTotal ? (item.value / chartTotal) * 100 : 0;
      return `${item.color} ${start}% ${offset}%`;
    });
    return { background: `conic-gradient(${stops.join(', ') || '#e2e8f0 0 100%'})` };
  }, [counts, chartTotal]);

  const updateFilter = (event) => setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  const resetFilters = () => {
    setFilters(initialFilters);
    fetchReports(undefined, initialFilters);
  };

  const exportExcel = () => {
    const rows = items.map((item) => ({
      'Request ID': item.clearanceId,
      'Employee Name': item.employeeName,
      'Employee ID': item.employeeId,
      Department: item.department,
      Reason: item.clearanceReason,
      'Request Date': formatDate(item.submittedDate),
      Status: normalizeStatus(item.status),
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'ICT Reports');
    XLSX.writeFile(workbook, 'ict-clearance-report.xlsx');
  };

  const exportPdf = () => {
    const document = new jsPDF({ orientation: 'landscape' });
    document.text('ICT Clearance Report', 14, 15);
    autoTable(document, {
      startY: 22,
      head: [['Request ID', 'Employee', 'Employee ID', 'Department', 'Reason', 'Date', 'Status']],
      body: items.map((item) => [item.clearanceId, item.employeeName, item.employeeId, item.department, item.clearanceReason, formatDate(item.submittedDate), normalizeStatus(item.status)]),
    });
    document.save('ict-clearance-report.pdf');
  };

  const reportNames = ['ICT Clearance Summary Report', 'ICT Clearance Status Report', 'ICT Clearance Activity Report', 'Returned Clearance Report'];

  return (
    <div className="min-h-screen bg-slate-50 p-6 print:p-0">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center print:hidden">
          <div><h1 className="text-2xl font-bold text-slate-900">ICT Clearance Reports</h1><p className="text-sm text-slate-500">View and generate ICT clearance related reports</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportPdf} disabled={!items.length} className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><FileText size={14} /> PDF</button>
            <button type="button" onClick={exportExcel} disabled={!items.length} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Download size={14} /> Excel</button>
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"><Printer size={14} /> Print</button>
          </div>
        </header>

        <form onSubmit={fetchReports} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800"><Filter size={16} className="text-blue-600" /> Report Filters</div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            {['startDate', 'endDate'].map((name) => <label key={name} className="text-[11px] font-semibold text-slate-600">{name === 'startDate' ? 'From Date' : 'To Date'}<input type="date" name={name} value={filters[name]} onChange={updateFilter} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" /></label>)}
            <label className="text-[11px] font-semibold text-slate-600">Campus<select name="campus" value={filters.campus} onChange={updateFilter} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"><option>All</option><option>Main Campus</option><option>Tibebe Ghion Campus</option><option>Felege Hiwot Campus</option></select></label>
            <label className="text-[11px] font-semibold text-slate-600">Department<select name="department" value={filters.department} onChange={updateFilter} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"><option>All</option><option>Information Technology</option><option>Computer Science</option><option>Finance</option><option>Human Resource</option></select></label>
            <label className="text-[11px] font-semibold text-slate-600">Status<select name="status" value={filters.status} onChange={updateFilter} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"><option>All</option>{statuses.map((status) => <option key={status.name}>{status.name}</option>)}<option>Completed</option></select></label>
            <label className="text-[11px] font-semibold text-slate-600">Reason<select name="reason" value={filters.reason} onChange={updateFilter} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"><option>All</option>{reasonCounts.map((reason) => <option key={reason._id}>{reason._id}</option>)}</select></label>
          </div>
          <div className="mt-3 flex gap-2"><button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white"><Filter size={14} /> Generate Report</button><button type="button" onClick={resetFilters} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700">Reset</button></div>
        </form>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-sm font-bold text-slate-900">Available Reports</h2><div className="space-y-2">{reportNames.map((name, index) => <button key={name} type="button" onClick={() => fetchReports()} className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50"><span className="flex items-center gap-3"><BarChart3 size={18} className={['text-blue-600', 'text-emerald-600', 'text-violet-600', 'text-red-600'][index]} /><span><strong className="block text-xs text-blue-700">{name}</strong><small className="text-[10px] text-slate-500">Database-backed ICT clearance report</small></span></span><span className="text-slate-400">›</span></button>)}</div></section>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-sm font-bold text-slate-900">ICT Clearance Status Overview</h2><div className="flex flex-col items-center gap-6 sm:flex-row"><div className="relative h-40 w-40 shrink-0 rounded-full p-5" style={chartStyle}><div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white text-slate-900"><strong className="text-2xl">{summary.total || 0}</strong><span className="text-[10px] text-slate-500">Total</span></div></div><div className="w-full space-y-2">{counts.map((item) => <div key={item.name} className="flex items-center justify-between border-b border-slate-100 py-2 text-xs"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><strong>{item.value}</strong></div>)}</div></div></section>
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900">Filtered ICT Clearance Records</div><div className="overflow-x-auto"><table className="min-w-[980px] w-full text-left text-xs"><thead className="bg-slate-100 text-slate-700"><tr>{['Request ID', 'Employee', 'Employee ID', 'Department', 'Reason', 'Request Date', 'Status'].map((heading) => <th key={heading} className="p-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan="7" className="p-8 text-center text-slate-500">Loading ICT reports...</td></tr> : items.length ? items.map((item) => <tr key={item.clearanceId} className="hover:bg-slate-50"><td className="p-3 font-semibold text-blue-700">{item.clearanceId}</td><td className="p-3 font-semibold">{item.employeeName}</td><td className="p-3">{item.employeeId || 'Not recorded'}</td><td className="p-3">{item.department || 'Not recorded'}</td><td className="p-3">{item.clearanceReason || 'Not recorded'}</td><td className="p-3">{formatDate(item.submittedDate)}</td><td className="p-3 font-semibold">{normalizeStatus(item.status)}</td></tr>) : <tr><td colSpan="7" className="p-8 text-center text-slate-400">No database records match the selected filters.</td></tr>}</tbody></table></div></section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900">Recent Generated Reports</div><div className="overflow-x-auto"><table className="min-w-[700px] w-full text-left text-xs"><thead className="bg-slate-100"><tr><th className="p-3">Report Name</th><th className="p-3">Filters</th><th className="p-3">Generated Date</th><th className="p-3">Format</th></tr></thead><tbody>{recentReports.length ? recentReports.map((report, index) => <tr key={`${report.name}-${index}`} className="border-t border-slate-100"><td className="p-3 font-semibold text-blue-700">{report.name}</td><td className="p-3">{report.filters}</td><td className="p-3">{report.generatedDate}</td><td className="p-3">{report.format}</td></tr>) : <tr><td colSpan="4" className="p-6 text-center text-slate-400">No reports generated in this session.</td></tr>}</tbody></table></div></section>
      </div>
    </div>
  );
}