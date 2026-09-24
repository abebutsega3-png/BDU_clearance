import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart3, FileSpreadsheet, FileText, Printer, Search, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const apiUrl = 'http://localhost:3000/api/library/reports';
const requestHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

const reportTypes = [
  ['clearance', 'Library Clearance Report'],
  ['responsibility', 'Outstanding Library Materials'],
  ['history', 'Clearance History Report'],
];

const getStatus = (request) => request.libraryReportStatus || request.libraryStatus || request.status || 'Pending';
const getDate = (request) => request.requestDate || request.createdAt || request.libraryDecisionDate || request.updatedAt || request.submittedDate;

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const displayStatus = (status) => ({
  Approved: 'Approved',
  Rejected: 'Returned',
  Returned: 'Returned',
  Pending: 'Pending',
  'In Progress': 'Under Review',
  'Under Review': 'Under Review',
}[status] || status);

export default function LibraryReport() {
  const [requests, setRequests] = useState([]);
  const [reportType, setReportType] = useState('clearance');
  const [reportPeriod, setReportPeriod] = useState('Custom Date Range');
  const [periodValue, setPeriodValue] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [status, setStatus] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [campus, setCampus] = useState('');
  const [clearanceType, setClearanceType] = useState('');
  const [preview, setPreview] = useState(null);
  const [reportSummary, setReportSummary] = useState(null);
  const [error, setError] = useState('');
  const [responsibility, setResponsibility] = useState(null);

  useEffect(() => {
    axios.get(apiUrl, { headers: requestHeaders() })
      .then(({ data }) => {
        setRequests(data?.rows || []);
        setReportSummary(data);
        setResponsibility(data?.responsibility || null);
      })
      .catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load library clearance requests.'));
  }, []);

  const filterRequests = () => requests.filter((request) => {
      const currentStatus = getStatus(request);
      const date = new Date(getDate(request));
      const searchText = [
        request.employeeName,
        request.employeeId,
        request.employee?.fullName,
        request.requestId,
        request.employee?.name,
      ].filter(Boolean).join(' ').toLowerCase();

      const normalizedStatus = displayStatus(currentStatus);
      const typeMatches = reportType === 'summary' || reportType === 'all'
        || (reportType === 'approved' && ['Completed', 'Approved'].includes(currentStatus))
        || (reportType === 'returned' && ['Rejected', 'Returned'].includes(currentStatus))
        || (reportType === 'pending' && currentStatus === 'Pending')
        || (reportType === 'completed' && currentStatus === 'Completed');

      const inDateRange = (!fromDate || date >= new Date(`${fromDate}T00:00:00`))
        && (!toDate || date <= new Date(`${toDate}T23:59:59`));

      return inDateRange && typeMatches
        && (!status || normalizedStatus === status || currentStatus === status)
        && (!employeeSearch.trim() || searchText.includes(employeeSearch.trim().toLowerCase()))
        && (!department || String(request.department?.name || request.department || '') === department);
  });

  const generateReport = async (event) => {
    event.preventDefault();

    if (fromDate && toDate && fromDate > toDate) {
      setError('From Date cannot be later than To Date.');
      return;
    }

    try {
      const { data } = await axios.get(apiUrl, {
        headers: requestHeaders(),
        params: { reportType, reportPeriod, periodValue, fromDate, toDate, status, employee: employeeSearch, department, campus, clearanceType },
      });
      setRequests(data?.rows || []);
      setReportSummary(data);
      setResponsibility(data?.responsibility || null);
      setPreview({ rows: data?.rows || [], sentToHR: false });
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to generate the library report.');
    }
  };

  const reset = () => {
    setReportType('clearance');
    setReportPeriod('Custom Date Range');
    setPeriodValue('');
    setFromDate('');
    setToDate('');
    setStatus('');
    setEmployeeSearch('');
    setDepartment('');
    setCampus('');
    setClearanceType('');
    setPreview(null);
    setReportSummary(null);
    setError('');
  };

  const exportExcel = () => {
    if (!preview) return;

    const exportRows = preview.rows.map((request) => ({
      'Request ID': request.requestId || '',
      Employee: request.employeeName || request.employee?.fullName || request.employeeId || '',
      'Employee ID': request.employeeId || '',
      Department: request.department?.name || request.department || '',
      'Request Date': formatDate(getDate(request)),
      Status: displayStatus(getStatus(request)),
      'Approved By': request.approvedBy || '',
      'Return Reason': request.returnReason || ''
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(exportRows), 'Library Report');
    XLSX.writeFile(workbook, 'library-clearance-report.xlsx');
  };

  const exportPdf = () => {
    if (!rows.length) return;
    const pdf = new jsPDF({ orientation: 'landscape' });
    pdf.text('Bahir Dar University - Library Report', 14, 15);
    autoTable(pdf, {
      head: [['Request ID', 'Employee', 'Employee ID', 'Department', 'Request Date', 'Status', 'Approved By', 'Return Reason']],
      body: rows.map((request) => [request.requestId || '', request.employeeName || '', request.employeeId || '', request.department || '', formatDate(getDate(request)), displayStatus(getStatus(request)), request.approvedBy || '-', request.returnReason || '-']),
      startY: 22,
      styles: { fontSize: 8 }
    });
    pdf.save('library-clearance-report.pdf');
  };

  const sendToHR = async () => {
    const reportRows = preview?.rows || filterRequests();
    if (!reportRows.length) {
      setError('There are no matching requests to send to HR.');
      return;
    }

    const reportLabel = reportTypes.find(([value]) => value === reportType)?.[1] || 'Employee Library Clearance Report';

    try {
      await axios.post(
        'http://localhost:3000/api/notifications',
        {
          title: 'Library Clearance Report',
          message: `${reportLabel} generated for ${formatDate(fromDate)} - ${formatDate(toDate)}. ${reportRows.length} employee clearance requests are included.`,
          targetName: 'HR Officer',
          type: 'ready_review',
          actionText: 'View Report',
          actionLink: '/hr-office/reports',
        },
        { headers: requestHeaders() }
      );

      setError('');
      setPreview((current) => ({ rows: current?.rows || reportRows, sentToHR: true }));
    } catch {
      setError('Unable to send the report to HR Officer.');
    }
  };

  const departments = [...new Set(requests.map((request) => request.department?.name || request.department).filter(Boolean))].sort();
  const rows = preview?.rows || requests;
  const localCounts = {
    total: rows.length,
    approved: rows.filter((request) => ['Completed', 'Approved'].includes(getStatus(request))).length,
    returned: rows.filter((request) => ['Rejected', 'Returned'].includes(getStatus(request))).length,
    pending: rows.filter((request) => getStatus(request) === 'Pending').length,
    underReview: rows.filter((request) => ['In Progress', 'Under Review'].includes(getStatus(request))).length,
    completed: rows.filter((request) => getStatus(request) === 'Completed').length,
  };
  const counts = reportSummary?.counts || localCounts;

  const localDepartmentCounts = Object.entries(rows.reduce((result, request) => {
    const name = request.department?.name || request.department || 'Other';
    result[name] = (result[name] || 0) + 1;
    return result;
  }, {})).sort(([, first], [, second]) => second - first).slice(0, 6);
  const departmentCounts = reportSummary?.byDepartment
    ? Object.entries(reportSummary.byDepartment).sort(([, first], [, second]) => second - first).slice(0, 6)
    : localDepartmentCounts;

  const localTrend = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - index));
    const label = day.toLocaleDateString('en-US', { weekday: 'short' });
    const value = rows.filter((request) => new Date(getDate(request)).toDateString() === day.toDateString()).length;
    return { label, value };
  });
  const trend = reportSummary?.trend?.map((item) => ({ label: item.label, value: item.count })) || localTrend;

  const controlClass = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-teal-600';

  return (
    <main className="min-h-screen bg-[#f5f7fa] p-4 text-slate-800 md:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-700">Library Officer / Reports</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">Library Reports Summary</h1>
          <p className="mt-1 text-xs text-slate-500">Overview of all library clearance requests reviewed.</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button type="button" onClick={exportExcel} className="action-button"><FileSpreadsheet size={13} /> Export Excel</button>
          <button type="button" onClick={exportPdf} className="action-button"><FileText size={13} /> Export PDF</button>
          <button type="button" onClick={() => window.print()} className="action-button"><Printer size={13} /> Print</button>
        </div>
      </div>

      <form onSubmit={generateReport} className="mb-4 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          <Field label="Report Period">
            <select value={reportPeriod} onChange={(event) => { setReportPeriod(event.target.value); setPeriodValue(''); }} className={controlClass}><option>Weekly</option><option>Monthly</option><option>Yearly</option><option>Custom Date Range</option></select>
          </Field>
          {reportPeriod === 'Weekly' && <Field label="Select Week"><input type="week" required value={periodValue} onChange={(event) => setPeriodValue(event.target.value)} className={controlClass} /></Field>}
          {reportPeriod === 'Monthly' && <Field label="Select Month"><input type="month" required value={periodValue} onChange={(event) => setPeriodValue(event.target.value)} className={controlClass} /></Field>}
          {reportPeriod === 'Yearly' && <Field label="Select Year"><input type="number" min="2000" max="2100" required value={periodValue} onChange={(event) => setPeriodValue(event.target.value)} className={controlClass} /></Field>}
          <Field label="Report Type">
            <select value={reportType} onChange={(event) => setReportType(event.target.value)} className={controlClass}>
              {reportTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>

          <Field label="From Date">
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className={controlClass} />
          </Field>

          <Field label="To Date">
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className={controlClass} />
          </Field>

          <Field label="Status">
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={controlClass}>
              <option value="">All</option>
              <option value="Approved">Approved</option>
              <option value="Returned">Returned</option>
              <option value="Pending">Pending</option>
              <option value="Under Review">Under Review</option>
              <option value="Completed">Completed</option>
            </select>
          </Field>

          <Field label="Employee">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                value={employeeSearch}
                onChange={(event) => setEmployeeSearch(event.target.value)}
                placeholder="Search Employee / ID"
                className={`${controlClass} pl-9`}
              />
            </div>
          </Field>

          <Field label="Department">
            <select value={department} onChange={(event) => setDepartment(event.target.value)} className={controlClass}>
              <option value="">All Departments</option>
              {departments.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Campus"><select value={campus} onChange={(event) => setCampus(event.target.value)} className={controlClass}><option value="">All Campuses</option><option>Main Campus</option><option>BIT Campus</option></select></Field>
          <Field label="Clearance Type"><select value={clearanceType} onChange={(event) => setClearanceType(event.target.value)} className={controlClass}><option value="">All Types</option><option>Resignation</option><option>Graduation</option><option>Transfer</option><option>Retirement</option></select></Field>
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={reset} className="action-button">
            <X size={14} /> Reset
          </button>
          <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-xs font-semibold text-white">
            <BarChart3 size={15} /> Generate Report
          </button>
        </div>
      </form>

      {error && <p className="mb-3 text-xs font-semibold text-rose-600">{error}</p>}
      <LibrarySummaryCards counts={counts} />
      <LibraryClearanceTable rows={rows} />
      <ResponsibilityPanel data={responsibility} />
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.15fr_1.35fr]">
        <ChartPanel title="Requests by Status"><StatusChart counts={counts} /></ChartPanel>
        <ChartPanel title="Requests by Department"><DepartmentChart values={departmentCounts} total={counts.total} /></ChartPanel>
        <ChartPanel title="Trend (Last 7 Days)"><TrendChart values={trend} /></ChartPanel>
      </div>

      <RecentRequests rows={rows.slice(0, 8)} onSendToHR={sendToHR} sentToHR={Boolean(preview?.sentToHR)} />
    </main>
  );
}

