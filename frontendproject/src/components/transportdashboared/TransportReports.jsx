import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Eye, FileSpreadsheet, FileText, LoaderCircle, Printer, RefreshCw } from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const API_URL = 'http://localhost:3000/api/transport/reports';
const months = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: new Date(Date.UTC(2026, index, 1)).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' }),
}));

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
  return {
    period: 'daily',
    date: localDateValue(now),
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1),
    fromDate: '',
    toDate: '',
    department: 'All',
    status: 'All',
    vehicle: 'All',
    employee: '',
  };
};

const reportRows = (report) => (report?.records || []).map((record) => ({
  'Request ID': record.requestId,
  'Employee ID': record.employeeId,
  'Employee Name': record.employeeName,
  Department: record.department,
  'Vehicle No.': record.vehicleNumber,
  'Request Date': formatDate(record.requestDate),
  'Decision Date': formatDate(record.decisionDate),
  Status: record.status,
}));

export default function TransportReports() {
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [reportFilters, setReportFilters] = useState(initialFilters);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ departments: [], vehicles: [] });
  const [viewOpen, setViewOpen] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const loadReport = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(API_URL, {
          ...authConfig(),
          params: reportFilters,
          signal: controller.signal,
        });
        setReport(response.data);
        setFilters(response.data.filters || { departments: [], vehicles: [] });
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.response?.data?.message || 'Unable to generate the Transport report.');
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
    setViewOpen(true);
    setReportFilters({ ...draftFilters });
  };

  const exportPdf = () => {
    if (!report) return;
    const pdf = new jsPDF({ orientation: 'landscape' });
    pdf.setFontSize(16);
    pdf.text(report.title || 'Transport Report', 14, 16);
    pdf.setFontSize(10);
    pdf.text(`Total requests: ${report.summary.totalRequests}    Approved: ${report.summary.approved}    Returned: ${report.summary.returned}    Pending: ${report.summary.pending}`, 14, 25);
    pdf.text(`Vehicle assignments: ${report.summary.vehicleAssignments}    Vehicle returns: ${report.summary.vehicleReturns}`, 14, 32);

    const columns = ['Request ID', 'Employee ID', 'Employee Name', 'Department', 'Vehicle No.', 'Request Date', 'Decision Date', 'Status'];
    const rows = reportRows(report).map((row) => columns.map((column) => String(row[column] ?? '')));
    let y = 44;
    const columnWidths = [30, 25, 44, 38, 28, 25, 25, 22];
    pdf.setFontSize(8);
    const drawHeader = () => {
      let x = 14;
      columns.forEach((column, index) => {
        pdf.setFont(undefined, 'bold');
        pdf.text(column, x, y);
        x += columnWidths[index];
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
      row.forEach((value, index) => {
        pdf.text(value.slice(0, 36), x, y);
        x += columnWidths[index];
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
      { Metric: 'Total Clearance Requests', Value: report.summary.totalRequests },
      { Metric: 'Approved', Value: report.summary.approved },
      { Metric: 'Returned', Value: report.summary.returned },
      { Metric: 'Pending', Value: report.summary.pending },
      { Metric: 'Vehicle Assignments', Value: report.summary.vehicleAssignments },
      { Metric: 'Vehicle Returns', Value: report.summary.vehicleReturns },
    ]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(reportRows(report)), 'Requests');
    if (report.monthly?.length) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(report.monthly), 'Monthly Breakdown');
    XLSX.writeFile(workbook, 'transport-report.xlsx');
  };

  const scrollToReport = () => {
    setViewOpen(true);
    requestAnimationFrame(() => document.getElementById('transport-report-results')?.scrollIntoView({ behavior: 'smooth' }));
  };

  const summaryCards = [
    { label: 'Total Clearance Requests', value: report?.summary?.totalRequests ?? 0, tone: 'slate' },
    { label: 'Approved', value: report?.summary?.approved ?? 0, tone: 'emerald' },
    { label: 'Returned', value: report?.summary?.returned ?? 0, tone: 'rose' },
    { label: 'Pending', value: report?.summary?.pending ?? 0, tone: 'amber' },
    { label: 'Vehicle Assignments', value: report?.summary?.vehicleAssignments ?? 0, tone: 'sky' },
    { label: 'Vehicle Returns', value: report?.summary?.vehicleReturns ?? 0, tone: 'cyan' },
  ];

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div>
          <p className="text-xs font-semibold uppercase text-teal-700">Transport Office</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">Reports</h1>
          <p className="mt-1 text-xs text-slate-500">Review clearance decisions and vehicle activity by period.</p>
        </div>
      </header>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <h2 className="text-sm font-bold text-slate-900">Report Period</h2>
        <div className="mt-3 inline-flex max-w-full gap-1 overflow-x-auto rounded-md bg-slate-100 p-1" role="tablist" aria-label="Report period">
          {['daily', 'monthly', 'yearly'].map((period) => (
            <button key={period} type="button" role="tab" aria-selected={draftFilters.period === period} onClick={() => updateFilter('period', period)} className={`rounded px-4 py-2 text-xs font-semibold capitalize ${draftFilters.period === period ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
              {period}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {draftFilters.period === 'daily' && (
            <label className="text-[10px] font-semibold text-slate-600">Report Date<input type="date" value={draftFilters.date} onChange={(event) => updateFilter('date', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-normal outline-none focus:border-teal-600" /></label>
          )}
          {draftFilters.period === 'monthly' && (
            <>
              <label className="text-[10px] font-semibold text-slate-600">Year<select value={draftFilters.year} onChange={(event) => updateFilter('year', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-normal outline-none focus:border-teal-600">{Array.from({ length: 11 }, (_, index) => new Date().getFullYear() - 5 + index).map((year) => <option key={year}>{year}</option>)}</select></label>
              <label className="text-[10px] font-semibold text-slate-600">Month<select value={draftFilters.month} onChange={(event) => updateFilter('month', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-normal outline-none focus:border-teal-600">{months.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}</select></label>
            </>
          )}
          {draftFilters.period === 'yearly' && (
            <label className="text-[10px] font-semibold text-slate-600">Year<select value={draftFilters.year} onChange={(event) => updateFilter('year', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-normal outline-none focus:border-teal-600">{Array.from({ length: 11 }, (_, index) => new Date().getFullYear() - 5 + index).map((year) => <option key={year}>{year}</option>)}</select></label>
          )}
          <label className="text-[10px] font-semibold text-slate-600">Department<select value={draftFilters.department} onChange={(event) => updateFilter('department', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-normal outline-none focus:border-teal-600"><option value="All">All Departments</option>{filters.departments.map((department) => <option key={department}>{department}</option>)}</select></label>
          <label className="text-[10px] font-semibold text-slate-600">Status<select value={draftFilters.status} onChange={(event) => updateFilter('status', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-normal outline-none focus:border-teal-600"><option>All</option><option>Approved</option><option>Returned</option><option>Pending</option></select></label>
          <label className="text-[10px] font-semibold text-slate-600">Vehicle<select value={draftFilters.vehicle} onChange={(event) => updateFilter('vehicle', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-normal outline-none focus:border-teal-600"><option value="All">All Vehicles</option>{filters.vehicles.map((vehicle) => <option key={vehicle}>{vehicle}</option>)}</select></label>
          <label className="text-[10px] font-semibold text-slate-600">Employee<input value={draftFilters.employee} onChange={(event) => updateFilter('employee', event.target.value)} placeholder="Name or employee ID" className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-normal outline-none focus:border-teal-600" /></label>
          <label className="text-[10px] font-semibold text-slate-600">From Date<input type="date" value={draftFilters.fromDate} onChange={(event) => updateFilter('fromDate', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-normal outline-none focus:border-teal-600" /></label>
          <label className="text-[10px] font-semibold text-slate-600">To Date<input type="date" value={draftFilters.toDate} onChange={(event) => updateFilter('toDate', event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-normal outline-none focus:border-teal-600" /></label>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={generateReport} disabled={loading} className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"><RefreshCw size={14} />Generate Report</button>
        </div>
      </section>

      {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800 print:hidden">{error}</p>}

      <section id="transport-report-results" className="space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{report?.title || 'Transport Report'}</h2>
            {report?.range && <p className="mt-1 text-xs text-slate-500">{formatDate(report.range.from)} – {formatDate(report.range.to)}</p>}
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

        {report?.monthly?.length > 0 && (
          <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3"><h3 className="text-sm font-bold text-slate-900">Monthly Breakdown</h3><p className="mt-0.5 text-[10px] text-slate-500">Requests created and Transport decisions by month</p></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[500px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-2.5">Month</th><th className="px-4 py-2.5">Requests</th><th className="px-4 py-2.5">Approved</th><th className="px-4 py-2.5">Returned</th></tr></thead><tbody className="divide-y divide-slate-100">{report.monthly.map((item) => <tr key={item.month}><td className="px-4 py-2.5 font-medium text-slate-800">{item.month}</td><td className="px-4 py-2.5 text-slate-600">{item.requests}</td><td className="px-4 py-2.5 text-emerald-700">{item.approved}</td><td className="px-4 py-2.5 text-rose-700">{item.returned}</td></tr>)}</tbody></table></div>
          </section>
        )}

        {viewOpen && (
          <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3"><h3 className="text-sm font-bold text-slate-900">Report Details</h3><p className="mt-0.5 text-[10px] text-slate-500">Transport clearance requests handled in the selected period.</p></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Request ID</th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Request Date</th><th className="px-4 py-3">Decision Date</th><th className="px-4 py-3">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? <tr><td colSpan="7" className="px-4 py-10 text-center text-slate-500"><LoaderCircle size={16} className="mr-2 inline animate-spin" />Generating report...</td></tr> : report?.records?.length ? report.records.map((record, index) => <tr key={`${record.requestId}-${record.decisionDate || 'pending'}-${index}`}><td className="whitespace-nowrap px-4 py-3 font-mono text-teal-800">{record.requestId}</td><td className="whitespace-nowrap px-4 py-3"><span className="font-medium text-slate-800">{record.employeeName}</span><span className="mt-0.5 block text-[10px] text-slate-500">{record.employeeId}</span></td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.department}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.vehicleNumber}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(record.requestDate)}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(record.decisionDate)}</td><td className="px-4 py-3"><span className={`rounded px-2 py-1 text-[10px] font-semibold ${record.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : record.status === 'Returned' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{record.status}</span></td></tr>) : <tr><td colSpan="7" className="px-4 py-10 text-center text-slate-500">No report rows match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </section>
    </section>
  );
}