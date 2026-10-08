import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Flag,
  Loader2,
  Package,
  RotateCcw,
  Search,
  X
} from 'lucide-react';
import { usePropertyLanguage } from './propertyLanguage';

const PROPERTY_REPORTS_API = 'http://localhost:3000/api/property/reports/property-clearance';
const PAGE_SIZE = 10;
const EMPTY_ROWS = [];

const normalizeStatus = (value) => {
  const status = String(value || '').trim().toLowerCase();
  if (['approved', 'cleared', 'clear'].includes(status)) return 'Approved';
  if (status === 'completed') return 'Completed';
  if (['returned', 'rejected', 'not clear'].includes(status)) return 'Returned';
  if (['under review', 'in progress', 'review'].includes(status)) return 'Under Review';
  if (status === 'damaged') return 'Damaged';
  if (status === 'lost') return 'Lost';
  if (status === 'outstanding' || status === 'unreturned') return 'Outstanding';
  return 'Pending';
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatCurrency = (value) => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(value) || 0)} ETB`;

const translateStatus = (value, t) => t(value, ({
  Approved: 'ጸድቋል',
  Completed: 'ተጠናቋል',
  Returned: 'ተመልሷል',
  Pending: 'በመጠባበቅ ላይ',
  'Under Review': 'በግምገማ ላይ',
  Damaged: 'የተበላሸ',
  Lost: 'የጠፋ',
  Outstanding: 'ያልተመለሰ'
})[value]);

const translateReportType = (value, t) => t(value, ({
  'Property Clearance Summary': 'የንብረት ክሊራንስ ማጠቃለያ',
  'Outstanding Property Report': 'ያልተመለሱ ንብረቶች ሪፖርት'
})[value]);

export default function PropertyReport() {
  const { t } = usePropertyLanguage();
  const [reportType, setReportType] = useState('Property Clearance Summary');
  const [reportPeriod, setReportPeriod] = useState('Custom Date Range');
  const [periodValue, setPeriodValue] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [reasonFilter, setReasonFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState(null);
  const [showReportGuide, setShowReportGuide] = useState(false);

  const fetchReport = useCallback(async (backgroundRefresh = false) => {
    if (!backgroundRefresh) setLoading(true);
    try {
      const response = await axios.get(PROPERTY_REPORTS_API, {
        params: {
          reportType,
          reportPeriod,
          periodValue,
          fromDate,
          toDate,
          status: 'All',
          department: 'All',
          campus: 'All',
          _t: Date.now()
        }
      });
      if (!response.data?.success) {
        throw new Error(response.data?.message || t('The report service did not return report data.', 'የሪፖርት አገልግሎቱ የሪፖርት መረጃ አልመለሰም።'));
      }
      setReportData({
        ...response.data,
        summary: response.data.summary || null,
        data: (response.data.data || []).map((item) => ({
          ...item,
          propertyStatus: reportType === 'Outstanding Property Report'
            ? normalizeStatus(item.propertyStatus)
            : normalizeStatus(item.propertyStatus || item.clearanceStatus)
        }))
      });
      setError('');
    } catch (fetchError) {
      console.error('Unable to load Property Officer report:', fetchError);
      setError(fetchError.response?.data?.message || fetchError.message || t('Unable to load the property report. Please try again.', 'የንብረት ሪፖርቱን መጫን አልተቻለም። እባክዎ እንደገና ይሞክሩ።'));
    } finally {
      setLoading(false);
    }
  }, [reportType, reportPeriod, periodValue, fromDate, toDate, t]);

  useEffect(() => {
    fetchReport();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') fetchReport(true);
    };
    const refreshInterval = window.setInterval(refreshWhenVisible, 60000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [fetchReport]);

  const allRows = reportData?.data ?? EMPTY_ROWS;
  const reasons = useMemo(() => [...new Set(allRows.map((row) => row.clearanceReason).filter((value) => value && value !== 'N/A'))].sort(), [allRows]);
  const departments = useMemo(() => [...new Set(allRows.map((row) => row.department).filter((value) => value && value !== 'N/A'))].sort(), [allRows]);
  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return allRows.filter((row) => {
      const searchMatches = !term || [
        row.requestId,
        row.employeeName,
        row.employeeId,
        row.lastHandoverVoucher,
        ...(row.outstandingItems || []).map((item) => item.assetName)
      ].some((value) => String(value || '').toLowerCase().includes(term));
      const matchesStatus = statusFilter === 'All' || row.propertyStatus === statusFilter;
      const matchesReason = reasonFilter === 'All' || row.clearanceReason === reasonFilter;
      const matchesDepartment = departmentFilter === 'All' || row.department === departmentFilter;
      return searchMatches && matchesStatus && matchesReason && matchesDepartment;
    });
  }, [allRows, searchTerm, statusFilter, reasonFilter, departmentFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const activePage = Math.min(currentPage, pageCount);
  const visibleRows = filteredRows.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);
  const summary = {
    total: filteredRows.length,
    approved: filteredRows.filter((row) => ['Approved', 'Completed'].includes(row.propertyStatus)).length,
    inReview: filteredRows.filter((row) => ['Under Review', 'Pending'].includes(row.propertyStatus)).length,
    held: filteredRows.filter((row) => row.propertyStatus === 'Returned').length
  };

  const statusClass = (value) => ({
    Approved: 'border-emerald-200 bg-emerald-100 text-emerald-800',
    Completed: 'border-emerald-200 bg-emerald-100 text-emerald-800',
    Returned: 'border-rose-200 bg-rose-100 text-rose-800',
    Pending: 'border-amber-200 bg-amber-100 text-amber-800',
    'Under Review': 'border-amber-200 bg-amber-100 text-amber-800',
    Damaged: 'border-rose-200 bg-rose-100 text-rose-800',
    Outstanding: 'border-amber-200 bg-amber-100 text-amber-800'
  }[value] || 'border-slate-200 bg-slate-100 text-slate-700');

  const exportableRows = filteredRows.map((row) => ({
    'BDU Clearance ID': row.requestId || 'N/A',
    'Employee Name': row.employeeName || 'N/A',
    'Employee ID': row.employeeId || 'N/A',
    Department: row.department || 'N/A',
    'Request Date': formatDate(row.requestDate),
    'Number of Assigned Assets': row.assignedAssetsCount ?? row.assetsCount ?? 0,
    'Outstanding Items': (row.outstandingItems || []).map((item) => `${item.assetName} (${item.status})`).join('; ') || 'None',
    'Returned Items': row.returnedItemsCount || 0,
    'Last Handover Voucher (Model 19 ID)': row.lastHandoverVoucher || 'Not recorded',
    'Request Status': row.propertyStatus,
    'Total Request Value': Number(row.totalRequestValue) || 0
  }));

  const handleExportExcel = () => {
    if (!exportableRows.length) return;
    const worksheet = XLSX.utils.json_to_sheet(exportableRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Property Clearance Report');
    XLSX.writeFile(workbook, 'Property-Clearance-Report.xlsx');
  };

  const handleExportPdf = () => {
    if (!exportableRows.length) return;
    const pdf = new jsPDF({ orientation: 'landscape' });
    pdf.text('Bahir Dar University - Property Clearance Report', 14, 14);
    autoTable(pdf, {
      head: [Object.keys(exportableRows[0])],
      body: exportableRows.map((row) => Object.values(row)),
      startY: 20,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [13, 116, 111] }
    });
    pdf.save('Property-Clearance-Report.pdf');
  };

  const handleExportVoucher = (row) => {
    const pdf = new jsPDF();
    pdf.text('BAHIR DAR UNIVERSITY', 14, 15);
    pdf.setFontSize(12);
    pdf.text('PROPERTY CLEARANCE / ASSET HANDOVER VOUCHER', 14, 24);
    autoTable(pdf, {
      startY: 31,
      head: [['Request Information', 'Details']],
      body: [
        ['Clearance ID', row.requestId || 'N/A'],
        ['Employee', `${row.employeeName || 'N/A'} (${row.employeeId || 'N/A'})`],
        ['Department', row.department || 'N/A'],
        ['Reason', row.clearanceReason || 'N/A'],
        ['Request Date', formatDate(row.requestDate)],
        ['Last Handover Voucher (Model 19 ID)', row.lastHandoverVoucher || 'Not recorded'],
        ['Assigned Assets', String(row.assignedAssetsCount ?? row.assetsCount ?? 0)],
        ['Returned Items', String(row.returnedItemsCount || 0)],
        ['Outstanding Items', (row.outstandingItems || []).map((item) => `${item.assetName} (${item.status})`).join(', ') || 'None'],
        ['Request Status', row.propertyStatus || 'Pending'],
        ['Total Request Value', formatCurrency(row.totalRequestValue)]
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [13, 116, 111] }
    });
    pdf.save(`Property-Voucher-${String(row.requestId || 'request').replaceAll(/[^a-zA-Z0-9-]/g, '-')}.pdf`);
  };

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setReasonFilter('All');
    setDepartmentFilter('All');
    setReportType('Property Clearance Summary');
    setReportPeriod('Custom Date Range');
    setPeriodValue('');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  const handleQuickReport = (type) => {
    if (type === 'Returned') {
      setReportType('Property Clearance Summary');
      setStatusFilter('Returned');
      return;
    }
    if (type === 'Outstanding') {
      setReportType('Outstanding Property Report');
      setStatusFilter('All');
      return;
    }
    setReportType('Property Clearance Summary');
    setStatusFilter('All');
  };

  const updatePeriod = (value) => {
    setPeriodValue(value);
    setCurrentPage(1);
  };

  return (
    <main className="min-h-screen space-y-4 bg-slate-50 p-3 text-[11px] text-slate-700 sm:p-4 print:bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-teal-700 px-4 py-3 text-white shadow-sm print:bg-white print:text-slate-900">
        <div className="flex items-center gap-2.5">
          <FileText size={17} />
          <h1 className="text-sm font-bold sm:text-base">{t('Property Officer Clearance Report - Comprehensive View', 'የንብረት ኦፊሰር ክሊራንስ ሪፖርት - ሙሉ እይታ')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowReportGuide(true)} className="ml-2 rounded border border-white/30 px-2.5 py-1.5 text-[10px] font-semibold hover:bg-teal-600 print:hidden">
            {t('Report Guide', 'የሪፖርት መመሪያ')}
          </button>
        </div>
      </header>

      <section className="space-y-2">
        <h2 className="font-bold text-slate-900">{t('Summary', 'ማጠቃለያ')}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Total Requests', summary.total, 'bg-slate-200 text-slate-900'],
            ['Approved', summary.approved, 'bg-blue-100 text-blue-900'],
            ['In Review', summary.inReview, 'bg-emerald-100 text-emerald-900'],
            ['Hold / Rejected', summary.held, 'bg-rose-100 text-rose-900']
          ].map(([label, value, color]) => (
            <div key={label} className={`rounded-lg border border-white p-3 ${color}`}>
              <p className="text-[10px] font-medium">{t(label, ({ 'Total Requests': 'ጠቅላላ ጥያቄዎች', Approved: 'ጸድቋል', 'In Review': 'በግምገማ ላይ', 'Hold / Rejected': 'የታገዱ / ውድቅ የተደረጉ' })[label])}</p>
              <p className="mt-0.5 text-lg font-bold leading-tight">{loading && !reportData ? <Loader2 className="animate-spin" size={16} /> : value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-slate-900">{t('Search & Filter', 'ፈልግ እና አጣራ')}</h2>
          <button type="button" onClick={handleReset} className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-200 print:hidden">
            <RotateCcw size={12} /> {t('Reset', 'ዳግም አስጀምር')}
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <label className="relative">
            <span className="sr-only">{t('Search requests', 'ጥያቄዎችን ፈልግ')}</span>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input type="search" value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setCurrentPage(1); }} placeholder={t('Search by name, ID, voucher...', 'በስም፣ በመለያ ወይም በቫውቸር ፈልግ...')} className="w-full rounded-md border border-slate-300 bg-white py-2 pl-8 pr-3 text-[10px] outline-none focus:border-teal-600" />
          </label>
          <label>
            <span className="sr-only">{t('Request status', 'የጥያቄ ሁኔታ')}</span>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setCurrentPage(1); }} className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-[10px] outline-none focus:border-teal-600">
              <option value="All">{t('All Statuses', 'ሁሉም ሁኔታዎች')}</option>
              {(reportType === 'Outstanding Property Report' ? ['Outstanding', 'Damaged', 'Lost'] : ['Approved', 'Pending', 'Under Review', 'Returned', 'Completed']).map((value) => <option key={value} value={value}>{translateStatus(value, t)}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">{t('Clearance reason', 'የክሊራንስ ምክንያት')}</span>
            <select value={reasonFilter} onChange={(event) => { setReasonFilter(event.target.value); setCurrentPage(1); }} className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-[10px] outline-none focus:border-teal-600">
              <option value="All">{t('All Reasons', 'ሁሉም ምክንያቶች')}</option>
              {reasons.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">{t('Department', 'ዲፓርትመንት')}</span>
            <select value={departmentFilter} onChange={(event) => { setDepartmentFilter(event.target.value); setCurrentPage(1); }} className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-[10px] outline-none focus:border-teal-600">
              <option value="All">{t('All Departments', 'ሁሉም ዲፓርትመንቶች')}</option>
              {departments.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">{t('Report type', 'የሪፖርት አይነት')}</span>
            <select value={reportType} onChange={(event) => { setReportType(event.target.value); setCurrentPage(1); }} className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-[10px] outline-none focus:border-teal-600">
              <option value="Property Clearance Summary">{translateReportType('Property Clearance Summary', t)}</option>
              <option value="Outstanding Property Report">{translateReportType('Outstanding Property Report', t)}</option>
            </select>
          </label>
        </div>

        <details className="rounded-md border border-slate-200 bg-white px-3 py-2 print:hidden">
          <summary className="cursor-pointer text-[10px] font-semibold text-slate-600">{t('Report date range', 'የሪፖርት የቀን ክልል')}</summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-[10px] font-semibold text-slate-600">
              {t('Period', 'ጊዜ')}
              <select value={reportPeriod} onChange={(event) => { setReportPeriod(event.target.value); setPeriodValue(''); setCurrentPage(1); }} className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-normal">
                {['Custom Date Range', 'Weekly', 'Monthly', 'Yearly'].map((value) => <option key={value} value={value}>{t(value, ({ 'Custom Date Range': 'ብጁ የቀን ክልል', Weekly: 'ሳምንታዊ', Monthly: 'ወርሃዊ', Yearly: 'ዓመታዊ' })[value])}</option>)}
              </select>
            </label>
            {reportPeriod === 'Custom Date Range' ? (
              <>
                <label className="text-[10px] font-semibold text-slate-600">{t('From Date', 'ከቀን')}<input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setCurrentPage(1); }} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 font-normal" /></label>
                <label className="text-[10px] font-semibold text-slate-600">{t('To Date', 'እስከ ቀን')}<input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setCurrentPage(1); }} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 font-normal" /></label>
              </>
            ) : reportPeriod === 'Weekly' ? (
              <label className="text-[10px] font-semibold text-slate-600">{t('Select Week', 'ሳምንት ይምረጡ')}<input type="week" value={periodValue} onChange={(event) => updatePeriod(event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 font-normal" /></label>
            ) : reportPeriod === 'Monthly' ? (
              <label className="text-[10px] font-semibold text-slate-600">{t('Select Month', 'ወር ይምረጡ')}<input type="month" value={periodValue} onChange={(event) => updatePeriod(event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 font-normal" /></label>
            ) : (
              <label className="text-[10px] font-semibold text-slate-600">{t('Select Year', 'ዓመት ይምረጡ')}<input type="number" min="2000" max="2100" value={periodValue} onChange={(event) => updatePeriod(event.target.value)} placeholder="2026" className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 font-normal" /></label>
            )}
          </div>
        </details>
      </section>

      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-800">
          <AlertCircle size={14} /> {error}
          <button type="button" onClick={fetchReport} className="ml-auto font-semibold underline">{t('Retry', 'እንደገና ይሞክሩ')}</button>
        </p>
      )}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5">
          <h2 className="font-bold text-slate-900">{t('Reports Table', 'የሪፖርቶች ሰንጠረዥ')} <span className="font-normal text-slate-500">({translateReportType(reportData?.reportType || reportType, t)})</span></h2>
          <span className="text-[10px] text-slate-500">{t('BDU Clearance ID ascending', 'የባዩ ክሊራንስ መለያ በዕድገት ቅደም ተከተል')}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1550px] border-collapse text-left text-[10px]">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                {[
                  'BDU Clearance ID',
                  'Employee Name / ID',
                  'Department',
                  'Request Date',
                  'Number of Assigned Assets',
                  'Outstanding Items',
                  'Returned Items',
                  'Last Handover Voucher (Model 19 ID)',
                  'Request Status',
                  'Total Request Value',
                  'Actions'
                ].map((heading) => <th key={heading} className="border-b border-slate-200 px-2.5 py-2.5 font-bold">{t(heading, ({
                  'BDU Clearance ID': 'የባዩ ክሊራንስ መለያ',
                  'Employee Name / ID': 'የሰራተኛ ስም / መለያ',
                  Department: 'ዲፓርትመንት',
                  'Request Date': 'የጥያቄ ቀን',
                  'Number of Assigned Assets': 'የተመደቡ ንብረቶች ብዛት',
                  'Outstanding Items': 'ያልተመለሱ እቃዎች',
                  'Returned Items': 'የተመለሱ እቃዎች',
                  'Last Handover Voucher (Model 19 ID)': 'የመጨረሻ ርክክብ ቫውቸር (ሞዴል 19 መለያ)',
                  'Request Status': 'የጥያቄ ሁኔታ',
                  'Total Request Value': 'ጠቅላላ የጥያቄ ዋጋ',
                  Actions: 'ተግባሮች'
                })[heading])}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && !reportData ? (
                <tr><td colSpan="11" className="p-8 text-center text-slate-500"><Loader2 className="mr-2 inline animate-spin" size={15} />{t('Loading property report...', 'የንብረት ሪፖርት በመጫን ላይ...')}</td></tr>
              ) : visibleRows.length === 0 ? (
                <tr><td colSpan="11" className="p-8 text-center text-slate-500">{t('No report records match the selected filters.', 'ከተመረጡት ማጣሪያዎች ጋር የሚዛመድ የሪፖርት መዝገብ የለም።')}</td></tr>
              ) : visibleRows.map((row, index) => (
                <tr key={`${row.requestId || row.employeeId}-${index}`} className="align-top hover:bg-slate-50">
                  <td className="max-w-[150px] break-all px-2.5 py-2.5 font-mono text-slate-700">{row.requestId || 'N/A'}</td>
                  <td className="px-2.5 py-2.5">
                    <strong className="block text-slate-800">{row.employeeName || 'N/A'}</strong>
                    <span className="text-slate-500">{row.employeeId || 'N/A'}</span>
                  </td>
                  <td className="max-w-[130px] px-2.5 py-2.5">{row.department || 'N/A'}</td>
                  <td className="whitespace-nowrap px-2.5 py-2.5">{formatDate(row.requestDate || row.date)}</td>
                  <td className="px-2.5 py-2.5 text-center">{row.assignedAssetsCount ?? row.assetsCount ?? 0}</td>
                  <td className="px-2.5 py-2.5">
                    {row.outstandingItems?.length ? (
                      <div className="space-y-1">
                        <span className={`inline-flex rounded px-2 py-1 font-bold ${row.outstandingItems.some((item) => item.status === 'Damaged') ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{row.outstandingItemsCount ?? row.outstandingItems.length}</span>
                        {row.outstandingItems.some((item) => item.status === 'Damaged') && <span className="block text-[9px] text-rose-700">({t('Damaged', 'የተበላሸ')})</span>}
                      </div>
                    ) : <span className="text-slate-500">0</span>}
                  </td>
                  <td className="px-2.5 py-2.5 text-center">{row.returnedItemsCount || 0}</td>
                  <td className="px-2.5 py-2.5 font-mono text-slate-600">{row.lastHandoverVoucher || '—'}</td>
                  <td className="px-2.5 py-2.5"><span className={`inline-flex rounded border px-2 py-1 font-semibold ${statusClass(row.propertyStatus)}`}>{row.propertyStatus === 'Under Review' ? t('In Review', 'በግምገማ ላይ') : translateStatus(row.propertyStatus, t)}</span></td>
                  <td className="whitespace-nowrap px-2.5 py-2.5 font-semibold">{formatCurrency(row.totalRequestValue)}</td>
                  <td className="px-2.5 py-2.5">
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => setSelectedRow(row)} className="inline-flex items-center gap-1 whitespace-nowrap rounded bg-teal-700 px-2 py-1.5 font-semibold text-white hover:bg-teal-800"><Eye size={11} />{t('View Details', 'ዝርዝሮችን ይመልከቱ')}</button>
                      <button type="button" onClick={() => handleExportVoucher(row)} className="inline-flex items-center gap-1 whitespace-nowrap rounded bg-rose-700 px-2 py-1.5 font-semibold text-white hover:bg-rose-800"><Download size={11} />{t('Export Voucher', 'ቫውቸር ያውጡ')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-3 py-2 text-[10px] text-slate-600">
          <span>{t('Showing', 'ከ')} {filteredRows.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0} {t('to', 'እስከ')} {Math.min(currentPage * PAGE_SIZE, filteredRows.length)} {t('of', 'ከ')} {filteredRows.length} {t('requests', 'ጥያቄዎች')}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage <= 1} className="rounded border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={13} /></button>
            <span>{t('Page', 'ገጽ')} {currentPage} {t('of', 'ከ')} {pageCount}</span>
            <button type="button" onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))} disabled={currentPage >= pageCount} className="rounded border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={13} /></button>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2 print:hidden">
        <button type="button" onClick={handleExportPdf} disabled={!filteredRows.length} className="inline-flex items-center gap-1.5 rounded bg-teal-700 px-3 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-50"><Download size={13} />{t('Export Full Report (PDF)', 'ሙሉ ሪፖርት ያውጡ (PDF)')}</button>
        <button type="button" onClick={handleExportExcel} disabled={!filteredRows.length} className="inline-flex items-center gap-1.5 rounded bg-emerald-700 px-3 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><FileSpreadsheet size={13} />{t('Export Full Report (Excel)', 'ሙሉ ሪፖርት ያውጡ (Excel)')}</button>
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100"><FileText size={13} />{t('Print', 'አትም')}</button>
        {loading && reportData && <span className="inline-flex items-center gap-1 text-slate-500"><Loader2 size={12} className="animate-spin" />{t('Refreshing report…', 'ሪፖርቱን በማደስ ላይ…')}</span>}
      </section>

      <section className="space-y-2 print:hidden">
        <h2 className="font-bold text-slate-800">{t('Other Property Reports', 'ሌሎች የንብረት ሪፖርቶች')}</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => handleQuickReport('All')} className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-2 font-semibold hover:border-teal-300"><FileCheck2 size={13} className="text-emerald-700" />{t('All Clearance Requests', 'ሁሉም የክሊራንስ ጥያቄዎች')}</button>
          <button type="button" onClick={() => handleQuickReport('Returned')} className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-2 font-semibold hover:border-teal-300"><Flag size={13} className="text-rose-700" />{t('Returned Requests', 'የተመለሱ ጥያቄዎች')}</button>
          <button type="button" onClick={() => handleQuickReport('Outstanding')} className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-2 font-semibold hover:border-teal-300"><Package size={13} className="text-amber-700" />{t('Outstanding Assets', 'ያልተመለሱ ንብረቶች')}</button>
        </div>
      </section>

      {(selectedRow || showReportGuide) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4" onClick={() => { setSelectedRow(null); setShowReportGuide(false); }}>
          <section role="dialog" aria-modal="true" aria-label={selectedRow ? t('Report row details', 'የሪፖርት ረድፍ ዝርዝሮች') : t('Report guide', 'የሪፖርት መመሪያ')} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-slate-900">{selectedRow ? `${t('Clearance Details', 'የክሊራንስ ዝርዝሮች')} - ${selectedRow.requestId}` : t('Property Report Guide', 'የንብረት ሪፖርት መመሪያ')}</h2>
              <button type="button" aria-label={t('Close', 'ዝጋ')} onClick={() => { setSelectedRow(null); setShowReportGuide(false); }} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={16} /></button>
            </div>
            {selectedRow ? (
              <div className="space-y-4 pt-4">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ['Clearance ID', selectedRow.requestId],
                    ['Employee', `${selectedRow.employeeName || 'N/A'} (${selectedRow.employeeId || 'N/A'})`],
                    ['Department', selectedRow.department],
                    ['Reason', selectedRow.clearanceReason],
                    ['Request Date', formatDate(selectedRow.requestDate)],
                    ['Status', translateStatus(selectedRow.propertyStatus, t)],
                    ['Assigned Assets', selectedRow.assignedAssetsCount ?? selectedRow.assetsCount ?? 0],
                    ['Returned Items', selectedRow.returnedItemsCount || 0],
                    ['Last Handover Voucher', selectedRow.lastHandoverVoucher || t('Not recorded', 'አልተመዘገበም')],
                    ['Total Request Value', formatCurrency(selectedRow.totalRequestValue)]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded border border-slate-100 p-2">
                      <span className="block text-[10px] text-slate-400">{t(label, ({
                        'Clearance ID': 'የክሊራንስ መለያ',
                        Employee: 'ሰራተኛ',
                        Department: 'ዲፓርትመንት',
                        Reason: 'ምክንያት',
                        'Request Date': 'የጥያቄ ቀን',
                        Status: 'ሁኔታ',
                        'Assigned Assets': 'የተመደቡ ንብረቶች',
                        'Returned Items': 'የተመለሱ እቃዎች',
                        'Last Handover Voucher': 'የመጨረሻ ርክክብ ቫውቸር',
                        'Total Request Value': 'ጠቅላላ የጥያቄ ዋጋ'
                      })[label])}</span>
                      <strong className="mt-1 block break-words text-slate-800">{value || 'N/A'}</strong>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="mb-2 text-[11px] font-bold text-slate-800">{t('Outstanding Items', 'ያልተመለሱ እቃዎች')}</h3>
                  {selectedRow.outstandingItems?.length ? (
                    <div className="overflow-x-auto rounded border border-slate-200">
                      <table className="w-full text-left text-[10px]">
                        <thead className="bg-slate-50"><tr><th className="p-2">{t('Asset ID', 'የንብረት መለያ')}</th><th className="p-2">{t('Asset', 'ንብረት')}</th><th className="p-2">{t('Status', 'ሁኔታ')}</th><th className="p-2">{t('Condition', 'ሁኔታ')}</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">{selectedRow.outstandingItems.map((item) => <tr key={item.assetId}><td className="p-2 font-mono">{item.assetId}</td><td className="p-2">{item.assetName}</td><td className="p-2">{translateStatus(item.status, t)}</td><td className="p-2">{item.condition}</td></tr>)}</tbody>
                      </table>
                    </div>
                  ) : <p className="rounded bg-emerald-50 p-3 text-[10px] text-emerald-800">{t('No outstanding items recorded for this employee.', 'ለዚህ ሰራተኛ ያልተመለሱ እቃዎች አልተመዘገቡም።')}</p>}
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-4 text-xs text-slate-600">
                <p>{t('Use Search & Filter to find clearance requests by employee, clearance ID, reason, or department. Summary cards update to match the current filters.', 'የክሊራንስ ጥያቄዎችን በሰራተኛ፣ በክሊራንስ መለያ፣ በምክንያት ወይም በዲፓርትመንት ለመፈለግ ፈልግ እና አጣራን ይጠቀሙ። የማጠቃለያ ካርዶቹ ከአሁኑ ማጣሪያዎች ጋር ይዘምናሉ።')}</p>
                <p>{t('Each report row includes assigned, returned, and outstanding asset information linked to Property Asset Records. Asset purchase values are summed for the employee’s recorded assets; voucher IDs display only when recorded.', 'እያንዳንዱ የሪፖርት ረድፍ ከንብረት መዝገቦች ጋር የተገናኘ የተመደቡ፣ የተመለሱ እና ያልተመለሱ ንብረቶችን ያካትታል። የንብረት ግዢ ዋጋዎች ለሰራተኛው በተመዘገቡ ንብረቶች ላይ ይደመራሉ፤ የቫውቸር መለያዎች ሲመዘገቡ ብቻ ይታያሉ።')}</p>
                <p>{t('Use Export Full Report to download the filtered report, or Export Voucher on an individual request.', 'የተጣራውን ሪፖርት ለማውረድ ሙሉ ሪፖርት ያውጡን፣ ወይም ለእያንዳንዱ ጥያቄ ቫውቸር ያውጡን ይጠቀሙ።')}</p>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
