import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Calendar,
  Filter,
  RotateCcw,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

const departmentUpdateUrl = (id) => `http://localhost:3000/api/clearance/${id}`;
const updateDepartmentClearance = async (id, payload) => {
  const response = await axios.put(departmentUpdateUrl(id), payload, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
  });
  return response.data;
};

const getDepartmentStatus = (request) => {
  const departmentHistory = Array.isArray(request?.departmentClearances)
    ? request.departmentClearances
    : [];
  const latestDepartmentStatus = departmentHistory.length
    ? departmentHistory[departmentHistory.length - 1]?.status
    : '';
  const status = request?.departmentStatus || latestDepartmentStatus || request?.status || 'Pending';
  if (status === 'In Progress') return 'Under Review';
  if (status === 'Rejected') return 'Returned';
  return status;
};

const formatDate = (value, options = { month: 'short', day: 'numeric', year: 'numeric' }) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', options);
};

export default function ClearanceRequests() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('status') || 'All Requests');
  const [searchTerm, setSearchTerm] = useState('');
  const [clearanceType, setClearanceType] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('Pending');
  const [comment, setComment] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [departmentClearanceItems, setDepartmentClearanceItems] = useState([]);
  const [stats, setStats] = useState({ all: 0, pending: 0, underReview: 0, approved: 0, returned: 0, completed: 0 });

  const fetchRequests = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/clearance-requests', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        params: { status: activeTab, search: searchParams.get('requestId') || searchTerm, clearanceType, fromDate, toDate, page, limit: 8 },
      });
      setData(response.data.requests || []);
      setTotalEntries(response.data.totalCount || 0);
      setTotalPages(response.data.totalPages || 1);
      setStats(response.data.stats || {});
      const requestId = searchParams.get('requestId');
      if (requestId) {
        const request = (response.data.requests || []).find((item) => item.requestId === requestId);
        if (request) selectRequest(request);
      }
    } catch (fetchError) {
      setError(fetchError.response?.data?.message || 'Unable to load clearance requests.');
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeTab, page, searchParams, searchTerm, clearanceType, fromDate, toDate]);

  useEffect(() => {
    if (selectedRequest) {
      setReviewStatus(getDepartmentStatus(selectedRequest));
      setComment(selectedRequest.departmentComment || selectedRequest.remarks || '');
      setReturnReason(selectedRequest.departmentReturnReason || selectedRequest.returnReason || '');
      setIsReturnMode(false);
      
      const savedItems = Array.isArray(selectedRequest.departmentClearances)
        ? selectedRequest.departmentClearances
        : [];
      const defaultItems = ['Department Documents', 'Department Materials', 'Office / Room', 'Department Responsibility'];
      const items = defaultItems.map((itemName) => {
        const savedItem = savedItems.find((item) =>
          [item.office, item.item, item.name].filter(Boolean).some((value) => String(value).toLowerCase() === itemName.toLowerCase())
        );
        return {
          item: itemName,
          status: savedItem?.status || (getDepartmentStatus(selectedRequest) === 'Approved' ? 'Cleared' : 'Pending'),
          comment: savedItem?.comment || '',
          returnReason: savedItem?.returnReason || '',
        };
      });
      setDepartmentClearanceItems(items);
    }
  }, [selectedRequest]);

  const handleReset = () => {
    setSearchTerm('');
    setClearanceType('All');
    setFromDate('');
    setToDate('');
    setPage(1);
    fetchRequests();
  };

  const selectRequest = (request) => {
    setSelectedRequest(request);
    setReviewStatus(getDepartmentStatus(request));
    setComment(request?.departmentComment || request?.remarks || '');
    setReturnReason(request?.departmentReturnReason || request?.returnReason || '');
    setIsReturnMode(false);
    setError('');
  };

  const saveDepartmentDecision = async (status, requestOverride = null) => {
    const request = requestOverride || selectedRequest;
    if (!request?._id || isSaving) return;
    setIsSaving(true);
    setError('');
    try {
      const apiStatus = status === 'Under Review' ? 'In Progress' : status;
      const response = await updateDepartmentClearance(request._id, {
        status: apiStatus,
        remarks: comment.trim(),
        returnReason: returnReason.trim(),
        departmentClearances: [{
          office: request.department || 'Department',
          status: apiStatus,
          clearedBy: status === 'Approved' ? 'Department Head' : '',
          clearedDate: status === 'Approved' ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
          comment: comment.trim(),
          returnReason: returnReason.trim(),
        }],
      });
      if (response.success) {
        const savedClearance = response.clearance || {};
        setSelectedRequest((current) => ({ ...current, ...savedClearance }));
        setReviewStatus(getDepartmentStatus(savedClearance));
        await fetchRequests();
      }
    } catch (decisionError) {
      setError(decisionError.response?.data?.message || 'Unable to update department clearance.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartDepartmentReview = () => saveDepartmentDecision('Under Review');
  const handleApproveDepartmentClearance = () => saveDepartmentDecision('Approved');
  const handleApproveFromList = (request) => {
    selectRequest(request);
    return saveDepartmentDecision('Approved', request);
  };
  const handleReturnDepartmentClearance = () => {
    if (!returnReason.trim()) {
      setError('Return reason is required.');
      return;
    }
    saveDepartmentDecision('Returned');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'Under Review':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'Approved':
        return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'Returned':
        return 'bg-red-50 text-red-600 border-red-200';
      case 'Completed':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const renderActionButtons = (item) => {
    const baseButtonClass = "px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors whitespace-nowrap";
    const status = getDepartmentStatus(item);
    return (
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <button
          onClick={() => selectRequest(item)}
          className={`${baseButtonClass} bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100`}
        >
          View
        </button>
        {status === 'Under Review' && (
          <button
            onClick={() => handleApproveFromList(item)}
            disabled={isSaving}
            className={`${baseButtonClass} bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60`}
          >
            Approve
          </button>
        )}
        {status === 'Returned' && (
          <button
            onClick={() => {
              selectRequest(item);
              setReviewStatus('Under Review');
              setReturnReason('');
              setIsReturnMode(false);
            }}
            className={`${baseButtonClass} bg-orange-600 text-white hover:bg-orange-700`}
          >
            Review Again
          </button>
        )}
      </div>
    );
    /*
    switch (item.status) {
      case 'Pending':
        return (
          <div className="flex items-center gap-1.5 justify-center flex-wrap">
            <button
              onClick={() => setSelectedRequest(item)}
              className={`${baseButtonClass} bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100`}
            >
              View
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => {
                startReviewFromList(item);
              }}
              className={`${baseButtonClass} bg-teal-600 text-white hover:bg-teal-700`}
            >
              Start Review
            </button>
          </div>
        );
      
      case 'Under Review':
        return (
          <div className="flex items-center gap-1.5 justify-center flex-wrap">
            <button
              onClick={() => setSelectedRequest(item)}
              className={`${baseButtonClass} bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100`}
            >
              View
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => {
                setSelectedRequest(item);
                setReviewStatus('Approved');
              }}
              className={`${baseButtonClass} bg-emerald-600 text-white hover:bg-emerald-700`}
            >
              Approve
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => {
                setSelectedRequest(item);
                setReturnReason('');
              }}
              className={`${baseButtonClass} bg-red-600 text-white hover:bg-red-700`}
            >
              Return
            </button>
          </div>
        );
      
      case 'Approved':
        return (
          <button
            onClick={() => setSelectedRequest(item)}
            className={`${baseButtonClass} bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100`}
          >
            View
          </button>
        );
      
      case 'Returned':
        return (
          <div className="flex items-center gap-1.5 justify-center flex-wrap">
            <button
              onClick={() => setSelectedRequest(item)}
              className={`${baseButtonClass} bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100`}
            >
              View
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => {
                setSelectedRequest(item);
                setReviewStatus('Under Review');
                setReturnReason('');
              }}
              className={`${baseButtonClass} bg-orange-600 text-white hover:bg-orange-700`}
            >
              Review Again
            </button>
          </div>
        );
      
      case 'Completed':
        return (
          <button
            onClick={() => setSelectedRequest(item)}
            className={`${baseButtonClass} bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200`}
          >
            View
          </button>
        );
      
      default:
        return (
          <button
            onClick={() => setSelectedRequest(item)}
            className={`${baseButtonClass} bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200`}
          >
            View
          </button>
        );
    }
    */
  };

  const tabs = [
    { label: 'All Requests', count: stats.all, color: 'bg-teal-700 text-white' },
    { label: 'Pending', count: stats.pending, badge: 'bg-amber-500 text-white' },
    { label: 'Under Review', count: stats.underReview, badge: 'bg-blue-500 text-white' },
    { label: 'Approved', count: stats.approved, badge: 'bg-emerald-500 text-white' },
    { label: 'Returned', count: stats.returned, badge: 'bg-red-500 text-white' },
    { label: 'Completed', count: stats.completed, badge: 'bg-slate-500 text-white' }
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 p-6 font-sans text-xs text-slate-700">
      {/* Header & Breadcrumb */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-slate-900">Clearance Requests</h1>
        <div className="text-slate-400 text-[11px] font-medium space-x-1">
          <span className="hover:text-slate-600 cursor-pointer">Home</span>
          <span>/</span>
          <span className="text-slate-700 font-semibold">Clearance Requests</span>
        </div>
      </div>

      {/* Top Filter Tabs / Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.label;
          return (
            <button
              key={tab.label}
              onClick={() => {
                setActiveTab(tab.label);
                setPage(1);
              }}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                isActive
                  ? 'bg-teal-700 border-teal-700 text-white shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <span className="font-semibold text-[11px]">{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isActive ? 'bg-teal-800 text-white' : tab.badge
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm mb-6 flex flex-wrap gap-4 items-end justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 flex-1">
          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by employee name or ID.."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-9 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-teal-600 transition-colors"
            />
            <Search size={14} className="absolute right-3 top-2.5 text-slate-400" />
          </div>

          {/* Clearance Type Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
              Clearance Type
            </label>
            <div className="relative">
              <select
                value={clearanceType}
                onChange={(e) => setClearanceType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 appearance-none outline-none focus:border-teal-600 cursor-pointer"
              >
                <option value="All">All</option>
                <option value="Separation Clearance">Separation Clearance</option>
                <option value="End of Contract">End of Contract</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* From Date Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
              From Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-teal-600"
              />
            </div>
          </div>

          {/* To Date Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
              To Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-teal-600"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchRequests}
            className="bg-teal-700 hover:bg-teal-800 text-white font-semibold px-4 py-2 rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <Filter size={14} />
            <span>Filter</span>
          </button>
          <button
            onClick={handleReset}
            className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold px-3 py-2 rounded-lg flex items-center space-x-1.5 transition-colors"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-800 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3.5 px-4 w-10 text-center">#</th>
                <th className="py-3.5 px-4">Employee ID</th>
                <th className="py-3.5 px-4">Employee Name</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Position</th>
                <th className="py-3.5 px-4">Request Date</th>
                <th className="py-3.5 px-4">Clearance Type</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {data.length > 0 ? (
                data.map((item, index) => (
                  <tr key={item._id || index} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-500">
                      {(page - 1) * 8 + index + 1}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{item.employeeId}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{item.employeeName}</td>
                    <td className="py-3.5 px-4">{item.department}</td>
                    <td className="py-3.5 px-4">{item.position}</td>
                    <td className="py-3.5 px-4">
                      {new Date(item.requestDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3.5 px-4">{item.clearanceType}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-3 py-1 rounded-md text-[10px] font-semibold border ${getStatusBadge(
                          getDepartmentStatus(item)
                        )}`}
                      >
                        {getDepartmentStatus(item)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {renderActionButtons(item)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="text-center py-6 text-slate-400">
                    No requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="flex justify-between items-center p-4 border-t border-slate-100 text-[11px] text-slate-500">
          <div>
            Showing {data.length > 0 ? (page - 1) * 8 + 1 : 0} to{' '}
            {Math.min(page * 8, totalEntries)} of {totalEntries} entries
          </div>
          <div className="flex items-center space-x-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              className="p-1.5 rounded border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1 rounded font-bold ${
                  page === p
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100 font-medium'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              className="p-1.5 rounded border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 overflow-y-auto"
          onClick={() => setSelectedRequest(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="clearance-review-title"
            className="w-full max-w-4xl rounded-xl bg-white shadow-2xl my-8"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-white">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <ChevronLeft size={20} />
                </button>
                <div>
                  <h2 id="clearance-review-title" className="text-lg font-bold text-slate-900">
                    Department Clearance Review
                  </h2>
                  <p className="text-xs text-slate-500">Request ID: {selectedRequest.requestId || selectedRequest._id}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-md text-xs font-bold ${
                reviewStatus === 'Pending' ? 'bg-amber-100 text-amber-700' :
                reviewStatus === 'Under Review' ? 'bg-blue-100 text-blue-700' :
                reviewStatus === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                reviewStatus === 'Returned' ? 'bg-red-100 text-red-700' :
                reviewStatus === 'Completed' ? 'bg-slate-100 text-slate-700' :
                'bg-slate-100 text-slate-700'
              }`}>
                {reviewStatus}
              </span>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {error && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Two Column Info Cards */}
              <div className="grid grid-cols-2 gap-4">
                {/* Employee Information Card */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs">👤</div>
                    <h3 className="text-sm font-bold text-slate-900">Employee Information</h3>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <p className="text-slate-500 font-semibold">Employee ID:</p>
                      <p className="text-slate-800 font-bold">{selectedRequest.employeeId}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">Full Name:</p>
                      <p className="text-slate-800 font-bold">{selectedRequest.employeeName}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">Department:</p>
                      <p className="text-slate-800 font-bold">{selectedRequest.department}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">Position:</p>
                      <p className="text-slate-800 font-bold">{selectedRequest.position}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">Campus:</p>
                      <p className="text-slate-800 font-bold">{selectedRequest.campus || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Request Information Card */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">📋</div>
                    <h3 className="text-sm font-bold text-slate-900">Request Information</h3>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <p className="text-slate-500 font-semibold">Request ID:</p>
                      <p className="text-blue-600 font-bold">{selectedRequest.requestId || selectedRequest._id}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">Request Date:</p>
                      <p className="text-slate-800 font-bold">
                        {formatDate(selectedRequest.requestDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">Current Status:</p>
                      <p className="text-slate-800 font-bold">{reviewStatus}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">Reason:</p>
                      <p className="text-slate-800 font-bold">{selectedRequest.reason || selectedRequest.clearanceReason || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decision Form Section */}
              <div className="border border-slate-200 rounded-lg p-5 bg-white">
                <h3 className="text-sm font-bold text-slate-900 mb-4">Department Head Decision</h3>
                
                {reviewStatus === 'Pending' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-xs text-amber-800">
                      <span className="font-bold">Status: Pending Review</span> — Review the employee's clearance information above and click "Start Review" to begin the clearance process.
                    </p>
                  </div>
                )}

                {reviewStatus === 'Under Review' && !isReturnMode && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-800">
                        <span className="font-bold">Reviewing:</span> Check all department clearance items above. If everything is complete, approve. If there are issues, return the request.
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Comment (Optional)</label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Add any review comments..."
                        className="w-full mt-2 px-4 py-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 resize-none"
                        rows="2"
                      />
                    </div>
                  </div>
                )}

                {reviewStatus === 'Under Review' && isReturnMode && (
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-xs text-red-800">
                        <span className="font-bold">Returning Request:</span> Provide the reason why this clearance request is being returned to the employee.
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-red-700 uppercase tracking-wide">Return Reason *</label>
                      <textarea
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        placeholder="Explain why this request is being returned (e.g., Outstanding department materials)..."
                        className="w-full mt-2 px-4 py-2.5 text-xs border border-red-200 rounded-lg focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 resize-none bg-red-50"
                        rows="2"
                      />
                    </div>
                  </div>
                )}

                {reviewStatus === 'Approved' && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-xs text-emerald-700 font-bold mb-1">✓ Department Clearance Approved</p>
                    <p className="text-xs text-emerald-600 mb-2">This employee's department clearance has been successfully approved.</p>
                    <div className="grid gap-2 text-xs text-emerald-700 sm:grid-cols-2">
                      <p><span className="font-semibold">Reviewed By:</span> {selectedRequest.departmentReviewedBy || 'Department Head'}</p>
                      <p><span className="font-semibold">Reviewed Date:</span> {formatDate(selectedRequest.departmentReviewedAt || selectedRequest.reviewedAt)}</p>
                    </div>
                    {(comment || selectedRequest.departmentComment) && <p className="text-xs text-emerald-600 italic mt-2">Comment: {comment || selectedRequest.departmentComment}</p>}
                  </div>
                )}

                {reviewStatus === 'Returned' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-xs text-red-700 font-bold mb-1">↺ Request Returned</p>
                    <p className="text-xs text-red-600 mb-2">This clearance request has been returned to the employee for further action.</p>
                    <p className="text-xs text-red-600 italic">Return Reason: {returnReason || selectedRequest.departmentReturnReason || selectedRequest.returnReason || 'Not specified'}</p>
                  </div>
                )}

                {reviewStatus === 'Completed' && (
                  <div className="bg-slate-100 border border-slate-300 rounded-lg p-4">
                    <p className="text-xs text-slate-700 font-bold mb-1">✓ Clearance Completed</p>
                    <p className="text-xs text-slate-600">This clearance request has been completed and archived.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50 rounded-b-xl">
              <div className="flex items-center space-x-2">
                <AlertCircle size={16} className="text-slate-400" />
                <p className="text-xs text-slate-600 font-semibold">
                  {reviewStatus === 'Pending' && '⏳ Click "Start Review" to begin the clearance review process'}
                  {reviewStatus === 'Under Review' && '🔍 Review department items above, then approve or return the request'}
                  {reviewStatus === 'Approved' && '✓ Department clearance approved — Proceeding to next office'}
                  {reviewStatus === 'Returned' && '↺ Request returned to employee for further action'}
                  {reviewStatus === 'Completed' && '✓ Clearance completed and archived'}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => navigate(`/department-head/department-assets?requestId=${encodeURIComponent(selectedRequest.requestId || selectedRequest._id)}`)}
                  className="border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold px-4 py-2 rounded-lg transition-colors text-xs"
                >
                  Department Assets
                </button>

                {reviewStatus === 'Pending' && (
                  <button
                    onClick={handleStartDepartmentReview}
                    disabled={isSaving}
                    className="bg-teal-600 hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-lg transition-colors shadow-sm text-xs flex items-center space-x-1.5"
                  >
                    <span>{isSaving ? 'Saving...' : 'Start Review'}</span>
                  </button>
                )}

                {reviewStatus === 'Under Review' && !isReturnMode && (
                  <>
                    <button
                      onClick={() => {
                        setIsReturnMode(true);
                        setError('');
                      }}
                      className="border border-red-300 bg-white hover:bg-red-50 text-red-700 font-semibold px-4 py-2 rounded-lg transition-colors text-xs"
                    >
                      Return Request
                    </button>
                    <button
                      onClick={handleApproveDepartmentClearance}
                      disabled={isSaving}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-lg transition-colors shadow-sm text-xs"
                    >
                      {isSaving ? 'Saving...' : 'Approve Clearance'}
                    </button>
                  </>
                )}

                {reviewStatus === 'Under Review' && isReturnMode && (
                  <>
                    <button
                      onClick={() => {
                        setIsReturnMode(false);
                        setReturnReason('');
                        setError('');
                      }}
                      className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2 rounded-lg transition-colors text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReturnDepartmentClearance}
                      disabled={isSaving}
                      className="bg-red-600 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-lg transition-colors shadow-sm text-xs"
                    >
                      {isSaving ? 'Saving...' : 'Confirm Return'}
                    </button>
                  </>
                )}

                {reviewStatus === 'Approved' && (
                  <button
                    onClick={() => alert('Viewing clearance certificate...')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors shadow-sm text-xs"
                  >
                    View Details
                  </button>
                )}

                {reviewStatus === 'Returned' && (
                  <button
                    onClick={() => {
                      setReturnReason('');
                      setIsReturnMode(false);
                      handleStartDepartmentReview();
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors shadow-sm text-xs"
                  >
                    Review Again
                  </button>
                )}

                {reviewStatus === 'Completed' && (
                  <button
                    onClick={() => alert('Viewing completed clearance details...')}
                    className="bg-slate-600 hover:bg-slate-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors shadow-sm text-xs"
                  >
                    View Details
                  </button>
                )}

                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setReviewStatus('Pending');
                    setComment('');
                    setReturnReason('');
                    setIsReturnMode(false);
                  }}
                  className="border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold px-4 py-2 rounded-lg transition-colors text-xs ml-2"
                >
                  Close
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
