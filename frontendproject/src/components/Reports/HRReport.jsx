import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Download, Eye, FileCheck2, FileSpreadsheet, Printer, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000/api/reports/hr-clearance';
const REPORT_TYPES = [
  ['Summary', 'Clearance Summary Report'],
  ['Requests', 'Clearance Request Report'],
  ['Status', 'Clearance Status Report'],
  ['Returned', 'Returned Clearance Report'],
  ['Completed', 'Completed Clearance Report'],
];
const authConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
const formatDate = (value) => value && value !== '-' ? new Date(value).toLocaleDateString('en-GB') : '-';
const statusClass = { Pending: 'bg-amber-100 text-amber-700', 'In Progress': 'bg-blue-100 text-blue-700', Returned: 'bg-rose-100 text-rose-700', Completed: 'bg-emerald-100 text-emerald-700', Cancelled: 'bg-slate-200 text-slate-700' };

export default function ReportsDashboard() {
  const navigate = useNavigate();
  const [reportType, setReportType] = useState('Summary');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [campus, setCampus] = useState('All Campuses');
  const [department, setDepartment] = useState('All Departments');
  const [clearanceType, setClearanceType] = useState('All Types');
  const [status, setStatus] = useState('All Statuses');
  const [report, setReport] = useState({ summary: {}, rows: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReport = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(API_URL, { ...authConfig(), params: { reportType, fromDate, toDate, campus, department, clearanceType, status } });
      setReport(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load clearance report.');
      setReport({ summary: {}, rows: [] });
    } finally { setLoading(false); }
  };
  useEffect(() => { loadReport(); }, [reportType, fromDate, toDate, campus, department, clearanceType, status]);

  const campuses = useMemo(() => [...new Set(report.rows.map((row) => row.campus).filter((value) => value !== '-'))], [report.rows]);
  const departments = useMemo(() => [...new Set(report.rows.map((row) => row.department).filter((value) => value !== '-'))], [report.rows]);
  const clearanceTypes = useMemo(() => [...new Set(report.rows.map((row) => row.clearanceType).filter((value) => value !== '-'))], [report.rows]);
  const title = REPORT_TYPES.find(([value]) => value === reportType)?.[1];
  const resetFilters = () => { setFromDate(''); setToDate(''); setCampus('All Campuses'); setDepartment('All Departments'); setClearanceType('All Types'); setStatus('All Statuses'); };

  const exportReport = (format) => {
    if (format === 'pdf') { window.print(); return; }
    const columns = reportType === 'Status' ? ['Request ID', 'Employee', 'Department', 'Progress', 'Current Office', 'Status'] : ['Request ID', 'Employee Name', 'Employee ID', 'Department', 'Campus', 'Clearance Type', 'Request Date', 'Last Working Date', 'Current Status', 'Current Office'];
    const rows = report.rows.map((row) => reportType === 'Status' ? [row.requestId, row.employeeName, row.department, row.progress, row.currentOffice, row.status] : [row.requestId, row.employeeName, row.employeeId, row.department, row.campus, row.clearanceType, formatDate(row.requestDate), formatDate(row.lastWorkingDate), row.status, row.currentOffice]);
    const csv = [columns, ...rows].map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `${reportType.toLowerCase()}-clearance-report.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return <main className="min-h-screen bg-slate-100 p-6 text-xs text-slate-800 print:bg-white"><div className="mx-auto max-w-7xl space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold uppercase tracking-[0.18em] text-blue-600">Employee Clearance Management System</p><h1 className="mt-1 text-2xl font-bold">HR Officer Reports</h1><p className="mt-1 text-slate-500">Track clearance requests, progress, returns, and completion.</p></div><FileCheck2 className="text-blue-600" size={34} /></header>
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{REPORT_TYPES.map(([value, label]) => <button type="button" key={value} onClick={() => setReportType(value)} className={`rounded-lg border p-3 text-left shadow-sm transition ${reportType === value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}><div className="font-bold">{label}</div><div className="mt-1 text-slate-500">{value === 'Status' ? 'Where each request is stopped' : value === 'Returned' ? 'Requests sent back by an office' : value === 'Completed' ? 'Finalized requests and certificates' : value === 'Requests' ? 'Detailed request register' : 'Overall clearance totals'}</div></button>)}</section>
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7"><Filter label="From Date"><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></Filter><Filter label="To Date"><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></Filter><Filter label="Campus"><select value={campus} onChange={(event) => setCampus(event.target.value)}><option>All Campuses</option>{campuses.map((item) => <option key={item}>{item}</option>)}</select></Filter><Filter label="Department"><select value={department} onChange={(event) => setDepartment(event.target.value)}><option>All Departments</option>{departments.map((item) => <option key={item}>{item}</option>)}</select></Filter><Filter label="Clearance Type"><select value={clearanceType} onChange={(event) => setClearanceType(event.target.value)}><option>All Types</option>{clearanceTypes.map((item) => <option key={item}>{item}</option>)}</select></Filter><Filter label="Status"><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All Statuses</option><option>Pending</option><option>In Progress</option><option>Returned</option><option>Completed</option><option>Cancelled</option></select></Filter><div className="mt-auto flex gap-2"><button type="button" onClick={loadReport} className="h-8 rounded bg-blue-600 px-3 font-medium text-white hover:bg-blue-700">Generate Report</button><button type="button" onClick={resetFilters} className="inline-flex h-8 items-center justify-center gap-1 rounded border border-slate-300 px-3 font-medium hover:bg-slate-50"><RotateCcw size={13} /> Reset</button></div></div></section>
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4"><div><h2 className="font-bold text-slate-900">{title}</h2><p className="mt-1 text-slate-500">{report.rows.length} record(s) match the selected filters.</p></div><div className="flex gap-2"><ActionButton onClick={() => window.print()} icon={<Printer size={14} />} label="Print" /><ActionButton onClick={() => exportReport('pdf')} icon={<Download size={14} />} label="PDF" /><ActionButton onClick={() => exportReport('excel')} icon={<FileSpreadsheet size={14} />} label="Excel" /></div></div>{error && <p className="p-4 text-rose-600">{error}</p>}<div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><TableHeader type={reportType} /></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan="11" className="p-8 text-center text-slate-500">Loading report...</td></tr> : report.rows.length ? report.rows.map((row) => <ReportRow key={row.id} row={row} type={reportType} onView={() => navigate(`/hr-office/final-hr-clearance/${row.requestId}`)} />) : <tr><td colSpan="11" className="p-8 text-center text-slate-500">No clearance records found.</td></tr>}</tbody></table></div></section>
  </div></main>;
}

