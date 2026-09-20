import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Search,
  Download,
  FileSpreadsheet,
  Printer,
  Eye,
  CheckCircle2,
  XCircle,
  CalendarRange,
  MapPin,
  Building2,
  User,
  Clock3,
  FileText,
  Database,
  BadgeCheck,
} from 'lucide-react';

const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

const normalizeStatus = (status = '') => {
  const value = String(status || '').trim().toLowerCase();
  const statusMap = {
    pending: 'Pending',
    'pending review': 'Pending',
    'in progress': 'Under Review',
    'under review': 'Under Review',
    approved: 'Approved',
    completed: 'Completed',
    returned: 'Returned',
    rejected: 'Returned',
  };
  return statusMap[value] || 'Pending';
};

const getStatusBadge = (status) => {
  const normalized = normalizeStatus(status);
  const palette = {
    Approved: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    Completed: 'bg-teal-100 text-teal-800 border border-teal-200',
    Returned: 'bg-amber-100 text-amber-800 border border-amber-200',
    Rejected: 'bg-rose-100 text-rose-800 border border-rose-200',
    Pending: 'bg-slate-100 text-slate-700 border border-slate-200',
  };

  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${palette[normalized] || palette.Pending}`}>{normalized}</span>;
};

const formatDate = (date) => {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const buildTimeline = (record) => {
  const steps = [
    {
      stage: 'Submitted',
      date: record.submittedDate || record.requestDate || record.createdAt,
      user: record.employeeName || 'Employee',
      action: 'Request Submitted',
      comment: record.clearanceReason || 'Employee submitted ICT clearance request.',
    },
  ];

  if (record.reviewedBy || record.reviewedDate) {
    steps.push({
      stage: ['Approved', 'Completed'].includes(normalizeStatus(record.status)) ? normalizeStatus(record.status) : 'Reviewed',
      date: record.reviewedDate || record.updatedAt,
      user: record.reviewedBy || 'ICT Officer',
      action: ['Approved', 'Completed'].includes(normalizeStatus(record.status)) ? normalizeStatus(record.status) : 'Reviewed',
      comment: record.remarks || 'ICT officer reviewed asset and account status.',
    });
  }

  if (normalizeStatus(record.status) === 'Returned') {
    steps.push({
      stage: 'Returned',
      date: record.reviewedDate || record.updatedAt,
      user: record.reviewedBy || 'ICT Officer',
      action: 'Returned for Correction',
      comment: record.remarks || 'Asset/account issues were returned for correction.',
    });
  }

  if (normalizeStatus(record.status) === 'Rejected') {
    steps.push({
      stage: 'Rejected',
      date: record.reviewedDate || record.updatedAt,
      user: record.reviewedBy || 'ICT Officer',
      action: 'Rejected',
      comment: record.remarks || 'Clearance was rejected by the ICT officer.',
    });
  }

  return steps.filter((step) => step.date || step.comment);
};

const exportCsv = (records) => {
  if (!records.length) return;

  const headers = [
    'Clearance ID',
    'Employee ID',
    'Employee Name',
    'Department',
    'Campus',
    'Clearance Reason',
    'Submitted Date',
    'Reviewed Date',
    'Status',
    'Reviewed By',
  ];

  const rows = records.map((record) => [
    record.clearanceId || '',
    record.employeeId || '',
    record.employeeName || '',
    record.department || '',
    record.campus || '',
    record.clearanceReason || '',
    formatDate(record.submittedDate || record.requestDate),
    formatDate(record.reviewedDate || record.updatedAt),
    normalizeStatus(record.status),
    record.reviewedBy || '',
  ]);
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ICT History');
  XLSX.writeFile(workbook, 'ict-clearance-history.xlsx');
};

const exportPdf = (records) => {
  if (!records.length) return;
  const document = new jsPDF({ orientation: 'landscape' });
  document.text('ICT Clearance History', 14, 15);
  autoTable(document, {
    startY: 22,
    head: [['Request ID', 'Employee', 'Employee ID', 'Department', 'Reason', 'Request Date', 'Reviewed Date', 'Status']],
    body: records.map((record) => [
      record.clearanceId || '', record.employeeName || '', record.employeeId || '', record.department || '',
      record.clearanceReason || '', formatDate(record.submittedDate || record.requestDate),
      formatDate(record.reviewedDate || record.updatedAt), normalizeStatus(record.status),
    ]),
    styles: { fontSize: 8 },
  });
  document.save('ict-clearance-history.pdf');
};

export default function ICTClearanceHistoryPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [campusFilter, setCampusFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [reasonFilter, setReasonFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setCampusFilter('All');
    setDepartmentFilter('All');
    setReasonFilter('All');
    setFromDate('');
    setToDate('');
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (statusFilter !== 'All') params.set('status', statusFilter);
      if (campusFilter !== 'All') params.set('campus', campusFilter);
      if (departmentFilter !== 'All') params.set('department', departmentFilter);
      if (reasonFilter !== 'All') params.set('clearanceReason', reasonFilter);
      if (fromDate) params.set('startDate', fromDate);
      if (toDate) params.set('endDate', toDate);

      const response = await axios.get(`http://localhost:3000/api/ict-clearance-history?${params.toString()}`, getAuthConfig());
      setRecords(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      console.error('Failed to fetch ICT clearance history:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [searchTerm, statusFilter, campusFilter, departmentFilter, reasonFilter, fromDate, toDate]);

  const stats = useMemo(() => {
    const total = records.length;
    const approved = records.filter((record) => normalizeStatus(record.status) === 'Approved').length;
    const returned = records.filter((record) => normalizeStatus(record.status) === 'Returned').length;
    const now = new Date();
    const thisMonth = records.filter((record) => {
      const reviewedDate = new Date(record.reviewedDate || record.updatedAt);
      return reviewedDate.getMonth() === now.getMonth() && reviewedDate.getFullYear() === now.getFullYear();
    }).length;
    return { total, approved, returned, thisMonth };
  }, [records]);

  const uniqueCampus = useMemo(() => [...new Set(records.map((record) => record.campus).filter(Boolean))], [records]);
  const uniqueDepartments = useMemo(() => [...new Set(records.map((record) => record.department).filter(Boolean))], [records]);
  const uniqueReasons = useMemo(() => [...new Set(records.map((record) => record.clearanceReason).filter(Boolean))], [records]);

  const summaryCards = [
    { label: 'Total ICT Clearances', value: stats.total, accent: 'bg-blue-600' },
    { label: 'Approved', value: stats.approved, accent: 'bg-sky-600' },
    { label: 'Returned', value: stats.returned, accent: 'bg-amber-600' },
    { label: 'This Month', value: stats.thisMonth, accent: 'bg-emerald-600' },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7fb] p-4 text-slate-800 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-slate-900 px-5 py-6 text-white shadow-lg sm:px-7">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-blue-600/20 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> ICT Officer Workspace</div>
              <h1 className="text-2xl font-bold sm:text-3xl">ICT Clearance History</h1>
              <p className="mt-1 text-sm text-slate-300">Reviewed employee clearance decisions and ICT verification records</p>
            </div>
            <div className="relative flex flex-wrap gap-2">
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"><Printer size={14} /> Print</button>
              <button type="button" onClick={() => exportPdf(records)} disabled={!records.length} className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"><Download size={14} /> PDF</button>
              <button type="button" onClick={() => exportCsv(records)} disabled={!records.length} className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"><FileSpreadsheet size={14} /> Excel</button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{card.label}</span>
                <span className={`h-2.5 w-2.5 rounded-full ${card.accent}`} />
              </div>
              <div className="flex items-end justify-between"><div className="text-3xl font-bold text-slate-900">{card.value}</div><span className="text-xs font-medium text-slate-400">records</span></div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div><h2 className="text-sm font-bold text-slate-900">Find a clearance record</h2><p className="text-xs text-slate-500">Filter reviewed ICT decisions by employee, status, reason, or date</p></div>
            <Search size={18} className="text-blue-600" />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="xl:col-span-2">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Search</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={15} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Employee Name / ID / Clearance ID"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</label>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none">
                <option value="All">All</option>
                <option value="Approved">Approved</option>
                <option value="Returned">Returned</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Campus</label>
              <select value={campusFilter} onChange={(event) => setCampusFilter(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none">
                <option value="All">All</option>
                {uniqueCampus.map((campus) => (
                  <option key={campus} value={campus}>{campus}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2 xl:col-span-2">
              <button type="button" onClick={fetchHistory} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"><Search size={14} /> Search</button>
              <button type="button" onClick={resetFilters} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">Reset</button>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Department</label>
              <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none">
                <option value="All">All</option>
                {uniqueDepartments.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reason</label>
              <select value={reasonFilter} onChange={(event) => setReasonFilter(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none">
                <option value="All">All</option>
                {uniqueReasons.map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">From</label>
              <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none" />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">To</label>
              <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Database size={16} className="text-blue-600" />
              Clearance History Records
            </div>
            <span className="text-[11px] text-slate-500">Total Records: <strong>{records.length}</strong></span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full border-collapse text-left text-xs">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-3 font-semibold">Clearance ID</th>
                  <th className="p-3 font-semibold">Employee ID</th>
                  <th className="p-3 font-semibold">Employee Name</th>
                  <th className="p-3 font-semibold">Department</th>
                  <th className="p-3 font-semibold">Reason</th>
                  <th className="p-3 font-semibold">Submitted Date</th>
                  <th className="p-3 font-semibold">Reviewed Date</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="p-10 text-center text-slate-500">Loading ICT clearance history...</td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-10 text-center text-slate-400 italic">No ICT clearance history found.</td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record._id || record.clearanceId} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-blue-700">{record.clearanceId}</td>
                      <td className="p-3 font-mono text-slate-600">{record.employeeId || '—'}</td>
                      <td className="p-3 font-semibold text-slate-800">{record.employeeName}</td>
                      <td className="p-3 text-slate-600">{record.department || '—'}</td>
                      <td className="p-3 text-slate-600">{record.clearanceReason || '—'}</td>
                      <td className="p-3 text-slate-600">{formatDate(record.submittedDate || record.requestDate)}</td>
                      <td className="p-3 text-slate-600">{formatDate(record.reviewedDate || record.updatedAt)}</td>
                      <td className="p-3">{getStatusBadge(record.status)}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(record)}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white transition hover:bg-blue-700"
                        >
                          <Eye size={14} /> View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">ICT Clearance Details</h3>
                <p className="text-xs text-slate-500">{selectedRecord.clearanceId}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500"><User size={13} /> Employee Information</div>
                  <div className="text-sm font-bold text-slate-900">{selectedRecord.employeeName}</div>
                  <div className="text-[11px] text-slate-500">{selectedRecord.employeeId}</div>
                  <div className="mt-1 text-[11px] text-slate-500">{selectedRecord.position || 'Position not recorded'}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500"><Building2 size={13} /> Department</div>
                  <div className="text-sm font-bold text-slate-900">{selectedRecord.department || '—'}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500"><MapPin size={13} /> Campus</div>
                  <div className="text-sm font-bold text-slate-900">{selectedRecord.campus || '—'}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500"><BadgeCheck size={13} /> ICT Clearance Result</div>
                  <div>{getStatusBadge(selectedRecord.status)}</div>
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800"><FileText size={15} className="text-blue-600" /> ICT Verification</h4>
                  <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Outstanding ICT Issue</div>
                    <div className="mt-1 font-semibold text-slate-700">{selectedRecord.ictIssue || 'None'}</div>
                  </div>
                  <div className="space-y-3 text-xs text-slate-600">
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="rounded-lg bg-slate-50 p-2 border border-slate-200">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Laptop / Desktop</div>
                        <div className="mt-1 font-semibold text-slate-700">{selectedRecord.assets?.laptopDesktop || 'Not reported'}</div>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2 border border-slate-200">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Monitor</div>
                        <div className="mt-1 font-semibold text-slate-700">{selectedRecord.assets?.monitor || 'Not reported'}</div>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2 border border-slate-200">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Keyboard / Mouse</div>
                        <div className="mt-1 font-semibold text-slate-700">{selectedRecord.assets?.keyboardMouse || 'Not reported'}</div>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2 border border-slate-200">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Phone / Tablet</div>
                        <div className="mt-1 font-semibold text-slate-700">{selectedRecord.assets?.phoneTablet || 'Not reported'}</div>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2 border border-slate-200 md:col-span-2">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Software / Account Access</div>
                        <div className="mt-1 font-semibold text-slate-700">{selectedRecord.assets?.softwareAccess || 'Not reported'}</div>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2 border border-slate-200 md:col-span-2">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Email Account Status</div>
                        <div className="mt-1 font-semibold text-slate-700">{selectedRecord.assets?.emailStatus || 'Not reported'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800"><CalendarRange size={15} className="text-blue-600" /> Clearance Timeline</h4>
                  <div className="space-y-3">
                    {buildTimeline(selectedRecord).map((step, index) => (
                      <div key={`${step.stage}-${index}`} className="relative pl-5 before:absolute before:left-0 before:top-1 before:h-2 before:w-2 before:rounded-full before:bg-blue-600">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{step.stage}</div>
                        <div className="text-[11px] text-slate-600">{formatDate(step.date)}</div>
                        <div className="text-xs font-semibold text-slate-800">{step.user}</div>
                        <div className="text-[11px] text-slate-600">{step.action}</div>
                        <div className="mt-1 text-[11px] text-slate-500">{step.comment}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500"><Clock3 size={12} /> Review Information</div>
                <div className="grid gap-3 md:grid-cols-3 text-xs text-slate-700">
                  <div><span className="block text-slate-500">Clearance Reason</span><strong>{selectedRecord.clearanceReason || '—'}</strong></div>
                  <div><span className="block text-slate-500">Submitted Date</span><strong>{formatDate(selectedRecord.submittedDate || selectedRecord.requestDate)}</strong></div>
                  <div><span className="block text-slate-500">Reviewed Date</span><strong>{formatDate(selectedRecord.reviewedDate || selectedRecord.updatedAt)}</strong></div>
                  <div><span className="block text-slate-500">Reviewed By</span><strong>{selectedRecord.reviewedBy || 'ICT Officer'}</strong></div>
                  <div><span className="block text-slate-500">ICT Clearance Comment</span><strong>{selectedRecord.remarks || 'No outstanding ICT obligation.'}</strong></div>
                  <div><span className="block text-slate-500">Decision</span><strong>{normalizeStatus(selectedRecord.status)}</strong></div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Printer size={14} /> Printable ICT history record
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => exportCsv([selectedRecord])} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                  <FileSpreadsheet size={14} /> Export Excel
                </button>
                <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">
                  <Printer size={14} /> Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
