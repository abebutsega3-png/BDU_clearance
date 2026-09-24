import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  Flag,
  Loader2,
  RotateCcw,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Package,
  Send,
  XCircle
} from 'lucide-react';

const PROPERTY_REPORTS_API = 'http://localhost:3000/api/property/reports/property-clearance';

export default function propertreport() {
  const [reportType, setReportType] = useState('Property Clearance Summary');
  const [reportPeriod, setReportPeriod] = useState('Custom Date Range');
  const [periodValue, setPeriodValue] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [status, setStatus] = useState('All');
  const [department, setDepartment] = useState('All');
  const [campus, setCampus] = useState('All');
  const [selectedRow, setSelectedRow] = useState(null);
  const [showReportGuide, setShowReportGuide] = useState(false);

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const isSummary = reportType === 'Property Clearance Summary';

  const normalizeReportStatus = (item) => {
    const savedStatus = String(item?.propertyStatus || '').trim().toLowerCase();
    if (savedStatus === 'completed') return 'Completed';
    if (['approved', 'cleared', 'clear'].includes(savedStatus)) return 'Approved';
    if (['returned', 'rejected', 'not clear'].includes(savedStatus)) return 'Returned';
    if (['under review', 'in progress', 'review'].includes(savedStatus)) return 'Under Review';
    const workflowStep = Array.isArray(item?.workflow)
      ? item.workflow.find((step) => String(step.office || '').toLowerCase().includes('property'))
      : null;
    const workflowStatus = String(workflowStep?.status || '').trim().toLowerCase();
    if (workflowStatus === 'completed') return 'Completed';
    if (['approved', 'cleared', 'clear'].includes(workflowStatus)) return 'Approved';
    if (['returned', 'rejected', 'not clear'].includes(workflowStatus)) return 'Returned';
    if (['under review', 'in progress', 'review'].includes(workflowStatus)) return 'Under Review';
    return item?.propertyStatus || item?.clearanceStatus || 'Pending';
  };

  const normalizeReportPayload = (payload, requestedStatus = 'All') => {
    const allData = (payload.data || []).map((item) => ({ ...item, propertyStatus: normalizeReportStatus(item) }));
    const data = requestedStatus === 'All'
      ? allData
      : allData.filter((item) => item.propertyStatus === requestedStatus);
    const count = (value) => data.filter((item) => item.propertyStatus === value).length;
    return {
      ...payload,
      data,
      summary: {
        totalRequests: data.length,
        approved: count('Approved'),
        returned: count('Returned'),
        pending: count('Pending'),
        underReview: count('Under Review'),
        completed: count('Completed')
      }
    };
  };

  const fetchReport = async (event, filterValues = {}) => {
    event?.preventDefault();
    setLoading(true);
    try {
      const response = await axios.get(PROPERTY_REPORTS_API, {
        params: {
          reportType: filterValues.reportType ?? reportType,
          reportPeriod: filterValues.reportPeriod ?? reportPeriod,
          periodValue: filterValues.periodValue ?? periodValue,
          fromDate: filterValues.fromDate ?? fromDate,
          toDate: filterValues.toDate ?? toDate,
          status: 'All',
          department: filterValues.department ?? department,
          campus: filterValues.campus ?? campus,
          _t: Date.now()
        }
      });
      if (response.data.success) {
        const requestedStatus = filterValues.status ?? status;
        setReportData(normalizeReportPayload(response.data, requestedStatus));
      }
    } catch (error) {
      alert('ሪፖርቱን ከዳታቤዝ ለማምጣት አልተቻለም።');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') fetchReport();
    };
    const refreshInterval = window.setInterval(refreshWhenVisible, 10000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [reportType, reportPeriod, periodValue, fromDate, toDate, status, department, campus]);

  const handleGenerateReport = async (e) => {
    await fetchReport(e);
  };

  const handleQuickReport = async (kind) => {
    const outstanding = kind === 'outstanding';
    const returned = kind === 'returned';
    const nextReportType = outstanding ? 'Outstanding Property Report' : 'Property Clearance Summary';
    const nextStatus = returned ? 'Returned' : 'All';

    setReportType(nextReportType);
    setStatus(nextStatus);
    setCurrentPage(1);
    await fetchReport(null, {
      reportType: nextReportType,
      fromDate,
      toDate,
      status: nextStatus,
      department,
      campus
    });
  };

  const handleReset = () => {
    setFromDate('');
    setToDate('');
    setStatus('All');
    setDepartment('All');
    setCampus('All');
    setReportType('Property Clearance Summary');
    setReportPeriod('Custom Date Range');
    setPeriodValue('');
    setCurrentPage(1);
    fetchReport(null, {
      reportType: 'Property Clearance Summary',
      reportPeriod: 'Custom Date Range',
      periodValue: '',
      fromDate: '',
      toDate: '',
      status: 'All',
      department: 'All',
      campus: 'All'
    });
  };

  const handlePrint = () => window.print();

  const statusClass = (value) => ({
    Approved: 'bg-emerald-100 text-emerald-700',
    Returned: 'bg-rose-100 text-rose-700',
    Pending: 'bg-amber-100 text-amber-700',
    'Under Review': 'bg-violet-100 text-violet-700',
    Completed: 'bg-cyan-100 text-cyan-700'
  }[value] || 'bg-slate-100 text-slate-600');

  const formatDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-US');
  };

  const handleExportExcel = () => {
    if (!reportData?.data?.length) return;
    const rows = reportData.reportType === 'Outstanding Property Report'
      ? reportData.data.map((item) => ({
          'Employee Name': item.employeeName,
          'Employee ID': item.employeeId,
          Department: item.department,
          'Request ID': item.requestId,
          'Property Name': item.propertyName,
          'Property Status': item.propertyStatus,
          'Clearance Status': item.clearanceStatus,
          Date: formatDate(item.date)
        }))
      : reportData.data.map((item) => ({
          'Request ID': item.requestId,
          'Employee Name': item.employeeName,
          Department: item.department,
          Campus: item.campus,
          Date: formatDate(item.requestDate),
          Status: item.propertyStatus
        }));
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Property Report');
    XLSX.writeFile(workbook, `${reportType.replaceAll(' ', '-')}.xlsx`);
  };

  const handleExportPdf = () => {
    if (!reportData?.data?.length) return;
    const pdf = new jsPDF({ orientation: 'landscape' });
    pdf.text(`Bahir Dar University - ${reportData.reportType}`, 14, 15);
    const outstanding = reportData.reportType === 'Outstanding Property Report';
    const headers = outstanding
      ? [['Employee Name', 'Employee ID', 'Department', 'Request ID', 'Property Name', 'Property Status', 'Clearance Status', 'Date']]
      : [['Request ID', 'Employee Name', 'Department', 'Campus', 'Date', 'Status']];
    const rows = reportData.data.map((item) => outstanding
      ? [item.employeeName, item.employeeId, item.department, item.requestId, item.propertyName, item.propertyStatus, item.clearanceStatus, formatDate(item.date)]
      : [item.requestId, item.employeeName, item.department, item.campus, formatDate(item.requestDate), item.propertyStatus]);
    autoTable(pdf, { head: headers, body: rows, startY: 22, styles: { fontSize: 8 } });
    pdf.save(`${reportType.replaceAll(' ', '-')}.pdf`);
  };

  const summary = reportData?.summary || {};
  const rows = reportData?.data || [];
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const visibleRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const metrics = [
    ['Total Requests', summary.totalRequests || 0, FileCheck2, 'bg-blue-50 text-blue-700'],
    ['Pending', summary.pending || 0, Clock3, 'bg-amber-50 text-amber-700'],
    ['Under Review', summary.underReview || 0, ClipboardList, 'bg-violet-50 text-violet-700'],
    ['Approved', summary.approved || 0, CheckCircle2, 'bg-emerald-50 text-emerald-700'],
    ['Returned', summary.returned || 0, XCircle, 'bg-rose-50 text-rose-700'],
    ['Completed', summary.completed || 0, Flag, 'bg-cyan-50 text-cyan-700']
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fa] p-4 text-[11px] text-slate-700 sm:p-5 print:bg-white">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-900">Property Officer Reports</h1>
          <p className="mt-1 text-[10px] text-slate-500">Reports <span className="mx-1 text-slate-300">/</span> Property Officer Reports</p>
        </div>
        <button type="button" onClick={() => setShowReportGuide(true)} className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-2 text-[10px] font-semibold text-white shadow-sm hover:bg-blue-700">
          <ClipboardList size={13} /> View Report Guide
        </button>
      </div>

      <form onSubmit={(event) => { setCurrentPage(1); handleGenerateReport(event); }} className="rounded border border-slate-200 bg-white p-3 shadow-sm print:hidden">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-6">
          <label className="font-semibold text-slate-600">Report Period<select value={reportPeriod} onChange={(event) => { setReportPeriod(event.target.value); setPeriodValue(''); }} className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-2 font-normal outline-none focus:border-blue-500"><option>Weekly</option><option>Monthly</option><option>Yearly</option><option>Custom Date Range</option></select></label>
          {reportPeriod === 'Weekly' && <label className="font-semibold text-slate-600">Select Week<input type="week" value={periodValue} onChange={(event) => setPeriodValue(event.target.value)} className="mt-1 w-full rounded border border-slate-200 px-2 py-2 font-normal text-slate-700 outline-none focus:border-blue-500" required /></label>}
          {reportPeriod === 'Monthly' && <label className="font-semibold text-slate-600">Select Month<input type="month" value={periodValue} onChange={(event) => setPeriodValue(event.target.value)} className="mt-1 w-full rounded border border-slate-200 px-2 py-2 font-normal text-slate-700 outline-none focus:border-blue-500" required /></label>}
          {reportPeriod === 'Yearly' && <label className="font-semibold text-slate-600">Select Year<input type="number" min="2000" max="2100" value={periodValue} onChange={(event) => setPeriodValue(event.target.value)} placeholder="2026" className="mt-1 w-full rounded border border-slate-200 px-2 py-2 font-normal text-slate-700 outline-none focus:border-blue-500" required /></label>}
          {reportPeriod === 'Custom Date Range' && <><label className="font-semibold text-slate-600">From Date<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="mt-1 w-full rounded border border-slate-200 px-2 py-2 font-normal text-slate-700 outline-none focus:border-blue-500" /></label><label className="font-semibold text-slate-600">To Date<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="mt-1 w-full rounded border border-slate-200 px-2 py-2 font-normal text-slate-700 outline-none focus:border-blue-500" /></label></>}
          <label className="font-semibold text-slate-600">Campus<select value={campus} onChange={(event) => setCampus(event.target.value)} className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-2 font-normal outline-none focus:border-blue-500"><option value="All">All Campuses</option><option>Main Campus</option><option>BIT Campus</option></select></label>
          <label className="font-semibold text-slate-600">Department<select value={department} onChange={(event) => setDepartment(event.target.value)} className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-2 font-normal outline-none focus:border-blue-500"><option value="All">All Departments</option><option>ICT</option><option>Finance</option><option>HR</option></select></label>
          <label className="font-semibold text-slate-600">Status<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-2 font-normal outline-none focus:border-blue-500"><option value="All">All Statuses</option><option>Approved</option><option>Pending</option><option>Under Review</option><option>Returned</option><option>Completed</option></select></label>
          <label className="font-semibold text-slate-600">Clearance Type<select value={reportType} onChange={(event) => setReportType(event.target.value)} className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-2 font-normal outline-none focus:border-blue-500"><option>Property Clearance Summary</option><option>Outstanding Property Report</option></select></label>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button type="submit" disabled={loading} className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"><Search size={13} /> {loading ? 'Generating...' : 'Generate Report'}</button>
          <button type="button" onClick={handleReset} className="inline-flex items-center gap-1.5 rounded border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"><RotateCcw size={13} /> Reset</button>
        </div>
      </form>

      {loading && !reportData ? <div className="flex items-center justify-center gap-2 py-16 text-slate-500"><Loader2 className="animate-spin" size={18} /> Loading property report...</div> : reportData && <>
        <div className="my-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {metrics.map(([label, value, Icon, tone]) => <div key={label} className={`rounded border border-white p-3 shadow-sm ${tone}`}><div className="flex items-center justify-between"><span className="font-semibold">{label}</span><Icon size={16} /></div><strong className="mt-1 block text-xl text-slate-800">{value}</strong></div>)}
        </div>
        <section className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5"><h2 className="font-bold text-slate-800">{reportData.reportType}</h2><div className="flex gap-1.5"><button type="button" onClick={handleExportPdf} className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1.5 font-semibold hover:bg-slate-50"><Download size={12} /> Export PDF</button><button type="button" onClick={handleExportExcel} disabled={!rows.length} className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1.5 font-semibold text-white disabled:opacity-50"><Download size={12} /> Export Excel</button><button type="button" onClick={handlePrint} className="rounded bg-blue-600 px-2 py-1.5 font-semibold text-white">Print</button></div></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="bg-slate-50 text-[10px] font-bold text-slate-500"><tr>{(reportData.reportType === 'Outstanding Property Report' ? ['No.', 'Employee Name', 'Employee ID', 'Department', 'Campus', 'Property', 'Status', 'Action'] : ['No.', 'Employee Name', 'Employee ID', 'Department', 'Campus', 'Clearance Type', 'Request Date', 'Property Status', 'Action']).map((heading) => <th key={heading} className="px-3 py-2.5">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{visibleRows.length ? visibleRows.map((row, index) => <tr key={row.requestId || index} className="hover:bg-slate-50"><td className="px-3 py-2.5 text-slate-400">{(currentPage - 1) * pageSize + index + 1}</td><td className="px-3 py-2.5 font-semibold text-slate-800">{row.employeeName}</td><td className="px-3 py-2.5 font-mono text-[10px] text-slate-500">{row.employeeId}</td><td className="px-3 py-2.5">{row.department}</td><td className="px-3 py-2.5">{row.campus || 'N/A'}</td><td className="px-3 py-2.5">{row.clearanceReason || row.propertyName || 'N/A'}</td><td className="px-3 py-2.5">{formatDate(row.requestDate || row.date)}</td><td className="px-3 py-2.5"><span className={`rounded px-2 py-1 text-[10px] font-semibold ${statusClass(row.propertyStatus || row.clearanceStatus)}`}>{row.propertyStatus || row.clearanceStatus}</span></td><td className="px-3 py-2.5"><button type="button" onClick={() => setSelectedRow(row)} className="inline-flex items-center gap-1 rounded border border-blue-200 px-2 py-1 text-[10px] font-semibold text-blue-600 hover:bg-blue-50"><Eye size={12} /> View</button></td></tr>) : <tr><td colSpan="9" className="px-3 py-10 text-center text-slate-400">No report records match the selected filters.</td></tr>}</tbody></table></div>
          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500"><span>Showing {rows.length ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, rows.length)} of {rows.length} entries</span><div className="flex items-center gap-1"><button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)} className="rounded border border-slate-200 p-1 disabled:opacity-40"><ChevronLeft size={13} /></button><span className="rounded bg-blue-600 px-2 py-1 font-semibold text-white">{currentPage}</span><button type="button" disabled={currentPage >= pageCount} onClick={() => setCurrentPage((page) => page + 1)} className="rounded border border-slate-200 p-1 disabled:opacity-40"><ChevronRight size={13} /></button></div></div>
        </section>
        <div className="mt-4"><h2 className="mb-2 font-bold text-slate-800">Other Property Reports</h2><div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">{[
          ['Property Clearance Summary', 'Overall summary of property clearance requests', FileCheck2, 'bg-emerald-50 text-emerald-600', 'summary'],
          ['Property Clearance Status', 'Detailed status of property clearance requests', ClipboardList, 'bg-blue-50 text-blue-600', 'status'],
          ['Outstanding Property / Assets', 'Unreturned university assets', Package, 'bg-amber-50 text-amber-600', 'outstanding'],
          ['Returned Property Report', 'Property items returned by employees', Send, 'bg-rose-50 text-rose-600', 'returned']
        ].map(([title, description, Icon, tone, kind]) => <button type="button" key={title} onClick={() => handleQuickReport(kind)} disabled={loading} className="flex items-center gap-3 rounded border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-blue-300 disabled:cursor-wait disabled:opacity-60"><span className={`rounded p-2 ${tone}`}><Icon size={18} /></span><span><strong className="block text-[10px] text-slate-800">{title}</strong><small className="mt-1 block text-[9px] text-slate-500">{description}</small></span></button>)}</div></div>
      </>}

      {(selectedRow || showReportGuide) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => { setSelectedRow(null); setShowReportGuide(false); }}>
        <section role="dialog" aria-modal="true" aria-label={selectedRow ? 'Report row details' : 'Report guide'} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3"><h2 className="font-bold text-slate-900">{selectedRow ? 'Report Row Details' : 'Property Report Guide'}</h2><button type="button" aria-label="Close" onClick={() => { setSelectedRow(null); setShowReportGuide(false); }} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={16} /></button></div>
          {selectedRow ? <div className="grid grid-cols-2 gap-3 pt-4 text-xs">{Object.entries(selectedRow).filter(([key]) => !['workflow', 'assets'].includes(key)).map(([key, value]) => <div key={key} className="rounded border border-slate-100 p-2"><span className="block text-[10px] capitalize text-slate-400">{key.replaceAll(/([A-Z])/g, ' $1')}</span><strong className="mt-1 block break-words text-slate-800">{typeof value === 'object' ? JSON.stringify(value) : String(value ?? 'N/A')}</strong></div>)}</div> : <div className="space-y-3 pt-4 text-xs text-slate-600"><p>Select a report period, apply any additional filters, then choose <strong>Generate Report</strong>.</p><ul className="list-disc space-y-1 pl-5"><li>Weekly uses an ISO week.</li><li>Monthly uses a calendar month.</li><li>Yearly uses the selected year.</li><li>Custom Date Range uses From Date and To Date.</li></ul><p>Use Export PDF, Export Excel, or Print after the report loads.</p></div>}
        </section>
      </div>}
    </div>
  );
}