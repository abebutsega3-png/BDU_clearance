import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FileText,
  Bell,
  Search,
  Download,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  User,
  BriefcaseBusiness,
  AlertCircle,
} from 'lucide-react';

const normalizeStatus = (status) => {
  const text = String(status || '').trim();
  if (!text) return 'PENDING';

  const upper = text.toUpperCase();
  if (['COMPLETED', 'CERTIFICATE ISSUED', 'CERTIFICATE_ISSUED'].includes(upper)) {
    return 'CERTIFICATE ISSUED';
  }
  if (['APPROVED', 'CLEARED'].includes(upper)) return 'APPROVED';
  if (upper === 'READY FOR CERTIFICATE') {
    return 'READY FOR CERTIFICATE';
  }
  return 'PENDING';
};

const normalizeOfficeName = (office) => {
  const name = String(office || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (name.includes('department')) return 'departmenthead';
  if (name.includes('finance')) return 'financeoffice';
  if (name.includes('property') || name.includes('asset')) return 'propertyassetoffice';
  if (name.includes('library')) return 'library';
  if (name.includes('ict')) return 'ictoffice';
  if (name.includes('transport')) return 'transportoffice';
  return name;
};

const getOfficeProgress = (request) => {
  const hasAssignedDepartments = request?.manualRoutingEnabled === true
    || (Array.isArray(request?.assignedDepartments) && request.assignedDepartments.length > 0);
  if (hasAssignedDepartments) {
    const assignedDepartments = Array.isArray(request?.assignedDepartments) ? request.assignedDepartments : [];
    const reviewEntries = [
      ...(Array.isArray(request?.departmentClearances) ? request.departmentClearances : []),
      ...(Array.isArray(request?.workflow) ? request.workflow : []),
    ];
    return assignedDepartments.map((office) => {
      const matchingEntries = reviewEntries.filter((entry) => normalizeOfficeName(
        entry?.name || entry?.office || entry?.department,
      ) === normalizeOfficeName(office));
      const entry = [...matchingEntries].reverse().find((item) => (
        ['approved', 'completed', 'cleared'].includes(String(item?.status || '').toLowerCase())
      )) || [...matchingEntries].reverse().find((item) => item?.status) || {};
      return {
        ...entry,
        name: office,
        status: entry.status || entry.state || entry.approvalStatus || 'Pending',
        clearedBy: entry.clearedBy || entry.approvedBy || entry.reviewedBy || entry.performedBy || '-',
        clearedDate: entry.clearedDate || entry.completedAt || entry.reviewedAt || entry.updatedAt || '-',
        remarks: entry.remarks || entry.comment || entry.returnReason || '',
      };
    });
  }

  if (Array.isArray(request?.departmentClearances)) {
    return request.departmentClearances.map((office) => ({
      ...office,
      name: office.name || office.office || office.department || 'Office',
      status: office.status || office.state || office.approvalStatus || 'Pending',
      clearedBy: office.clearedBy || office.approvedBy || office.reviewedBy || '-',
      clearedDate: office.clearedDate || office.completedAt || office.updatedAt || '-',
      remarks: office.remarks || office.comment || office.returnReason || '',
    }));
  }

  const officeNames = request?.manualRoutingEnabled
    ? request.assignedDepartments
    : request?.requiredOffices?.filter((office) => !/department head|final hr/i.test(String(office)))
      || ['Finance Office', 'Property / Asset Office', 'ICT Office', 'Library', 'Transport Office'];
  const entries = [...(Array.isArray(request?.workflow) ? request.workflow : [])];

  return (Array.isArray(officeNames) ? officeNames : []).map((office) => {
    const entry = [...entries].reverse().find((item) => {
      const entryName = String(item?.name || item?.office || item?.department || '').trim().toLowerCase();
      return entryName === String(office).trim().toLowerCase();
    }) || {};
    return {
      name: office,
      status: entry.status || entry.state || entry.approvalStatus || 'Pending',
      clearedBy: entry.clearedBy || entry.approvedBy || entry.reviewedBy || '-',
      clearedDate: entry.clearedDate || entry.completedAt || entry.updatedAt || '-',
      remarks: entry.remarks || entry.comment || entry.returnReason || '',
    };
  });
};

const getProgressInfo = (request) => {
  const departmentClearances = getOfficeProgress(request);
  const hasAssignedDepartments = request?.manualRoutingEnabled === true
    || (Array.isArray(request?.assignedDepartments) && request.assignedDepartments.length > 0);
  const totalDepartments = hasAssignedDepartments
    ? (Array.isArray(request?.assignedDepartments) ? request.assignedDepartments.length : 0)
    : Number.isFinite(Number(request?.totalDepartments))
    ? Number(request.totalDepartments)
    : departmentClearances.length;
  const approvedCount = !hasAssignedDepartments && Number.isFinite(Number(request?.completedDepartments))
    ? Number(request.completedDepartments)
    : departmentClearances.filter((item) => ['approved', 'completed', 'cleared'].includes(String(item.status || '').toLowerCase())).length;
  const completedCount = Math.min(approvedCount, totalDepartments);

  const normalizedStatus = normalizeStatus(request?.overallStatus || request?.status);
  const noOfficesReady = totalDepartments === 0
    && request?.initialHRStatus === 'Approved'
    && request?.departmentStatus === 'Approved';

  let statusLabel = 'PENDING';
  if (normalizedStatus === 'CERTIFICATE ISSUED') {
    statusLabel = 'CERTIFICATE ISSUED';
  } else if (completedCount === totalDepartments && (totalDepartments > 0 || noOfficesReady)) {
    statusLabel = 'APPROVED';
  }

  return {
    departmentClearances,
    completed: completedCount,
    total: totalDepartments,
    progress: `${completedCount}/${totalDepartments}`,
    hasOffices: totalDepartments > 0,
    percentage: totalDepartments === 0
      ? (noOfficesReady ? 100 : 0)
      : Math.min(100, (completedCount / totalDepartments) * 100),
    status: statusLabel,
    statusType: statusLabel === 'APPROVED' ? 'ready' : statusLabel === 'CERTIFICATE ISSUED' ? 'issued' : 'pending',
  };
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const authConfig = () => ({
  suppressAutomaticLogout: true,
  headers: { Authorization: `******'token') || ''}` },
});

const getFinalHRErrorMessage = (error, fallback) => {
  if (error.response?.status === 401) {
    const message = error.response?.data?.message;
    if (/expired|invalid/i.test(message || '')) return 'The saved sign-in token has expired or is invalid. Sign in again to continue.';
    if (/revoked/i.test(message || '')) return 'Your sign-in was revoked. Sign in again to continue.';
    return message || 'The server did not receive a valid sign-in token. Sign in again to continue.';
  }
  return error.response?.data?.message || error.message || fallback;
};

export default function HRFinalClearance() {
  const navigate = useNavigate();
  const { id: routeRequestId } = useParams();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [decisionSaving, setDecisionSaving] = useState(false);
  const [decisionError, setDecisionError] = useState('');
  const [certificateSaving, setCertificateSaving] = useState(false);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const { data } = await axios.get('http://localhost:3000/api/hr-final-clearance/clearances');
        setRequests(data?.data || []);
      } catch (error) {
        console.error('Failed to load final HR clearance requests:', error);
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  useEffect(() => {
    if (!routeRequestId) return;
    const fetchRequestDetails = async () => {
      try {
        setDetailLoading(true);
        const { data } = await axios.get(`http://localhost:3000/api/hr-final-clearance/clearance/${routeRequestId}`);
        setSelectedRequest(data?.clearance || null);
      } catch (error) {
        console.error('Failed to load final clearance details:', error);
        setSelectedRequest(null);
      } finally {
        setDetailLoading(false);
      }
    };
    fetchRequestDetails();
  }, [routeRequestId]);

  const filteredRows = useMemo(() => {
    return requests.filter((request) => {
      const employeeName = (request.employeeName || '').toLowerCase();
      const employeeId = (request.employeeId || '').toLowerCase();
      const department = (request.department || '').toLowerCase();
      const status = getProgressInfo(request).status.toLowerCase();
      const requestDate = request.requestDate || request.createdAt || '';

      const matchesSearch = !searchTerm || employeeName.includes(searchTerm.toLowerCase()) || employeeId.includes(searchTerm.toLowerCase());
      const matchesDepartment = selectedDepartment === 'All Departments' || department.includes(selectedDepartment.toLowerCase());
      const matchesStatus = selectedStatus === 'All Status' || status === selectedStatus.toLowerCase();
      const matchesFromDate = !fromDate || new Date(requestDate) >= new Date(fromDate);
      const matchesToDate = !toDate || new Date(requestDate) <= new Date(toDate);

      return matchesSearch && matchesDepartment && matchesStatus && matchesFromDate && matchesToDate;
    });
  }, [requests, searchTerm, selectedDepartment, selectedStatus, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  const maxAssignedOfficeCount = requests.reduce(
    (maximum, request) => Math.max(maximum, getProgressInfo(request).total),
    0,
  );

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedDepartment, selectedStatus, fromDate, toDate, pageSize]);

  const departments = useMemo(() => {
    const set = new Set(requests.map((request) => request.department).filter(Boolean));
    return ['All Departments', ...Array.from(set)];
  }, [requests]);

  const handleViewRequest = async (request) => {
    const requestId = request.requestId || request._id;
    if (requestId) {
      navigate(`/hr-office/final-hr-clearance/${requestId}`);
      return;
    }
    if (!requestId) {
      setSelectedRequest({
        ...request,
        employeeName: request.employeeName || 'Unknown employee',
        employeeId: request.employeeId || '—',
        department: request.department || '—',
        departmentClearances: [],
      });
      return;
    }

    try {
      setDetailLoading(true);
      const { data } = await axios.get(`http://localhost:3000/api/hr-final-clearance/clearance/${requestId}`);
      setSelectedRequest(data?.clearance || null);
    } catch (error) {
      console.error('Failed to load final clearance details:', error);
      setSelectedRequest({
        employeeName: request.employeeName || 'Unknown employee',
        employeeId: request.employeeId || '—',
        department: request.department || '—',
        requestId: requestId,
        departmentClearances: [],
        status: request.overallStatus || request.status || 'Pending',
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleGenerateCertificate = async () => {
    const requestId = selectedRequest?.requestId || selectedRequest?._id;
    if (!requestId) return;
    if (!localStorage.getItem('token')) {
      setDecisionError('No sign-in token is stored in this browser. Please sign in again before generating a certificate.');
      return;
    }

    try {
      setCertificateSaving(true);
      setDecisionError('');
      const { data } = await axios.post(
        `http://localhost:3000/api/hr-final-clearance/clearance/${requestId}/certificate`,
        {},
        authConfig(),
      );
      navigate('/hr-office/certificates', {
        replace: true,
        state: { generatedCertificateNo: data?.certificate?.number || '' },
      });
    } catch (error) {
      setDecisionError(getFinalHRErrorMessage(error, 'Unable to generate certificate.'));
    } finally {
      setCertificateSaving(false);
    }
  };

  const selectedProgress = selectedRequest ? getProgressInfo(selectedRequest) : null;
  const certificateReady = Boolean(selectedProgress
    && selectedProgress.completed === selectedProgress.total
    && (selectedProgress.total > 0
      || (selectedRequest?.initialHRStatus === 'Approved' && selectedRequest?.departmentStatus === 'Approved')));
  const hrApproved = Boolean(selectedRequest?.finalHRApproval === true && selectedRequest?.status === 'Completed');
  const certificateAvailable = Boolean(hrApproved && certificateReady);

  const handleFinalHRApproval = async () => {
    const requestId = selectedRequest?.requestId || selectedRequest?._id;
    if (!requestId || !certificateReady) return;

    try {
      setDecisionSaving(true);
      setDecisionError('');
      const { data } = await axios.patch(`http://localhost:3000/api/hr-final-clearance/clearance/${requestId}/decision`, {
        decision: 'Completed',
        checklistCompleted: true,
        remarks: 'All required offices cleared and final HR verification completed.',
      }, authConfig());
      const approvedClearance = data?.clearance || { ...selectedRequest, status: 'Completed', finalHRApproval: true, checklistCompleted: true };
      setSelectedRequest(approvedClearance);
      setRequests((previous) => previous.map((request) => request.requestId === requestId
        ? { ...request, status: 'Completed', overallStatus: 'CERTIFICATE ISSUED', finalHRApproval: true }
        : request));
      const { data: certificateData } = await axios.post(
        `http://localhost:3000/api/hr-final-clearance/clearance/${requestId}/certificate`,
        {},
        authConfig(),
      );
      const { data: detailsData } = await axios.get(`http://localhost:3000/api/hr-final-clearance/clearance/${requestId}`);
      navigate('/hr-office/certificate-preview', {
        state: {
          clearance: {
            ...(detailsData?.clearance || approvedClearance),
            certificate: certificateData?.certificate || approvedClearance.certificate,
          },
          fromDetails: true,
          autoDownload: true,
        },
      });
    } catch (error) {
      setDecisionError(getFinalHRErrorMessage(error, 'Unable to complete final HR approval.'));
    } finally {
      setDecisionSaving(false);
    }
  };

  return (
    <div className="flex h-full min-h-screen w-full flex-col bg-[#edf1f5] text-slate-800 text-xs font-sans">
      <div className="flex-1 flex flex-col overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="cursor-pointer">Dashboard</span>
            <span className="text-slate-300">≡</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Bell size={18} className="text-slate-600" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">5</span>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1.5">
              <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80" alt="User" className="h-8 w-8 rounded-full object-cover" />
              <span className="text-[12px] font-semibold text-slate-800">HR Officer</span>
              <ChevronDown size={14} className="text-slate-500" />
            </div>
          </div>
        </header>

        <main className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[34px] font-bold tracking-tight text-slate-900">Final HR Clearance</h1>
              <p className="mt-1 text-[12px] text-slate-500">This page shows the clearance requests and their progress from all offices.</p>
            </div>

            <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-[#0e63d6] px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm hover:bg-[#0d56b8]">
              <Download size={16} />
              Export
            </button>
          </div>

          <div className="mt-6 flex items-center flex-wrap gap-3">
            <div className="relative w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by employee name or ID..."
                className="w-full rounded-md border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[12px] text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
              />
            </div>

            <div className="relative">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="appearance-none rounded-md border border-slate-200 bg-white px-3 py-2.5 pr-9 text-[12px] text-slate-700 focus:border-sky-400 focus:outline-none"
              >
                {departments.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            </div>

            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="appearance-none rounded-md border border-slate-200 bg-white px-3 py-2.5 pr-9 text-[12px] text-slate-700 focus:border-sky-400 focus:outline-none"
              >
                <option value="All Status">All Status</option>
                <option value="APPROVED">Approved</option>
                <option value="CERTIFICATE ISSUED">Certificate Issued</option>
                <option value="PENDING">Pending</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            </div>

            <div className="relative flex items-center gap-2">
              <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[12px] text-slate-600">
                <span>From Date</span>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-transparent text-slate-700 outline-none" />
                <CalendarDays size={14} className="text-slate-400" />
              </label>
              <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[12px] text-slate-600">
                <span>To Date</span>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-transparent text-slate-700 outline-none" />
                <CalendarDays size={14} className="text-slate-400" />
              </label>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr className="bg-slate-50 text-[12px] font-semibold text-slate-600">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Employee ID</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Request Date</th>
                  <th className="px-4 py-3">Offices Progress</th>
                  <th className="px-4 py-3">Overall Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-slate-500">Loading final HR clearance requests...</td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-slate-500">No clearance requests found.</td>
                  </tr>
                ) : (
                  visibleRows.map((request, index) => {
                    const info = getProgressInfo(request);

                    return (
                      <tr key={request._id || request.requestId || index} className="border-t border-slate-200 text-[12px] text-slate-700 odd:bg-white even:bg-slate-50/50">
                        <td className="px-4 py-4 font-medium text-slate-500">{(page - 1) * pageSize + index + 1}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80" alt={request.employeeName || 'Employee'} className="h-9 w-9 rounded-full object-cover" />
                            <span className="font-medium text-slate-700">{request.employeeName || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-600">{request.employeeId || '—'}</td>
                        <td className="px-4 py-4 text-slate-600">{request.department || '—'}</td>
                        <td className="px-4 py-4 text-slate-600">{formatDate(request.requestDate || request.createdAt)}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            {info.departmentClearances.map((office, dotIndex) => {
                              const officeStatus = String(office.status || 'Pending').toLowerCase();
                              const approved = ['approved', 'completed', 'cleared'].includes(officeStatus);
                              const returned = ['returned', 'rejected'].includes(officeStatus);
                              return (
                                <span
                                  key={`${request._id || request.requestId}-dot-${dotIndex}`}
                                  title={`${office.name}: ${office.status || 'Pending'}`}
                                  aria-label={`${office.name}: ${office.status || 'Pending'}`}
                                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold ${
                                    approved
                                      ? 'border-emerald-200 bg-emerald-500 text-white'
                                      : returned
                                        ? 'border-rose-200 bg-rose-500 text-white'
                                        : 'border-amber-200 bg-amber-400 text-white'
                                  }`}
                                >
                                  {approved ? '✓' : returned ? '!' : ''}
                                </span>
                              );
                            })}
                            <span className="ml-2 text-slate-500">
                              {info.hasOffices ? `${info.progress} Approved` : 'No additional offices assigned'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-md border px-2.5 py-1 text-[10px] font-semibold ${
                              info.statusType === 'ready'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : info.statusType === 'progress'
                                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                                  : info.statusType === 'pending'
                                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {info.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => handleViewRequest(request)}
                            className="inline-flex items-center gap-2 rounded-md bg-[#0e63d6] px-3 py-2 text-[11px] font-medium text-white hover:bg-[#0d56b8]"
                          >
                            <Eye size={13} />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-[12px] text-slate-600">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} />
                Previous
              </button>

              <span className="px-1 font-medium text-slate-700">Page {page} of {totalPages}</span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="inline-flex items-center gap-1 rounded-md bg-[#5a7ef8] px-3 py-2 font-semibold text-white shadow-sm transition hover:bg-[#4a6fea] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="flex items-center gap-2 text-slate-600">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-blue-400"
              >
                {[10, 20, 30, 50].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedRequest && (
            <div className={routeRequestId ? 'fixed inset-0 z-50 overflow-y-auto bg-[#edf1f5] p-6' : 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm'}>
              <div className={routeRequestId ? 'mx-auto min-h-full w-full max-w-6xl border border-slate-200 bg-[#eef2f7]' : 'max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-[#eef2f7] shadow-2xl'}>
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <h2 className="text-[14px] font-bold text-slate-800">Final HR Clearance Details</h2>
                  </div>
                  <button type="button" onClick={() => routeRequestId ? navigate('/hr-office/final-hr-clearance') : setSelectedRequest(null)} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800">
                    <X size={16} />
                  </button>
                </div>

                {detailLoading ? (
                  <div className="px-6 py-10 text-center text-[12px] text-slate-500">Loading clearance details...</div>
                ) : (
                  <div className="grid gap-5 p-5 lg:grid-cols-[1.45fr_0.8fr]">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-4 text-[13px] font-semibold text-slate-700">Employee Information</div>
                      <div className="grid grid-cols-2 gap-x-5 gap-y-3 text-[11px] text-slate-700">
                        <div>
                          <div className="text-slate-400">Full Name:</div>
                          <div className="mt-1 font-semibold text-slate-800">{selectedRequest.employeeName || '—'}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Employee ID:</div>
                          <div className="mt-1 font-semibold text-slate-800">{selectedRequest.employeeId || '—'}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Department:</div>
                          <div className="mt-1 font-semibold text-slate-800">{selectedRequest.department || '—'}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Position:</div>
                          <div className="mt-1 font-semibold text-slate-800">{selectedRequest.position || '—'}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Campus:</div>
                          <div className="mt-1 font-semibold text-slate-800">{selectedRequest.campus || '—'}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Email:</div>
                          <div className="mt-1 truncate font-semibold text-slate-800">{selectedRequest.email || '—'}</div>
                        </div>
                      </div>

                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <div className="mb-3 text-[13px] font-semibold text-slate-700">Clearance Request Information</div>
                        <div className="grid grid-cols-2 gap-x-5 gap-y-3 text-[11px] text-slate-700">
                          <div><div className="text-slate-400">Request ID:</div><div className="mt-1 font-semibold text-slate-800">{selectedRequest.requestId || '—'}</div></div>
                          <div><div className="text-slate-400">Clearance Type:</div><div className="mt-1 font-semibold text-slate-800">{selectedRequest.clearanceType || '—'}</div></div>
                          <div><div className="text-slate-400">Request Date:</div><div className="mt-1 font-semibold text-slate-800">{formatDate(selectedRequest.requestDate || selectedRequest.createdAt)}</div></div>
                          <div><div className="text-slate-400">Last Working Date:</div><div className="mt-1 font-semibold text-slate-800">{formatDate(selectedRequest.lastWorkingDate || selectedRequest.expectedLastWorkingDate)}</div></div>
                        </div>
                      </div>

                      <div className="mt-5">
                        <div className="mb-3 text-[13px] font-semibold text-slate-700">Office Clearance Summary</div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {selectedProgress.departmentClearances.map((office, index) => {
                            const cleared = ['approved', 'completed', 'cleared'].includes(String(office.status || '').toLowerCase());
                            const returned = ['returned', 'rejected'].includes(String(office.status || '').toLowerCase());
                            return (
                              <div key={`${office.name || office.department || 'office'}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px]">
                                <span className="font-medium text-slate-700">{office.name || office.department || 'Office'}</span>
                                <span className={`font-semibold ${cleared ? 'text-emerald-700' : returned ? 'text-red-600' : 'text-amber-700'}`}>{cleared ? 'Approved' : returned ? 'Returned' : String(office.status || 'Pending')}</span>
                                <span className="ml-2 text-[10px] text-slate-400">{office.clearedBy}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-[11px]">
                        <span className="font-semibold text-slate-600">Overall Progress</span>
                        <span className="font-bold text-slate-800">
                          {selectedProgress.hasOffices ? `${selectedProgress.progress} Offices Approved (${Math.round(selectedProgress.percentage)}%)` : 'No additional offices assigned'}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-3 text-[13px] font-semibold text-slate-700">Actions</div>
                      <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Overall Status</div>
                        <div className="mt-1 font-bold text-emerald-800">{hrApproved ? 'HR FINAL APPROVED' : selectedProgress.status}</div>
                        <div className="mt-1 text-[10px] text-emerald-700">
                          {selectedProgress.hasOffices
                            ? `${selectedProgress.completed}/${selectedProgress.total} offices approved`
                            : 'No additional offices assigned'}
                        </div>
                      </div>
                      {decisionError && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-[11px] text-red-700">{decisionError}</div>}
                      <div className="space-y-3">
                        <div
                          title={!certificateReady ? 'Cannot issue clearance until all assigned departments approve.' : undefined}
                          className="w-full"
                        >
                          <button
                            type="button"
                            onClick={handleFinalHRApproval}
                            disabled={!certificateReady || hrApproved || decisionSaving}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0e63d6] px-3 py-2.5 text-[11px] font-bold text-white hover:bg-[#0d56b8] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <CheckCircle2 size={14} />
                            {decisionSaving ? 'Approving & generating...' : hrApproved ? 'Final HR Approved' : certificateReady ? 'Issue Final Clearance & Generate Certificate' : `Awaiting ${selectedProgress.completed}/${selectedProgress.total} office approvals`}
                          </button>
                        </div>
                        {!certificateReady && (
                          <p className="text-[10px] text-amber-700">
                            Cannot issue clearance until all assigned departments approve.
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate('/hr-office/certificate-preview', { state: { clearance: selectedRequest, fromDetails: true } })}
                          disabled={!certificateAvailable}
                          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Eye size={14} />
                          {certificateAvailable ? 'Preview Certificate' : 'Complete HR Approval First'}
                        </button>
                        <button
                          type="button"
                          onClick={handleGenerateCertificate}
                          disabled={!certificateAvailable || certificateSaving}
                          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2cc26b] px-3 py-2.5 text-[11px] font-bold text-white hover:bg-[#25ad5d] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ShieldCheck size={14} />
                          {certificateSaving ? 'Generating...' : certificateAvailable ? 'Generate Certificate' : 'Awaiting HR Final Approval'}
                        </button>
                      </div>
                    </div>

                    <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="text-[13px] font-semibold text-slate-700">Clearance Progress</div>
                        <span className="text-[11px] font-bold text-slate-600">
                          {selectedProgress.hasOffices ? `${selectedProgress.progress} Offices` : 'No additional offices assigned'}
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${selectedProgress.percentage}%` }} /></div>
                      <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
                        {selectedProgress.departmentClearances.map((office, index) => (
                          <div key={`progress-${office.name || office.department || 'office'}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-center text-[10px]">
                            <div className="font-medium text-slate-600">{office.name || office.department || 'Office'}</div>
                            <div className="mt-1 font-bold text-slate-800">{['approved', 'completed', 'cleared'].includes(String(office.status || '').toLowerCase()) ? 'Approved' : office.status || 'Pending'}</div>
                            <div className="mt-1 text-slate-400">{office.clearedBy}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3 text-[11px] text-slate-500">
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-500"></span> Cleared</div>
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-400"></span> Pending</div>
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-500"></span> Returned</div>
          </div>

          <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-[11px] text-sky-800">
            <strong>Note:</strong> Each request is measured against the offices selected for that employee in HR Workflow{maxAssignedOfficeCount > 0 ? ` (up to ${maxAssignedOfficeCount} assigned office${maxAssignedOfficeCount === 1 ? '' : 's'} in the current list)` : ''}. Final clearance and certificate actions are available only after all assigned offices approve.
          </div>
        </main>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, description, tone, icon }) {
  const toneStyle = {
    blue: 'bg-[#eaf3ff] text-[#2a6ad4]',
    amber: 'bg-[#fef3d9] text-[#c37809]',
    green: 'bg-[#e8f7ee] text-[#1a9d5b]',
    purple: 'bg-[#f1ebff] text-[#6f4acb]',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[12px] text-slate-500">{title}</div>
          <div className="mt-2 text-[30px] font-bold leading-none text-slate-900">{value}</div>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${toneStyle[tone]}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3 text-[11px] text-slate-500">{description}</div>
    </div>
  );
}