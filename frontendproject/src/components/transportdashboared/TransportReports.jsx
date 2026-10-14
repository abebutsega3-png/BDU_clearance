import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { Activity, Bus, ClipboardList, Eye, FileSpreadsheet, FileText, History, LoaderCircle, Printer, RefreshCw, RotateCcw, ShieldCheck, Truck, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000')
  .replace(/\/api\/clearance\/?$/i, '')
  .replace(/\/api\/?$/i, '')
  .replace(/\/+$/, '');
const API_URL = `${API_BASE_URL}/api/transport/reports`;
const authConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
});

const localDateValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
};

const initialFilters = () => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    reportType: 'clearance',
    period: 'month',
    date: localDateValue(now),
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1),
    fromDate: localDateValue(monthStart),
    toDate: localDateValue(now),
    department: 'All',
    status: 'All',
    vehicle: 'All',
    vehicleType: 'All',
    employee: '',
  };
};

const reportRows = (report) => (report?.records || []).map((record) => Object.fromEntries(
  (report.columns || []).map(({ key, label, type }) => [
    label,
    type === 'date' ? formatDate(record[key]) : record[key] ?? '—',
  ]),
));

const reportTypes = [
  { value: 'clearance', label: 'Transport Clearance Report', description: 'Employee transport clearance details', icon: ClipboardList },
  { value: 'assignment', label: 'Vehicle Assignment Report', description: 'Vehicle assignment records', icon: Bus },
  { value: 'return', label: 'Vehicle Return Report', description: 'Returned vehicles and condition', icon: RotateCcw },
  { value: 'pending', label: 'Pending Clearance Report', description: 'Pending transport clearance requests', icon: Activity },
  { value: 'returned', label: 'Returned Clearance Report', description: 'Returned requests and remarks', icon: RotateCcw },
  { value: 'status', label: 'Vehicle Status Report', description: 'Current vehicle status summary', icon: Truck },
  { value: 'condition', label: 'Vehicle Condition Report', description: 'Vehicle condition and inspection', icon: ShieldCheck },
  { value: 'history', label: 'Transport Clearance History', description: 'Past clearance activity', icon: History },
];