function LibrarySummaryCards({ counts }) {
  return <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{[
    ['Total Requests', counts.total, 'text-slate-900'], ['Pending', counts.pending, 'text-amber-700'], ['Under Review', counts.underReview, 'text-blue-700'],
    ['Approved', counts.approved, 'text-emerald-700'], ['Returned', counts.returned, 'text-rose-700'], ['Completed', counts.completed, 'text-violet-700']
  ].map(([label, value, tone]) => <div key={label} className="rounded-md border border-slate-200 bg-white p-3 shadow-sm"><p className="text-[10px] text-slate-500">{label}</p><p className={`mt-1 text-xl font-bold ${tone}`}>{value || 0}</p></div>)}</div>;
}

function LibraryClearanceTable({ rows }) {
  return <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-3 py-3"><h2 className="text-xs font-bold text-slate-900">Library Clearance Report</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-[10px]"><thead className="bg-slate-50 text-[9px] uppercase tracking-wide text-slate-500"><tr>{['Employee', 'Employee ID', 'Department', 'Request Date', 'Library Status', 'Approved By', 'Decision Date', 'Return Reason'].map((heading) => <th key={heading} className="px-3 py-2">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.length ? rows.map((request, index) => <tr key={request._id || request.requestId || index}><td className="px-3 py-2 font-semibold text-slate-800">{request.employeeName || '-'}</td><td className="px-3 py-2">{request.employeeId || '-'}</td><td className="px-3 py-2">{request.department || '-'}</td><td className="px-3 py-2">{formatDate(getDate(request))}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-1 font-semibold ${getStatusBadgeClass(getStatus(request))}`}>{displayStatus(getStatus(request))}</span></td><td className="px-3 py-2">{request.approvedBy || '-'}</td><td className="px-3 py-2">{formatDate(request.libraryDecisionDate)}</td><td className="max-w-48 truncate px-3 py-2">{request.returnReason || '-'}</td></tr>) : <tr><td colSpan="8" className="px-3 py-8 text-center text-slate-400">No library clearance records match the selected filters.</td></tr>}</tbody></table></div></section>;
}

function ResponsibilityPanel({ data }) {
  const metrics = [['Total Checked', data?.totalChecked], ['No Outstanding', data?.noOutstanding], ['Outstanding Books', data?.outstandingBooks], ['Lost / Damaged', data?.lostDamaged], ['Returned Materials', data?.returnedMaterials]];
  return <section className="mt-4 rounded-md border border-slate-200 bg-white p-3 shadow-sm"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-xs font-bold text-slate-900">Library Responsibility Report</h2><p className="mt-1 text-[10px] text-slate-500">Borrowed, outstanding, lost/damaged, and returned library materials.</p></div><strong className="text-[10px] text-teal-700">Borrowed: {data?.borrowedBooks || 0}</strong></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{metrics.map(([label, value]) => <div key={label} className="rounded border border-slate-100 bg-slate-50 p-3"><p className="text-[10px] text-slate-500">{label}</p><strong className="mt-1 block text-lg text-slate-800">{value || 0}</strong></div>)}</div></section>;
}

function ChartPanel({ title, children }) {
  return <section className="min-h-[190px] rounded-md border border-slate-200 bg-white p-3 shadow-sm"><h2 className="mb-3 text-xs font-bold text-slate-900">{title}</h2>{children}</section>;
}

function StatusChart({ counts }) {
  const segments = [['Pending', counts.pending, '#f59e0b'], ['Under Review', counts.underReview, '#6366f1'], ['Returned', counts.returned, '#ef4444'], ['Cleared / Approved', counts.approved, '#10b981']];
  const total = segments.reduce((sum, [, value]) => sum + value, 0);
  let cursor = 0;
  const gradient = segments.map(([, value, color]) => { const start = total ? cursor / total * 100 : 0; cursor += value; return `${color} ${start}% ${total ? cursor / total * 100 : 0}%`; }).join(', ');

  return <div className="flex items-center justify-center gap-5"><div className="relative h-28 w-28 rounded-full" style={{ background: `conic-gradient(${gradient || '#e2e8f0 0 100%'})` }}><div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white"><strong className="text-lg text-slate-900">{total}</strong><span className="text-[9px] text-slate-400">Total</span></div></div><div className="space-y-2">{segments.map(([label, value, color]) => <div key={label} className="flex items-center gap-2 text-[10px] text-slate-600"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label} ({value})</div>)}</div></div>;
}

function DepartmentChart({ values, total }) {
  return <div className="space-y-2.5">{values.length ? values.map(([label, value], index) => <div key={label} className="flex items-center gap-2 text-[10px]"><span className="w-28 truncate text-slate-600">{label}</span><div className="h-2 flex-1 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-teal-500" style={{ width: `${total ? Math.max(5, value / total * 100) : 0}%`, opacity: 1 - index * 0.08 }} /></div><strong className="w-5 text-right text-slate-700">{value}</strong></div>) : <p className="py-8 text-center text-xs text-slate-400">No department data</p>}</div>;
}

function TrendChart({ values }) {
  const max = Math.max(...values.map((item) => item.value), 1);
  return <div className="flex h-32 items-end gap-2 border-b border-l border-slate-200 px-3 pb-0 pt-2">{values.map((item) => <div key={item.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1"><span className="text-[9px] text-slate-500">{item.value || ''}</span><div className="w-full max-w-5 rounded-t bg-blue-500" style={{ height: `${Math.max(item.value ? 10 : 2, item.value / max * 78)}%` }} /><span className="text-[9px] text-slate-400">{item.label}</span></div>)}</div>;
}

function RecentRequests({ rows, onSendToHR, sentToHR }) {
  return <section className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-3 py-3"><h2 className="text-xs font-bold text-slate-900">Recent Library Clearance Requests</h2><button type="button" onClick={onSendToHR} className="text-[10px] font-semibold text-teal-700">{sentToHR ? 'Sent to HR' : 'Send summary to HR'}</button></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-[10px]"><thead className="bg-slate-50 text-[9px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Request No.</th><th className="px-3 py-2">Employee Name</th><th className="px-3 py-2">Department</th><th className="px-3 py-2">Request Date</th><th className="px-3 py-2">Current Stage</th><th className="px-3 py-2">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.length ? rows.map((request, index) => <tr key={request._id || request.requestId || index} className="text-slate-600"><td className="px-3 py-2">{index + 1}</td><td className="px-3 py-2 font-medium text-slate-700">{request.requestId || '-'}</td><td className="px-3 py-2">{request.employeeName || request.employee?.fullName || request.employeeId || '-'}</td><td className="px-3 py-2">{request.department?.name || request.department || '-'}</td><td className="px-3 py-2">{formatDate(getDate(request))}</td><td className="px-3 py-2">Library</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${getStatusBadgeClass(getStatus(request))}`}>{displayStatus(getStatus(request))}</span></td></tr>) : <tr><td colSpan="7" className="px-3 py-8 text-center text-slate-400">No library clearance requests found.</td></tr>}</tbody></table></div><p className="border-t border-slate-100 px-3 py-2 text-[9px] text-slate-400">Showing {rows.length} recent requests</p></section>;
}