function Filter({ label, children }) { return <label className="block"><span className="mb-1 block text-slate-500">{label}</span>{React.cloneElement(children, { className: 'h-8 w-full rounded border border-slate-300 bg-white px-2' })}</label>; }
function ActionButton({ onClick, icon, label }) { return <button type="button" onClick={onClick} className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1.5 font-medium hover:bg-slate-50">{icon}{label}</button>; }
function TableHeader({ type }) { const headers = type === 'Status' ? ['Request ID', 'Employee', 'Department', 'Progress', 'Current Office', 'Status', 'Action'] : type === 'Returned' ? ['Request ID', 'Employee', 'Returned By', 'Returned Office', 'Returned Date', 'Return Reason', 'Current Status', 'Action'] : type === 'Completed' ? ['Request ID', 'Employee Name', 'Department', 'Clearance Type', 'Request Date', 'Completion Date', 'Final HR Approved By', 'Certificate Status', 'Action'] : ['Request ID', 'Employee Name', 'Employee ID', 'Department', 'Campus', 'Clearance Type', 'Request Date', 'Last Working Date', 'Current Status', 'Current Office', 'Action']; return <tr>{headers.map((header) => <th key={header} className="whitespace-nowrap px-3 py-3 font-semibold">{header}</th>)}</tr>; }
function ReportRow({ row, type, onView }) { const values = type === 'Status' ? [row.requestId, row.employeeName, row.department, row.progress, row.currentOffice, <Status key="status" status={row.status} />] : type === 'Returned' ? [row.requestId, row.employeeName, row.returnedBy, row.returnedOffice, formatDate(row.returnedDate), row.returnReason, <Status key="status" status={row.status} />] : type === 'Completed' ? [row.requestId, row.employeeName, row.department, row.clearanceType, formatDate(row.requestDate), formatDate(row.completionDate), row.finalHRApprovedBy, row.certificateStatus] : [row.requestId, row.employeeName, row.employeeId, row.department, row.campus, row.clearanceType, formatDate(row.requestDate), formatDate(row.lastWorkingDate), <Status key="status" status={row.status} />, row.currentOffice]; return <tr className="hover:bg-slate-50">{values.map((value, index) => <td key={index} className="whitespace-nowrap px-3 py-3">{value}</td>)}<td className="px-3 py-3"><button type="button" onClick={onView} className="inline-flex items-center gap-1 text-blue-600 hover:underline"><Eye size={13} /> View</button></td></tr>; }
function Status({ status }) { return <span className={`rounded px-2 py-1 text-[10px] font-semibold ${statusClass[status] || 'bg-slate-100 text-slate-700'}`}>{status}</span>; }