export default function TransportReports() {
  const [searchParams] = useSearchParams();
  const requestedReportType = searchParams.get('reportType');
  const requestedEmployee = searchParams.get('employee') || '';
  const [draftFilters, setDraftFilters] = useState(() => ({
    ...initialFilters(),
    employee: requestedEmployee,
    ...(reportTypes.some(({ value }) => value === requestedReportType) ? { reportType: requestedReportType } : {}),
  }));
  const [reportFilters, setReportFilters] = useState(() => ({
    ...initialFilters(),
    employee: requestedEmployee,
    ...(reportTypes.some(({ value }) => value === requestedReportType) ? { reportType: requestedReportType } : {}),
  }));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ departments: [], vehicles: [] });
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (!reportTypes.some(({ value }) => value === requestedReportType)) return;
    setDraftFilters((current) => current.reportType === requestedReportType && current.status === 'All'
      ? current
      : { ...current, reportType: requestedReportType, status: 'All' });
    setReportFilters((current) => current.reportType === requestedReportType && current.status === 'All'
      ? current
      : { ...current, reportType: requestedReportType, status: 'All' });
  }, [requestedReportType]);

  useEffect(() => {
    if (!requestedEmployee) return;
    setDraftFilters((current) => current.employee === requestedEmployee ? current : { ...current, employee: requestedEmployee });
    setReportFilters((current) => current.employee === requestedEmployee ? current : { ...current, employee: requestedEmployee });
  }, [requestedEmployee]);

  useEffect(() => {
    const controller = new AbortController();
    const loadReport = async () => {
      setLoading(true);
      setError('');
      setReport(null);
      try {
        const response = await axios.get(API_URL, {
          ...authConfig(),
          params: {
            ...reportFilters,
            fromDate: reportFilters.period === 'custom' ? reportFilters.fromDate : '',
            toDate: reportFilters.period === 'custom' ? reportFilters.toDate : '',
          },
          signal: controller.signal,
        });
        if (!response.data?.success || !Array.isArray(response.data.columns) || !Array.isArray(response.data.records)) {
          throw new Error(response.data?.message || 'The server returned an invalid Transport report.');
        }
        setReport(response.data);
        setFilters(response.data.filters || { departments: [], vehicles: [], vehicleTypes: [] });
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.response?.data?.message || requestError.message || 'Unable to generate the Transport report.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadReport();
    return () => controller.abort();
  }, [reportFilters]);

  const updateFilter = (field, value) => setDraftFilters((current) => ({ ...current, [field]: value }));
  const generateReport = () => {
    if (draftFilters.period === 'custom'
      && (!draftFilters.fromDate || !draftFilters.toDate || draftFilters.fromDate > draftFilters.toDate)) {
      setError('Select a valid custom date range. The From Date must not be after the To Date.');
      return;
    }
    setError('');
    setCurrentPage(1);
    setReportFilters({ ...draftFilters });
  };

  const exportPdf = () => {
    if (!report) return;
    const pdf = new jsPDF({ orientation: 'landscape' });
    pdf.setFontSize(16);
    pdf.text(report.title || 'Transport Report', 14, 16);
    pdf.setFontSize(10);
    pdf.text(`Generated by: ${report.generatedBy || 'Transport Officer'}    Generated: ${formatDate(report.generatedAt)}`, 14, 25);

    const rows = reportRows(report);
    const columns = report.columns.map(({ label }) => label);
    const availableWidth = 268;
    const columnWidth = Math.min(availableWidth / Math.max(columns.length, 1), 60);
    let y = 38;
    pdf.setFontSize(8);
    const drawHeader = () => {
      let x = 14;
      columns.forEach((column) => {
        pdf.setFont(undefined, 'bold');
        pdf.text(String(column).slice(0, 24), x, y);
        x += columnWidth;
      });
      y += 6;
      pdf.setFont(undefined, 'normal');
    };
    drawHeader();
    rows.forEach((row) => {
      if (y > 190) {
        pdf.addPage();
        y = 18;
        drawHeader();
      }
      let x = 14;
      columns.forEach((column) => {
        const value = String(row[column] ?? '—');
        pdf.text(value.slice(0, Math.max(12, Math.floor(columnWidth / 1.8))), x, y);
        x += columnWidth;
      });
      y += 5;
    });
    if (report.monthly?.length) {
      pdf.addPage();
      pdf.setFontSize(14);
      pdf.text('Yearly Monthly Breakdown', 14, 16);
      pdf.setFontSize(9);
      pdf.text('Month       Requests       Approved       Returned', 14, 27);
      report.monthly.forEach((item, index) => {
        pdf.text(`${item.month.padEnd(12)} ${String(item.requests).padEnd(15)} ${String(item.approved).padEnd(15)} ${item.returned}`, 14, 35 + index * 7);
      });
    }
    pdf.save('transport-report.pdf');
  };

  const exportExcel = () => {
    if (!report) return;
    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.json_to_sheet([
      { Metric: 'Report', Value: report.title },
      { Metric: 'Generated By', Value: report.generatedBy || 'Transport Officer' },
      { Metric: 'Generated Date', Value: formatDate(report.generatedAt) },
      { Metric: 'Total Vehicles', Value: report.summary.totalVehicles },
      { Metric: 'Available Vehicles', Value: report.summary.availableVehicles },
      { Metric: 'Under Maintenance', Value: report.summary.underMaintenance },
      { Metric: 'Pending Clearance', Value: report.summary.pendingClearance },
      { Metric: 'Total Clearance Requests', Value: report.summary.totalRequests },
      { Metric: 'Cleared', Value: report.summary.approved },
      { Metric: 'Returned', Value: report.summary.returned },
    ]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(reportRows(report)), 'Requests');
    if (report.monthly?.length) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(report.monthly), 'Monthly Breakdown');
    XLSX.writeFile(workbook, `transport-${report.reportType || 'report'}.xlsx`);
  };

  const scrollToReport = () => {
    requestAnimationFrame(() => document.getElementById('transport-report-results')?.scrollIntoView({ behavior: 'smooth' }));
  };

  const summaryCards = [
    { label: 'Total Requests', value: report?.summary?.totalRequests ?? 0, tone: 'slate' },
    { label: 'Cleared', value: report?.summary?.approved ?? 0, tone: 'emerald' },
    { label: 'Returned', value: report?.summary?.returned ?? 0, tone: 'rose' },
    { label: 'Pending Clearance', value: report?.summary?.pending ?? 0, tone: 'amber' },
  ];

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div>
          <p className="text-xs font-semibold uppercase text-teal-700">Transport Office</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">Reports</h1>
          <p className="mt-1 text-xs text-slate-500">View and generate reports related to transport clearance, vehicles, and assignments.</p>
        </div>
      </header>

      <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm print:hidden">
        <h2 className="mb-2 text-xs font-bold text-slate-800">Select Report</h2>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {reportTypes.map(({ value, label, description, icon: Icon }) => (
            <button key={value} type="button" onClick={() => setDraftFilters((current) => ({ ...current, reportType: value, status: 'All' }))} aria-pressed={draftFilters.reportType === value} className={`flex min-w-0 items-center gap-2 rounded-md border px-2.5 py-2 text-left transition ${draftFilters.reportType === value ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'}`}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700"><Icon size={16} /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-semibold text-slate-800">{label}</span><span className="block truncate text-[9px] text-slate-500">{description}</span></span>
              <span className="text-slate-400">›</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm print:hidden">
        <h2 className="mb-2 border-b border-blue-100 bg-blue-50/70 px-2 py-2 text-xs font-bold text-slate-800">Filter Options</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1.3fr_1fr_1fr_1fr_auto] xl:items-end">
          <label className="text-[10px] font-semibold text-slate-600">Period<select value={draftFilters.period} onChange={(event) => updateFilter('period', event.target.value)} className="mt-1 h-9 w-full rounded border border-slate-300 bg-white px-2 text-[10px] font-normal outline-none focus:border-blue-600"><option value="week">Weekly</option><option value="month">Monthly</option><option value="year">Yearly</option><option value="custom">Custom Range</option></select></label>
          {draftFilters.period === 'month' ? (
            <label className="text-[10px] font-semibold text-slate-600">Month<input type="month" value={`${draftFilters.year}-${draftFilters.month.padStart(2, '0')}`} onChange={(event) => {
              const [year, month] = event.target.value.split('-');
              if (year && month) setDraftFilters((current) => ({ ...current, year, month }));
            }} className="mt-1 h-9 w-full rounded border border-slate-300 bg-white px-2 text-[10px] font-normal outline-none focus:border-blue-600" /></label>
          ) : draftFilters.period === 'year' ? (
            <label className="text-[10px] font-semibold text-slate-600">Year<input type="number" min="2000" max="2100" value={draftFilters.year} onChange={(event) => updateFilter('year', event.target.value)} className="mt-1 h-9 w-full rounded border border-slate-300 bg-white px-2 text-[10px] font-normal outline-none focus:border-blue-600" /></label>
          ) : draftFilters.period === 'custom' ? (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] font-semibold text-slate-600">From Date<input type="date" value={draftFilters.fromDate} onChange={(event) => updateFilter('fromDate', event.target.value)} className="mt-1 h-9 w-full rounded border border-slate-300 bg-white px-2 text-[10px] font-normal outline-none focus:border-blue-600" /></label>
              <label className="text-[10px] font-semibold text-slate-600">To Date<input type="date" value={draftFilters.toDate} onChange={(event) => updateFilter('toDate', event.target.value)} className="mt-1 h-9 w-full rounded border border-slate-300 bg-white px-2 text-[10px] font-normal outline-none focus:border-blue-600" /></label>
            </div>
          ) : (
            <p className="self-end pb-2 text-[10px] text-slate-500">Current week (Monday–Sunday)</p>
          )}
          <label className="text-[10px] font-semibold text-slate-600">Department<select value={draftFilters.department} onChange={(event) => updateFilter('department', event.target.value)} className="mt-1 h-9 w-full rounded border border-slate-300 bg-white px-2 text-[10px] font-normal outline-none focus:border-blue-600"><option value="All">All Departments</option>{filters.departments.map((department) => <option key={department}>{department}</option>)}</select></label>
          <label className="text-[10px] font-semibold text-slate-600">Status<select value={draftFilters.status} onChange={(event) => updateFilter('status', event.target.value)} className="mt-1 h-9 w-full rounded border border-slate-300 bg-white px-2 text-[10px] font-normal outline-none focus:border-blue-600"><option value="All">All Status</option>{(draftFilters.reportType === 'clearance' || ['pending', 'returned', 'history'].includes(draftFilters.reportType) ? ['Cleared', 'Returned', 'Pending'] : draftFilters.reportType === 'condition' ? ['Excellent', 'Good', 'Fair', 'Damaged', 'Critical'] : ['Available', 'Assigned', 'Under Maintenance', 'Lost']).map((option) => <option key={option}>{option}</option>)}</select></label>
          <label className="text-[10px] font-semibold text-slate-600">Vehicle Type<select value={draftFilters.vehicleType} onChange={(event) => updateFilter('vehicleType', event.target.value)} className="mt-1 h-9 w-full rounded border border-slate-300 bg-white px-2 text-[10px] font-normal outline-none focus:border-blue-600"><option value="All">All Vehicle Types</option>{(filters.vehicleTypes || []).map((type) => <option key={type}>{type}</option>)}</select></label>
          <button type="button" onClick={generateReport} disabled={loading} className="inline-flex h-9 items-center justify-center gap-1.5 rounded bg-blue-700 px-3 text-[10px] font-semibold text-white hover:bg-blue-800 disabled:opacity-60"><RefreshCw size={13} />Generate Report</button>
        </div>
      </section>

      {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800 print:hidden">{error}</p>}

      <section id="transport-report-results" className="space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{report?.title || 'Transport Report'}</h2>
            {report?.range && <p className="mt-1 text-xs text-slate-500">{formatDate(report.range.from)} – {formatDate(report.range.to)}</p>}
            {report && <p className="mt-1 text-[10px] text-slate-500">Generated by {report.generatedBy} · {formatDate(report.generatedAt)}</p>}
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button type="button" onClick={scrollToReport} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Eye size={14} />View Report</button>
            <button type="button" onClick={() => window.print()} disabled={!report} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Printer size={14} />Print</button>
            <button type="button" onClick={exportPdf} disabled={!report} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><FileText size={14} />Export PDF</button>
            <button type="button" onClick={exportExcel} disabled={!report} className="inline-flex items-center gap-1.5 rounded-md bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"><FileSpreadsheet size={14} />Export Excel</button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {summaryCards.map(({ label, value, tone }) => (
            <article key={label} className="rounded-md border border-slate-200 bg-white p-3.5 shadow-sm">
              <p className="text-[11px] font-semibold text-slate-600">{label}</p>
              <p className={`mt-2 text-2xl font-bold ${tone === 'emerald' ? 'text-emerald-700' : tone === 'rose' ? 'text-rose-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-900'}`}>{loading ? '—' : value}</p>
            </article>
          ))}
        </div>

        {report?.monthly?.length > 0 && ['year', 'yearly'].includes(report?.period) && report?.reportType === 'clearance' && (
          <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3"><h3 className="text-sm font-bold text-slate-900">Monthly Breakdown</h3><p className="mt-0.5 text-[10px] text-slate-500">Requests created and Transport decisions by month</p></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[500px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-2.5">Month</th><th className="px-4 py-2.5">Requests</th><th className="px-4 py-2.5">Approved</th><th className="px-4 py-2.5">Returned</th></tr></thead><tbody className="divide-y divide-slate-100">{report.monthly.map((item) => <tr key={item.month}><td className="px-4 py-2.5 font-medium text-slate-800">{item.month}</td><td className="px-4 py-2.5 text-slate-600">{item.requests}</td><td className="px-4 py-2.5 text-emerald-700">{item.approved}</td><td className="px-4 py-2.5 text-rose-700">{item.returned}</td></tr>)}</tbody></table></div>
          </section>
        )}

        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 bg-blue-50/70 px-3 py-2.5">
            <div><h3 className="text-xs font-bold text-slate-900">{report?.title || 'Transport Report'}</h3><p className="mt-0.5 text-[9px] text-slate-500">Filtered report records from the backend.</p></div>
            <div className="flex flex-wrap gap-1.5 print:hidden">
              <button type="button" onClick={exportExcel} disabled={!report} className="inline-flex items-center gap-1 rounded bg-emerald-700 px-2.5 py-1.5 text-[9px] font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><FileSpreadsheet size={12} />Export Excel</button>
              <button type="button" onClick={exportPdf} disabled={!report} className="inline-flex items-center gap-1 rounded bg-rose-600 px-2.5 py-1.5 text-[9px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50"><FileText size={12} />Export PDF</button>
              <button type="button" onClick={() => window.print()} disabled={!report} className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-[9px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Printer size={12} />Print</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-[10px]">
              <thead className="bg-slate-50 uppercase text-[9px] text-slate-500"><tr><th className="px-3 py-2">#</th>{(report?.columns || []).map((column) => <th key={column.key} className="px-3 py-2">{column.label}</th>)}<th className="px-3 py-2">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan={(report?.columns?.length || 0) + 2} className="px-4 py-10 text-center text-slate-500"><LoaderCircle size={16} className="mr-2 inline animate-spin" />Generating report from backend...</td></tr> : report?.records?.length ? report.records.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((record, index) => <tr key={`${record.requestId || record.plateNumber || record.metric || index}-${index}`} className="hover:bg-slate-50"><td className="px-3 py-2 text-slate-500">{(currentPage - 1) * pageSize + index + 1}</td>{report.columns.map(({ key, type }) => <td key={key} className="max-w-48 px-3 py-2 text-slate-600">{type === 'date' ? formatDate(record[key]) : String(record[key] ?? '—')}</td>)}<td className="px-3 py-2"><button type="button" onClick={() => setSelectedRecord(record)} className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-[9px] font-semibold text-white hover:bg-blue-700"><Eye size={11} />View</button></td></tr>) : <tr><td colSpan={(report?.columns?.length || 0) + 2} className="px-4 py-10 text-center text-slate-500">No report rows match these filters.</td></tr>}
              </tbody>
            </table>
          </div>
          {report?.records?.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-3 py-2 text-[9px] text-slate-500">
              <span>Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, report.records.length)} of {report.records.length} records</span>
              <div className="flex items-center gap-1">
                <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40">Previous</button>
                <span className="px-2">{currentPage} / {Math.max(1, Math.ceil(report.records.length / pageSize))}</span>
                <button type="button" disabled={currentPage >= Math.ceil(report.records.length / pageSize)} onClick={() => setCurrentPage((page) => Math.min(Math.ceil(report.records.length / pageSize), page + 1))} className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </section>
      </section>

      {selectedRecord && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedRecord(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="transport-report-record-title" className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 id="transport-report-record-title" className="font-bold text-slate-900">Report Record Details</h2>
              <button type="button" onClick={() => setSelectedRecord(null)} aria-label="Close record details" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              {(report?.columns || []).map(({ key, label, type }) => (
                <div key={key} className="rounded border border-slate-100 bg-slate-50 p-2.5">
                  <dt className="text-[9px] font-semibold uppercase text-slate-500">{label}</dt>
                  <dd className="mt-1 break-words text-xs text-slate-800">{type === 'date' ? formatDate(selectedRecord[key]) : String(selectedRecord[key] ?? '—')}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      )}
    </section>
  );
}