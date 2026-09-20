import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ListCheck,
  Eye,
  PlayCircle,
  CheckCircle2,
  RotateCcw,
  X,
  AlertTriangle,
  User,
  Package,
  FileText,
  Loader2,
  CheckSquare,
  Boxes
} from 'lucide-react';

export default function PropertyClearanceRequests() {
  const { status } = useParams();
  const navigate = useNavigate();
  const normalizeStatus = (routeStatus) => {
    if (!routeStatus || routeStatus === 'all') return 'All';
    const normalized = routeStatus.toLowerCase().replace(/[^a-z\s]/g, ' ').trim();
    if (normalized === 'under review' || normalized === 'under-review' || normalized === 'in progress') return 'Under Review';
    if (normalized === 'pending') return 'Pending';
    if (normalized === 'approved') return 'Approved';
    if (normalized === 'returned') return 'Returned';
    return 'All';
  };

  const [filter, setFilter] = useState(() => normalizeStatus(status));
  const [loading, setLoading] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Return Action State
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [officerComment, setOfficerComment] = useState('');

  // Real data only; no seeded display rows.
  const [requests, setRequests] = useState([]);

  const normalizeRequestStatus = (statusValue) => {
    const value = (statusValue || '').toString().trim();
    const normalized = value.toLowerCase();

    if (['approved', 'completed', 'clear', 'done'].includes(normalized)) {
      return 'Approved';
    }

    if (['in progress', 'under review', 'review'].includes(normalized)) {
      return 'Under Review';
    }

    if (['pending', 'not started'].includes(normalized)) {
      return 'Pending';
    }

    if (['returned', 'rejected', 'not clear', 'return requested'].includes(normalized)) {
      return 'Returned';
    }

    return value || 'Pending';
  };

  const getPropertyStatus = (item) => {
    const savedPropertyStatus = String(item?.propertyStatus || '').trim().toLowerCase();
    if (['approved', 'completed', 'cleared', 'clear'].includes(savedPropertyStatus)) return 'Approved';
    if (['rejected', 'returned', 'not clear'].includes(savedPropertyStatus)) return 'Returned';
    if (['under review', 'in progress', 'review'].includes(savedPropertyStatus)) return 'Under Review';

    const propertyStep = Array.isArray(item?.workflow)
      ? item.workflow.find((step) => String(step.office || '').toLowerCase().includes('property'))
      : null;
    const workflowStatus = String(propertyStep?.status || '').trim().toLowerCase();
    if (['completed', 'approved', 'cleared', 'clear'].includes(workflowStatus)) return 'Approved';
    if (['rejected', 'returned', 'not clear'].includes(workflowStatus)) return 'Returned';
    if (['in progress', 'under review', 'review'].includes(workflowStatus)) return 'Under Review';
    // The overall clearance status must not mark the Property stage approved.
    return normalizeRequestStatus(item?.propertyStatus || 'Pending');
  };

  const formatRequestDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:3000/api/property/clearance-requests/requests', {
        headers: { Authorization: `Bearer ${token || ''}` }
      });

      const source = Array.isArray(res?.data)
          ? res.data
        : Array.isArray(res?.data?.requests)
          ? res.data.requests
          : [];

      const mapped = source.map((item) => ({
        requestId: item.requestId || item._id || 'CLR-UNKNOWN',
        employeeId: item.employeeId || item.employee?.employeeId || 'N/A',
        employeeName: item.employeeName || item.employee?.name || 'Unknown Employee',
        department: item.department || item.employee?.department || 'N/A',
        campus: item.campus || item.employee?.campus || 'N/A',
        position: item.position || item.role || 'N/A',
        clearanceReason: item.reason || item.clearanceType || item.clearanceReason || 'N/A',
        date: formatRequestDate(item.requestDate || item.submittedDate || item.createdAt),
        status: getPropertyStatus(item),
        propertyStatus: getPropertyStatus(item),
        officerComment: item.officerComment || item.libraryComment || '',
        returnReason: item.propertyReturnReason || item.returnReason || item.libraryReturnReason || '',
        assets: Array.isArray(item.outstandingItems) ? item.outstandingItems.map((asset, index) => ({
          assetName: asset,
          assetId: `AST-${String(index + 1).padStart(5, '0')}`,
          status: 'Outstanding',
          condition: 'N/A'
        })) : []
      }));

      setRequests(mapped);
    } catch (err) {
      console.warn('Unable to load clearance requests from the employee clearance API.', err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setFilter(normalizeStatus(status));
  }, [status]);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const loadEmployeeAssets = async (request) => {
    if (!request?.employeeId || request.employeeId === 'N/A') return request?.assets || [];

    try {
      setLoadingAssets(true);
      const res = await axios.get(`http://localhost:3000/api/property/dashboard/assets?employeeId=${encodeURIComponent(request.employeeId)}`);
      return (res.data?.records || []).map((asset) => ({
        assetName: asset.assetName,
        assetId: asset.assetId,
        status: asset.status,
        condition: asset.condition
      }));
    } catch (err) {
      console.warn('Unable to load employee assets for this request.', err);
      return request.assets || [];
    } finally {
      setLoadingAssets(false);
    }
  };

  // Open Details Modal with the employee's current asset records.
  const handleView = async (req) => {
    let latestRequest = req;
    try {
      const response = await axios.get(`http://localhost:3000/api/property/clearance-requests/requests/${encodeURIComponent(req.requestId)}`);
      if (response.data) {
        latestRequest = {
          ...req,
          ...response.data,
          status: getPropertyStatus(response.data),
          propertyStatus: getPropertyStatus(response.data),
          date: formatRequestDate(response.data.requestDate || response.data.submittedDate || response.data.createdAt),
          clearanceReason: response.data.reason || response.data.clearanceType || response.data.clearanceReason || req.clearanceReason,
          officerComment: response.data.officerComment || '',
          returnReason: response.data.propertyReturnReason || response.data.returnReason || ''
        };
      }
    } catch (err) {
      console.warn('Unable to refresh the selected clearance request.', err);
    }
    setSelectedRequest(latestRequest);
    setOfficerComment(latestRequest.officerComment || '');
    setIsModalOpen(true);
    const assets = await loadEmployeeAssets(latestRequest);
    setSelectedRequest((current) => current?.requestId === latestRequest.requestId ? { ...current, assets } : current);
  };

  const handleOpenEmployeeAssets = (request = selectedRequest) => {
    if (!request || !request.employeeId || request.employeeId === 'N/A') return;
    navigate(`/property/asset-records?employeeId=${encodeURIComponent(request.employeeId)}&requestId=${encodeURIComponent(request.requestId)}`);
  };

  // Action 1: Start Review
  const handleStartReview = async () => {
    if (!selectedRequest) return;
    try {
      await axios.patch(`http://localhost:3000/api/property/clearance-requests/requests/${selectedRequest.requestId}/start-review`);
    } catch (err) {
      console.warn('API error, applying client-side status update');
    }
    const assets = await loadEmployeeAssets(selectedRequest);
    const updated = { ...selectedRequest, status: 'Under Review', propertyStatus: 'Under Review', assets };
    setSelectedRequest(updated);
    setRequests(requests.map(r => r.requestId === updated.requestId ? updated : r));
  };

  // Action 2: Approve Clearance
  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      const response = await axios.patch(`http://localhost:3000/api/property/clearance-requests/requests/${selectedRequest.requestId}/approve`, {
        officerComment
      });
      const savedRequest = response.data;
      if (savedRequest?.propertyStatus !== 'Approved') {
        throw new Error('The server did not confirm the property approval.');
      }
      const updated = {
        ...selectedRequest,
        ...savedRequest,
        status: 'Approved',
        propertyStatus: 'Approved',
        officerComment: officerComment || 'All assets verified and cleared.'
      };
      setSelectedRequest(updated);
      setRequests((current) => current.map((request) => request.requestId === updated.requestId ? updated : request));
      setIsModalOpen(false);
    } catch (err) {
      console.error('Property approval failed:', err);
      alert(err.response?.data?.message || 'Approval failed. The request is still Pending.');
    }
  };

  // Action 3: Return Request Confirm
  const handleConfirmReturn = async () => {
    if (!returnReason.trim()) return;
    try {
      await axios.patch(`http://localhost:3000/api/property/clearance-requests/requests/${selectedRequest.requestId}/return`, {
        returnReason,
        officerComment
      });
    } catch (err) {
      console.warn('API error, applying client-side status update');
    }
    const updated = { 
      ...selectedRequest, 
      status: 'Returned', 
      propertyStatus: 'Returned',
      returnReason, 
      officerComment: returnReason 
    };
    setSelectedRequest(updated);
    setRequests(requests.map(r => r.requestId === updated.requestId ? updated : r));
    setShowReturnModal(false);
    setIsModalOpen(false);
    setReturnReason('');
  };

  // Assets Calculation Helpers
  const getAssetCounts = (assets = []) => {
    const total = assets.length;
    const returned = assets.filter(a => a.status === 'Returned').length;
    const outstanding = assets.filter(a => a.status === 'Outstanding').length;
    return { total, returned, outstanding };
  };

  const filteredRequests = filter === 'All' 
    ? requests 
    : requests.filter(r => r.status === filter);

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-xs text-slate-700 space-y-6">
      
      {/* Page Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <ListCheck className="text-teal-600" size={18} />
            <span>Property Officer → Clearance Requests</span>
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Verify employee assets, examine outstanding equipment, and grant or return clearance.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          {['All', 'Pending', 'Under Review', 'Approved', 'Returned'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 font-semibold rounded-md transition-all ${
                filter === tab 
                  ? 'bg-white text-teal-800 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                <th className="p-3">Request ID</th>
                <th className="p-3">Employee</th>
                <th className="p-3">Department</th>
                <th className="p-3">Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-slate-400">
                    <Loader2 className="animate-spin inline mr-2" size={16} /> Loading requests...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-slate-400 font-medium">
                    No clearance requests found for category "{filter}".
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.requestId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-semibold text-teal-700">{req.requestId}</td>
                    <td className="p-3 font-medium text-slate-800">{req.employeeName}</td>
                    <td className="p-3 text-slate-600">{req.department}</td>
                    <td className="p-3 text-slate-500">{req.date || 'Aug 29'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                        req.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                        req.status === 'Under Review' ? 'bg-blue-100 text-blue-800' :
                        req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleView(req)}
                        className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded flex items-center space-x-1 ml-auto transition-colors"
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* -------------------- 🔍 CLEARANCE DETAILS MODAL -------------------- */}
      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 p-5">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="text-teal-600" size={18} />
                <h2 className="text-sm font-bold text-slate-900">
                  Clearance Request Details ({selectedRequest.requestId})
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            {/* Employee Information */}
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-800 flex items-center space-x-1.5 text-[11px] uppercase tracking-wider">
                <User size={13} className="text-slate-500" />
                <span>Employee Information</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Name:</span>
                  <span className="font-semibold text-slate-800">{selectedRequest.employeeName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Employee ID:</span>
                  <span className="font-medium text-slate-700">{selectedRequest.employeeId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Department:</span>
                  <span className="font-medium text-slate-700">{selectedRequest.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Position:</span>
                  <span className="font-medium text-slate-700">{selectedRequest.position || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Reason:</span>
                  <span className="font-medium text-slate-700">{selectedRequest.clearanceReason}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Clearance Information</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Reason:</span>
                  <span className="font-medium text-slate-700">{selectedRequest.clearanceReason}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Request Date:</span>
                  <span className="font-medium text-slate-700">{selectedRequest.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Status:</span>
                  <span className="font-semibold text-slate-700">{selectedRequest.status}</span>
                </div>
              </div>
            </div>

            {/* Asset Verification Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center space-x-1.5 text-[11px] uppercase tracking-wider">
                  <Package size={13} className="text-teal-600" />
                  <span>Property Verification & Asset Records</span>
                </h3>
                
                {/* Summary Badges */}
                {(() => {
                  const counts = getAssetCounts(selectedRequest.assets);
                  return (
                    <div className="flex space-x-2 text-[10px] font-bold">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">Assigned: {counts.total}</span>
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Returned: {counts.returned}</span>
                      <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded">Outstanding: {counts.outstanding}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Asset Table */}
              {loadingAssets && (
                <p className="text-[11px] text-slate-500 flex items-center gap-2">
                  <Loader2 className="animate-spin" size={13} /> Loading employee asset records...
                </p>
              )}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="p-2.5">Asset</th>
                      <th className="p-2.5">Asset ID</th>
                      <th className="p-2.5">Condition</th>
                      <th className="p-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedRequest.assets?.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-3 text-center text-slate-400">No assigned assets found for this employee.</td>
                      </tr>
                    ) : selectedRequest.assets?.map((ast, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-medium text-slate-800">{ast.assetName}</td>
                        <td className="p-2.5 font-mono text-slate-500">{ast.assetId}</td>
                        <td className="p-2.5 text-slate-600">{ast.condition || 'Good'}</td>
                        <td className="p-2.5 text-right">
                          <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                            ast.status === 'Returned' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {ast.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Officer Comments / Reason section */}
            {(selectedRequest.officerComment || selectedRequest.returnReason) && (
              <div className="space-y-2">
                {selectedRequest.officerComment && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <span className="font-bold text-slate-800 block text-[11px]">Officer Comment:</span>
                    <p className="text-slate-700">{selectedRequest.officerComment}</p>
                  </div>
                )}
                {selectedRequest.status === 'Returned' && selectedRequest.returnReason && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-1">
                    <span className="font-bold text-rose-900 block text-[11px]">Return Reason:</span>
                    <p className="text-rose-800">{selectedRequest.returnReason}</p>
                  </div>
                )}
              </div>
            )}

            {selectedRequest.status === 'Under Review' && (
              <div className="space-y-1">
                <label className="font-semibold text-slate-800 text-[11px] block">
                  Officer Comment
                </label>
                <textarea
                  rows="3"
                  value={officerComment}
                  onChange={(e) => setOfficerComment(e.target.value)}
                  placeholder="Describe the verification result or note the outstanding asset condition..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                ></textarea>
              </div>
            )}

            {/* Dynamic Action Buttons based on Workflow Status */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              
              {/* Status Badge */}
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400 font-semibold">Current State:</span>
                <span className="font-bold text-slate-800">{selectedRequest.status}</span>
              </div>

              {/* Contextual Actions */}
              <div className="flex items-center space-x-2">
                
                {/* Workflow Step 1: Pending -> Start Review */}
                {selectedRequest.status === 'Pending' && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenEmployeeAssets()}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center space-x-1 transition-colors"
                    >
                      <Boxes size={14} />
                      <span>View Employee Assets</span>
                    </button>
                    <button
                      onClick={handleStartReview}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center space-x-1 transition-colors"
                    >
                      <PlayCircle size={14} />
                      <span>Start Review</span>
                    </button>
                  </div>
                )}

                {/* Workflow Step 2: Under Review -> Approve / Return */}
                {selectedRequest.status === 'Under Review' && (
                  <>
                    {getAssetCounts(selectedRequest.assets).outstanding === 0 && (
                      <span className="text-emerald-700 font-semibold">No Outstanding Assets</span>
                    )}
                    <button
                      onClick={() => handleOpenEmployeeAssets()}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center space-x-1 transition-colors"
                    >
                      <Boxes size={14} />
                      <span>Employee Assets</span>
                    </button>
                    <button
                      onClick={() => setShowReturnModal(true)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-lg flex items-center space-x-1 transition-colors"
                    >
                      <RotateCcw size={14} />
                      <span>Return Request</span>
                    </button>

                    <button
                      onClick={handleApprove}
                      disabled={getAssetCounts(selectedRequest.assets).outstanding > 0}
                      className={`px-3 py-1.5 font-semibold rounded-lg flex items-center space-x-1 transition-colors ${
                        getAssetCounts(selectedRequest.assets).outstanding > 0
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                      title={getAssetCounts(selectedRequest.assets).outstanding > 0 ? "Cannot approve with outstanding assets" : ""}
                    >
                      <CheckCircle2 size={14} />
                      <span>Approve Clearance</span>
                    </button>
                  </>
                )}

                {/* Finished States */}
                {(selectedRequest.status === 'Approved' || selectedRequest.status === 'Returned') && (
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                  >
                    Close
                  </button>
                )}

              </div>
            </div>

          </div>
        </div>
      )}

      {/* -------------------- ⚠️ RETURN REASON MODAL -------------------- */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-rose-900 flex items-center space-x-1.5">
                <AlertTriangle size={16} className="text-rose-600" />
                <span>Return Clearance Request</span>
              </h3>
              <button onClick={() => setShowReturnModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={15} />
              </button>
            </div>

            <p className="text-slate-600 text-[11px]">
              Specify the reason for returning this request back to the employee. (e.g., Unreturned equipment).
            </p>

            {/* Mandatory Reason Textarea */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-800 text-[11px] block">
                Return Reason <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows="3"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Write reason (e.g., Employee has not returned Laptop AST-00125)..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none"
              ></textarea>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowReturnModal(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReturn}
                disabled={!returnReason.trim()}
                className={`px-3 py-1.5 font-semibold rounded-lg ${
                  !returnReason.trim()
                    ? 'bg-rose-300 text-white cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                Confirm Return
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}