export function ReportPreview({ rows, counts, title, fromDate, toDate, onExport, onSendToHR, sentToHR }) {
  return (
    <section className="report-preview mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">Period: {formatDate(fromDate)} - {formatDate(toDate)}</p>
        </div>

        <div className="flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={onExport} className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">
            <FileSpreadsheet size={14} /> Export Excel
          </button>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
            <Printer size={14} /> Print
          </button>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-white">
            <FileText size={14} /> Export PDF
          </button>
          <button
            type="button"
            onClick={onSendToHR}
            className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs font-semibold ${
              sentToHR ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'bg-blue-600 text-white'
            }`}
          >
            <FileText size={14} /> {sentToHR ? 'Sent to HR' : 'Send to HR'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-6">
        <Metric label="Total Requests" value={counts.total} />
        <Metric label="Approved" value={counts.approved} tone="text-emerald-700" />
        <Metric label="Returned" value={counts.returned} tone="text-rose-700" />
        <Metric label="Pending" value={counts.pending} tone="text-amber-700" />
        <Metric label="Under Review" value={counts.underReview} tone="text-blue-700" />
        <Metric label="Completed" value={counts.completed} tone="text-violet-700" />
      </div>

      <div className="overflow-x-auto p-5">
        <table className="w-full min-w-[700px] text-left text-xs">
          <thead className="border-b border-slate-200 text-[10px] uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">Request ID</th>
              <th className="px-3 py-3">Employee</th>
              <th className="px-3 py-3">Department</th>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length ? rows.map((request) => (
              <tr key={request._id || request.requestId || `${request.employeeId}-${request.requestDate}`}>
                <td className="px-3 py-3 font-medium text-slate-700">{request.requestId || '—'}</td>
                <td className="px-3 py-3">{request.employeeName || request.employee?.fullName || request.employeeId || '—'}</td>
                <td className="px-3 py-3">{request.department?.name || request.department || '—'}</td>
                <td className="px-3 py-3">{formatDate(getDate(request))}</td>
                <td className="px-3 py-3">
                  <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${getStatusBadgeClass(getStatus(request))}`}>
                    {displayStatus(getStatus(request))}
                  </span>
                </td>
              </tr>
            )) : (
              <tr>
                <td className="px-3 py-8 text-center text-slate-400" colSpan="5">No matching employee clearance requests found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-xs font-semibold text-slate-700">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function Metric({ label, value, tone = 'text-slate-900' }) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Completed':
    case 'Approved':
      return 'bg-emerald-100 text-emerald-700';
    case 'Rejected':
    case 'Returned':
      return 'bg-rose-100 text-rose-700';
    case 'Pending':
      return 'bg-amber-100 text-amber-700';
    case 'In Progress':
    case 'Under Review':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}