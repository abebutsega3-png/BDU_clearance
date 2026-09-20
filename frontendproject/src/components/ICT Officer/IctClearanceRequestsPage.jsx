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
  FileText,
  Play,
  Mail,
  X,
  RefreshCw,
  Boxes,
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
  const [activeTab, setActiveTab] = useState(() => mapDefaultViewToTab(getICTOfficerSettings().clearancePreferences.defaultView));
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
  const [deactivation, setDeactivation] = useState({
    bduEmailDeactivated: false,
    portalAccessRevoked: false,
    wifiDomainAccessRevoked: false,
  });
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
    setDeactivation(
      req.accountDeactivation || {
        bduEmailDeactivated: false,
        portalAccessRevoked: false,
        wifiDomainAccessRevoked: false,
      }
    );
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
          accountDeactivation: deactivation,
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
  const accountReviewRecorded = Object.values(selectedRequest?.accountDeactivation || {}).some(Boolean);
  const outstandingEquipment = assets.filter((item) => !item.isReturned).length;
  const employee = selectedRequest?.employee || {};
  const requestDetails = selectedRequest?.employeeRequestDetails || {};
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Clearance Request Details</h3>
                <p className="text-xs text-gray-500">Request ID: {selectedRequest.clearanceId || selectedRequest.requestId}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${isCompleted ? "bg-green-100 text-green-700" : isReturned ? "bg-red-100 text-red-700" : isUnderReview ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                  {getStatusLabel(selectedRequest.status)}
                </span>
                <button onClick={() => setIsModalOpen(false)}>
                <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-6">
              {/* Employee information */}
              <div>
                <h4 className="mb-3 border-b pb-2 text-sm font-bold text-gray-800">EMPLOYEE INFORMATION</h4>
                <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <div><dt className="text-gray-500">Employee ID</dt><dd className="font-semibold text-gray-900">{employee.employeeId || selectedRequest.employeeId || "Not recorded"}</dd></div>
                  <div><dt className="text-gray-500">Full Name</dt><dd className="font-semibold text-gray-900">{employee.fullName || selectedRequest.employeeName || "Not recorded"}</dd></div>
                  <div><dt className="text-gray-500">Department</dt><dd className="font-semibold text-gray-900">{employee.department || selectedRequest.department || "Not recorded"}</dd></div>
                  <div><dt className="text-gray-500">Position</dt><dd className="font-semibold text-gray-900">{employee.position || selectedRequest.position || "Not recorded"}</dd></div>
                  <div><dt className="text-gray-500">Employment Type</dt><dd className="font-semibold text-gray-900">{employee.employmentType || selectedRequest.employmentType || "Not recorded"}</dd></div>
                </dl>
              </div>

              {/* Clearance information */}
              <div>
                <h4 className="mb-3 border-b pb-2 text-sm font-bold text-gray-800">CLEARANCE INFORMATION</h4>
                <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <div><dt className="text-gray-500">Request ID</dt><dd className="font-semibold text-gray-900">{selectedRequest.clearanceId || selectedRequest.requestId || "Not recorded"}</dd></div>
                  <div><dt className="text-gray-500">Submitted Date</dt><dd className="font-semibold text-gray-900">{selectedRequest.requestDate ? new Date(selectedRequest.requestDate).toLocaleDateString('en-GB') : "Not recorded"}</dd></div>
                  <div><dt className="text-gray-500">Current Status</dt><dd className="font-semibold text-gray-900">{getStatusLabel(selectedRequest.status)}</dd></div>
                </dl>
              </div>

              {/* ICT verification */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 border-b pb-2 text-sm font-bold text-gray-800">
                  <Laptop size={16} className="text-blue-600" /> ICT VERIFICATION
                </h4>
                <h5 className="mb-2 text-xs font-bold text-gray-700">Assigned ICT Assets</h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b text-gray-500"><tr><th className="p-2">Asset ID</th><th className="p-2">Asset</th><th className="p-2">Status</th></tr></thead>
                    <tbody className="divide-y">
                    {assets.map((item, index) => (
                      <tr key={index}><td className="p-2 font-semibold">{item.assetId || item.assetTag || "N/A"}</td><td className="p-2">{item.assetName || item.assetType || "ICT Asset"}</td><td className="p-2">
                        <label className={`flex items-center gap-2 font-medium ${showReviewFields ? "" : "pointer-events-none"}`}>
                          <input
                            type="checkbox"
                            checked={item.isReturned}
                            disabled={!showReviewFields}
                            onChange={(e) => {
                              const updated = [...assets];
                              updated[index].isReturned = e.target.checked;
                              setAssets(updated);
                              setVerificationResult(updated.some((asset) => !asset.isReturned) ? "Not Clear" : "Clear");
                            }}
                            className="h-4 w-4 rounded text-blue-600"
                          />
                          <span className={item.isReturned ? "text-green-700" : "text-red-700"}>{item.isReturned ? "Returned" : "Outstanding"}</span>
                        </label>
                      </td></tr>
                    ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <p><span className="text-gray-500">Outstanding Assets:</span> <strong>{outstandingEquipment}</strong></p>
                  <p><span className="text-gray-500">ICT Obligation:</span> <strong className={outstandingEquipment ? "text-red-700" : "text-green-700"}>{outstandingEquipment ? "Not Clear" : "Clear"}</strong></p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h4 className="mb-4 border-b pb-2 text-sm font-bold text-gray-800">Decision Form</h4>
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
                  <div><label className="mb-1 block font-bold text-gray-700">Comment</label><textarea rows="3" value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder={verificationResult === "Clear" ? "All assigned ICT assets have been returned." : "Employee has not returned the assigned ICT equipment."} className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none" /></div>
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
                {verificationResult === "Clear" && <button type="button" disabled={processing || outstandingEquipment > 0} onClick={() => setConfirmation("Approved")} className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">
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