import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  Laptop,
  User,
  Play,
  X,
  RefreshCw,
  Boxes,
  Check,
  AlertTriangle,
} from "lucide-react";
import { getICTOfficerSettings } from './ICTSettings';

// Inline API call handler
const API_URL = "http://localhost:3000/api/ict/clearance-requests";

const getAuthConfig = () => {
  const token = localStorage.getItem("token");
  return { headers: { Authorization: `Bearer ${token}` } };
};

const mapDefaultViewToTab = (defaultView = 'Pending') => {
  if (defaultView === 'All') return 'All';
  if (defaultView === 'Under Review') return 'Under Review';
  return 'Pending';
};

const normalizeStatus = (status = '') => {
  const normalized = String(status || '').trim().toLowerCase();
  const statusMap = {
    pending: 'Pending',
    'pending review': 'Pending',
    'in progress': 'Under Review',
    'under review': 'Under Review',
    approved: 'Approved',
    returned: 'Returned',
    rejected: 'Returned',
    completed: 'Approved',
  };
  return statusMap[normalized] || status || 'Pending';
};
const getStatusLabel = (status = '') => normalizeStatus(status);
const asArray = (value) => Array.isArray(value) ? value : [];

const IctClearanceRequestsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => searchParams.get('requestId')
    ? 'All'
    : mapDefaultViewToTab(getICTOfficerSettings().clearancePreferences.defaultView));
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [returnReason, setReturnReason] = useState("");
  const [verificationResult, setVerificationResult] = useState("Not Clear");

  // Process Modal State
  const [remarks, setRemarks] = useState("");
  const [assets, setAssets] = useState([]);
  const [ictChecklist, setIctChecklist] = useState({
    laptopReturned: false,
    desktopReturned: false,
    monitorReturned: false,
    otherEquipmentReturned: false,
    accountAccessChecked: false,
    noOutstandingObligation: false,
  });

  useEffect(() => {
    const requestedStatus = searchParams.get('status');
    if (['All', 'Pending', 'Under Review', 'Approved', 'Returned'].includes(requestedStatus)) {
      setActiveTab(requestedStatus);
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'All' ? {} : { status: tab });
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_URL}?status=${activeTab}&search=${searchTerm}`,
        getAuthConfig()
      );
      setRequests(res.data.data);
    } catch (error) {
      console.error("ጥያቄዎችን መጫን አልተቻለም:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const settings = getICTOfficerSettings();
    setActiveTab((prev) => {
      const mapped = mapDefaultViewToTab(settings.clearancePreferences.defaultView);
      return prev === 'All' || prev === 'Pending' || prev === 'Pending Review' || prev === 'Under Review' ? mapped : prev;
    });
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [activeTab, searchTerm]);

  useEffect(() => {
    const settings = getICTOfficerSettings();
    if (!settings.clearancePreferences.autoRefresh) return undefined;

    const intervalId = setInterval(() => {
      fetchRequests();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [activeTab, searchTerm, getICTOfficerSettings().clearancePreferences.autoRefresh]);

  const handleOpenReviewModal = (req) => {
    setSelectedRequest(req);
    setIsReviewing(["Under Review", "Returned"].includes(normalizeStatus(req.status)));
    setRemarks(req.remarks || "");
    const requestAssets = asArray(req.assetsIssued);
    setVerificationResult(requestAssets.some((asset) => !(asset.isReturned || asset.status === "Returned")) ? "Not Clear" : "Clear");
    setAssets(requestAssets.map((asset) => ({
      ...asset,
      isReturned: Boolean(asset.isReturned || asset.status === "Returned"),
    })));
    setIctChecklist({
      laptopReturned: false,
      desktopReturned: false,
      monitorReturned: false,
      otherEquipmentReturned: false,
      accountAccessChecked: false,
      noOutstandingObligation: false,
      ...(req.ictChecklist || {}),
    });
    setConfirmation(null);
    setReturnReason("");
    setIsModalOpen(true);
  };

  const updateAssetStatus = (index, status) => {
    const updated = assets.map((asset, assetIndex) => assetIndex === index
      ? { ...asset, status, isReturned: status === "Returned" }
      : asset);
    setAssets(updated);
    setVerificationResult(updated.every((asset) => asset.isReturned || asset.status === "Returned") ? "Clear" : "Not Clear");
  };

  useEffect(() => {
    const requestedId = searchParams.get('requestId');
    if (!requestedId || !requests.length || selectedRequest) return;

    const request = requests.find((item) => [item.clearanceId, item.requestId, item._id]
      .some((id) => String(id || '') === requestedId));
    if (request) handleOpenReviewModal(request);
  }, [requests, searchParams, selectedRequest]);

  const handleOpenEmployeeAssets = () => {
    if (!selectedRequest?.employee?.employeeId && !selectedRequest?.employeeId) return;
    const employeeId = selectedRequest.employee?.employeeId || selectedRequest.employeeId;
    navigate(`/ict-office/assets?employeeId=${encodeURIComponent(employeeId)}&requestId=${encodeURIComponent(selectedRequest.clearanceId || selectedRequest.requestId)}`);
  };

  const handleProcessSubmit = async (status, request = selectedRequest, comment = remarks, reason = returnReason) => {
    if (!request) return;
    if (status === "Returned" && (!reason.trim() || !comment.trim())) {
      alert("እባክዎን ጥያቄውን የሚመልሱበትን ምክንያት በ Remark ሳጥን ውስጥ ያስገቡ!");
      return;
    }

    try {
      setProcessing(true);
      await axios.put(
        `${API_URL}/${request._id}/process`,
        {
          status,
          remarks: comment,
          returnReason: status === "Returned" ? reason : "",
          assetsIssued: assets,
          ictChecklist,
        },
        getAuthConfig()
      );

      if (status === "Under Review") {
        const updatedRequest = { ...request, status: "Under Review" };
        setSelectedRequest(updatedRequest);
        setRequests((current) => current.map((item) => item._id === request._id ? updatedRequest : item));
        setIsReviewing(true);
      } else {
        setIsModalOpen(false);
      }
      fetchRequests();
    } catch (error) {
      alert(error.response?.data?.message || "ውሳኔውን ማስቀመጥ አልተቻለም");
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmAction = () => {
    if (confirmation === "Returned") {
      const reason = returnReason.trim() || remarks.trim();
      if (!reason) {
        alert("Please enter a comment explaining the outstanding ICT asset.");
        return;
      }
      handleProcessSubmit("Returned", selectedRequest, remarks || reason, reason);
      setConfirmation(null);
      return;
    }
    handleProcessSubmit(confirmation, selectedRequest);
    setConfirmation(null);
  };

  const tabs = [
    { id: "All", label: "All Requests", icon: Inbox },
    { id: "Pending", label: "Pending", icon: Clock },
    { id: "Under Review", label: "Under Review", icon: Search },
    { id: "Approved", label: "Approved", icon: CheckCircle2 },
    { id: "Returned", label: "Returned", icon: XCircle },
  ];

  const selectedStatus = normalizeStatus(selectedRequest?.status);
  const isPending = selectedStatus === "Pending";
  const isUnderReview = selectedStatus === "Under Review";
  const isReturned = selectedStatus === "Returned";
  const isCompleted = selectedStatus === "Approved" || selectedStatus === "Completed";
  const showReviewFields = isReviewing && (isUnderReview || isReturned);
  const outstandingEquipment = assets.filter((item) => !item.isReturned).length;
  const employee = selectedRequest?.employee || {};
  const progress = selectedRequest?.clearanceProgress || [];
  const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-GB') : "Not recorded";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ICT Clearance Requests</h1>
            <p className="text-sm text-gray-500">
              Bahir Dar University ICT Asset & Account Clearance Management
            </p>
          </div>
          <button
            onClick={fetchRequests}
            className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        {/* Tabs & Search Navigation */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by ID or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Requests Panel */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center p-8 text-sm text-gray-500">
              የክሊራንስ ጥያቄዎች እየጫኑ ነው...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] table-fixed border-collapse text-left text-xs text-gray-600">
                <thead className="border-b border-gray-200 bg-gray-50 uppercase font-semibold text-gray-700">
                  <tr>
                    <th className="p-4 text-left">Request No.</th>
                    <th className="p-4 text-left">Employee Name</th>
                    <th className="p-4 text-left">Employee ID</th>
                    <th className="p-4 text-left">Department</th>
                    <th className="p-4 text-left">Clearance Reason</th>
                    <th className="p-4 text-left">Request Date</th>
                    <th className="p-4 text-left">Status</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center">
                        <div className="text-base font-medium text-slate-600">No ICT clearance requests found</div>
                        <div className="mt-2 text-sm text-slate-400">New requests will appear here after submission.</div>
                      </td>
                    </tr>
                  ) : (
                    requests.map((req) => (
                      <tr key={req._id} className="transition hover:bg-gray-50">
                        <td className="p-4 font-bold text-blue-700">{req.clearanceId || req.requestId}</td>
                        <td className="p-4 font-medium text-gray-900">{req.employee?.fullName || req.employeeName || "Unknown Employee"}</td>
                        <td className="p-4">{req.employee?.employeeId || req.employeeId || "N/A"}</td>
                        <td className="p-4">{req.employee?.department || req.department || "N/A"}</td>
                        <td className="p-4">{req.clearanceReason || req.reason || "N/A"}</td>
                        <td className="p-4">{req.requestDate ? new Date(req.requestDate).toLocaleDateString() : new Date(req.createdAt || Date.now()).toLocaleDateString()}</td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              ["Approved", "Completed"].includes(normalizeStatus(req.status))
                                ? "bg-green-100 text-green-700"
                                : normalizeStatus(req.status) === "Returned"
                                ? "bg-red-100 text-red-700"
                                : normalizeStatus(req.status) === "Under Review"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {["Approved", "Completed"].includes(normalizeStatus(req.status)) && <CheckCircle2 size={12} />}
                            {normalizeStatus(req.status) === "Returned" && <XCircle size={12} />}
                            {normalizeStatus(req.status) === "Pending" && <Clock size={12} />}
                            {normalizeStatus(req.status) === "Under Review" && <Search size={12} />}
                            {getStatusLabel(req.status)}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleOpenReviewModal(req)}
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-700"
                          >
                            <Eye size={14} /> View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* REVIEW & PROCESS MODAL */}
      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-5">
          <div className="w-full max-w-6xl max-h-[94vh] overflow-y-auto rounded-xl border border-cyan-200 bg-white p-4 shadow-2xl sm:p-6">
            {/* Modal Header */}
            <div className="-mx-4 -mt-4 mb-5 flex items-center justify-between rounded-t-xl bg-gradient-to-r from-cyan-800 to-teal-700 px-5 py-4 text-white sm:-mx-6 sm:-mt-6">
              <div>
                <h3 className="text-lg font-bold">ICT Clearance Request Details</h3>
                <p className="text-xs text-cyan-50">View and manage employee clearance information, assets, accounts, and final decision.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${isCompleted ? "bg-green-100 text-green-700" : isReturned ? "bg-red-100 text-red-700" : isUnderReview ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                  {getStatusLabel(selectedRequest.status)}
                </span>
                <button type="button" onClick={() => setIsModalOpen(false)} aria-label="Close request details">
                <X size={20} className="text-white" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <section className="rounded-lg border border-sky-100 bg-sky-50/60 p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-sky-900"><User size={16} />1. Employee &amp; Clearance Summary</h4>
                <div className="grid gap-4 text-xs md:grid-cols-3">
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-b border-sky-100 pb-3 md:border-b-0 md:border-r md:pb-0">
                    <dt className="text-slate-500">Full Name</dt><dd className="font-semibold text-slate-900">{employee.fullName || selectedRequest.employeeName || "Not recorded"}</dd>
                    <dt className="text-slate-500">BDU ID</dt><dd className="font-semibold text-slate-900">{employee.employeeId || selectedRequest.employeeId || "Not recorded"}</dd>
                    <dt className="text-slate-500">Department</dt><dd className="font-semibold text-slate-900">{employee.department || selectedRequest.department || "Not recorded"}</dd>
                    <dt className="text-slate-500">Campus</dt><dd className="font-semibold text-slate-900">{employee.campus || "Not recorded"}</dd>
                    <dt className="text-slate-500">Office / Position</dt><dd className="font-semibold text-slate-900">{employee.position || "Not recorded"}</dd>
                    <dt className="text-slate-500">Phone Number</dt><dd className="font-semibold text-slate-900">{employee.phone || "Not recorded"}</dd>
                  </dl>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-b border-sky-100 pb-3 md:border-b-0 md:border-r md:pb-0">
                    <dt className="text-slate-500">Request ID</dt><dd className="font-semibold text-slate-900">{selectedRequest.clearanceId || selectedRequest.requestId || "Not recorded"}</dd>
                    <dt className="text-slate-500">Request Date</dt><dd className="font-semibold text-slate-900">{selectedRequest.requestDate ? new Date(selectedRequest.requestDate).toLocaleString() : "Not recorded"}</dd>
                    <dt className="text-slate-500">Clearance Reason</dt><dd className="font-semibold text-slate-900">{selectedRequest.clearanceReason || selectedRequest.clearanceType || "Not recorded"}</dd>
                    <dt className="text-slate-500">Current Stage</dt><dd className="font-semibold text-slate-900">ICT Review</dd>
                    <dt className="text-slate-500">Overall Status</dt><dd className="font-semibold text-slate-900">{selectedRequest.overallStatus || getStatusLabel(selectedRequest.status)}</dd>
                  </dl>
                  <div>
                    <p className="mb-2 font-bold text-slate-700">Clearance Progress</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(progress.length ? progress : [{ department: "ICT", status: selectedRequest.status }]).map((step, index) => {
                        const stepStatus = String(step.status || "").toLowerCase();
                        const done = ["approved", "completed", "clear", "returned"].includes(stepStatus);
                        const current = /ict/i.test(step.department || step.office || step.name || "") || stepStatus === "under review";
                        return (
                          <span key={`${step.department || step.office || step.name || "step"}-${index}`} className={`rounded-full px-2 py-1 text-[10px] font-semibold ${done ? "bg-emerald-100 text-emerald-700" : current ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                            {step.department || step.office || step.name || "Office"}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              {/* ICT verification */}
              <section className="rounded-lg border border-sky-100 bg-white p-3">
                <h4 className="mb-3 flex items-center gap-2 rounded-md bg-sky-50 px-3 py-2 text-sm font-bold text-sky-900">
                  <Laptop size={16} />2. Assigned ICT Physical Assets
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead className="border-y border-sky-100 bg-sky-50/70 text-slate-600">
                      <tr><th className="p-2">#</th><th className="p-2">Asset Name</th><th className="p-2">Asset Tag / ID</th><th className="p-2">Serial Number</th><th className="p-2">Category</th><th className="p-2">Current Status</th><th className="p-2">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                    {assets.length ? assets.map((item, index) => (
                      <tr key={`${item.assetId || item.assetTag || item.assetName}-${index}`}>
                        <td className="p-2">{index + 1}</td>
                        <td className="p-2 font-medium text-slate-800">{item.assetName || item.assetType || "ICT Asset"}</td>
                        <td className="p-2">{item.assetId || item.assetTag || "N/A"}</td>
                        <td className="p-2">{item.serialNumber || "N/A"}</td>
                        <td className="p-2">{item.assetType || "ICT Equipment"}</td>
                        <td className="p-2">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.isReturned || item.status === "Returned" ? "bg-emerald-100 text-emerald-700" : ["Damaged", "Lost"].includes(item.status) ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                            {item.isReturned || item.status === "Returned" ? "Returned" : item.status || "Assigned"}
                          </span>
                        </td>
                        <td className="p-2">
                          {showReviewFields && !(item.isReturned || item.status === "Returned") ? (
                            <div className="flex flex-wrap gap-1.5">
                              <button type="button" onClick={() => updateAssetStatus(index, "Returned")} className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1.5 text-[10px] font-semibold text-white hover:bg-emerald-700">
                                <Check size={12} />Confirm Return
                              </button>
                              <button type="button" onClick={() => updateAssetStatus(index, "Damaged")} className="inline-flex items-center gap-1 rounded bg-rose-600 px-2 py-1.5 text-[10px] font-semibold text-white hover:bg-rose-700">
                                <AlertTriangle size={12} />Report Damaged
                              </button>
                              <button type="button" onClick={() => updateAssetStatus(index, "Lost")} className="inline-flex items-center gap-1 rounded bg-rose-700 px-2 py-1.5 text-[10px] font-semibold text-white hover:bg-rose-800">
                                Report Lost
                              </button>
                            </div>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={7} className="p-4 text-center text-slate-500">No assigned ICT assets found for this employee.</td></tr>
                    )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
                  <p><span className="text-slate-500">Total Assets:</span> <strong>{assets.length}</strong></p>
                  <p><span className="text-slate-500">Outstanding Assets:</span> <strong className={outstandingEquipment ? "text-rose-600" : "text-emerald-700"}>{outstandingEquipment}</strong></p>
                </div>
              </section>

              <section className="rounded-lg border border-sky-100 bg-white p-3">
                <h4 className="mb-3 flex items-center gap-2 rounded-md bg-sky-50 px-3 py-2 text-sm font-bold text-sky-900">3. Officer Remarks &amp; Final Action</h4>
                {isPending && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs">
                  <span className="font-semibold text-amber-800">Status: Pending — click Start Review to begin verification.</span>
                </div>}
                {showReviewFields && <div className="space-y-4 text-xs">
                  <div>
                    <p className="mb-2 font-bold text-gray-700">Verification Result</p>
                    <select
                      value={verificationResult}
                      onChange={(event) => setVerificationResult(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-semibold text-gray-800 focus:border-blue-500 focus:outline-none sm:w-1/2"
                    >
                      <option value="Clear">Clear</option>
                      <option value="Not Clear">Not Clear</option>
                    </select>
                  </div>
                  <div><label className="mb-1 block font-bold text-gray-700">Officer Remarks / Notes <span className="text-rose-600">*</span></label><textarea rows="3" maxLength={500} value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder={verificationResult === "Clear" ? "All assigned ICT assets have been returned." : "Explain any outstanding ICT equipment."} className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none" /><p className="mt-1 text-right text-[10px] text-slate-400">{remarks.length}/500</p></div>
                </div>}

              {isCompleted && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-800">
                  <p className="font-bold">Status: ✓ Approved</p>
                  <p>Reviewed By: {selectedRequest.processedBy?.officerName || "ICT Officer"}</p>
                  <p>Reviewed Date: {formatDate(selectedRequest.processedBy?.processedAt)}</p>
                  {selectedRequest.remarks && <p>Comment: {selectedRequest.remarks}</p>}
                </div>
              )}

              {isReturned && !showReviewFields && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  <p className="font-bold">Status: ↩ Returned</p>
                  <p>Returned By: {selectedRequest.processedBy?.officerName || "ICT Officer"}</p>
                  <p>Returned Date: {formatDate(selectedRequest.processedBy?.processedAt)}</p>
                  <p>Return Reason: {selectedRequest.returnReason || selectedRequest.remarks || "Not recorded"}</p>
                  <p>Remark: {selectedRequest.remarks || "Not recorded"}</p>
                </div>
              )}

              {!isCompleted && !isReturned && !showReviewFields && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  ICT Clearance Status: <span className="font-bold">{getStatusLabel(selectedRequest.status)}</span>
                </div>
              )}
              </section>

              {confirmation && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs">
                  {confirmation === "Returned" ? (
                    <>
                      <p className="font-bold text-gray-900">Return Reason</p>
                      <textarea
                        rows="3"
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        placeholder="Enter the outstanding ICT obligation."
                        className="mt-2 w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none"
                      />
                      <p className="mt-3 font-bold text-gray-900">Remark</p>
                      <textarea
                        rows="3"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Explain what the employee must correct."
                        className="mt-2 w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none"
                      />
                    </>
                  ) : <p className="font-bold text-gray-900">Approve ICT Clearance?</p>}
                  <div className="mt-3 flex justify-end gap-2">
                    <button onClick={() => setConfirmation(null)} className="rounded-lg border px-3 py-2 font-semibold text-gray-600 hover:bg-white">Cancel</button>
                    <button disabled={processing} onClick={handleConfirmAction} className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700">
                      {confirmation === "Returned" ? "Confirm Return" : "Confirm Approval"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex justify-end gap-3 border-t pt-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              {isPending && <>
                <button type="button" onClick={handleOpenEmployeeAssets} className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                  <Boxes size={14} /> View Employee Assets
                </button>
                <button type="button" disabled={processing} onClick={() => handleProcessSubmit("Under Review")} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                  <Play size={14} /> {processing ? "Starting Review..." : "Start Review"}
                </button>
              </>}
              {showReviewFields && <>
                <button type="button" onClick={handleOpenEmployeeAssets} className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                  <Boxes size={14} /> Employee Assets
                </button>
                {verificationResult === "Not Clear" && <button type="button" disabled={processing} onClick={() => setConfirmation("Returned")} className="flex items-center gap-1 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                  <XCircle size={14} /> Return Request
                </button>}
                {verificationResult === "Clear" && <button type="button" disabled={processing || outstandingEquipment > 0 || !remarks.trim()} onClick={() => setConfirmation("Approved")} className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                  <CheckCircle2 size={14} /> Approve Clearance
                </button>}
              </>}
              {isCompleted || (isReturned && !showReviewFields) ? <button onClick={() => setIsModalOpen(false)} className="rounded-lg bg-gray-800 px-4 py-2 text-xs font-semibold text-white">Back</button> : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IctClearanceRequestsPage;