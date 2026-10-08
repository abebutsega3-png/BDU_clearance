import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { usePropertyLanguage } from './propertyLanguage';
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
  Boxes
} from 'lucide-react';
import UniversitySeal from '../UniversitySeal';

export default function PropertyClearanceRequests() {
  const { t } = usePropertyLanguage();
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
  const [assetLoadError, setAssetLoadError] = useState('');
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [requiredChecks, setRequiredChecks] = useState([]);
  const [completedChecks, setCompletedChecks] = useState([]);
  const [approvalRules, setApprovalRules] = useState({ requireNoOutstandingAssets: true, requireOfficerComment: false });
  const [updatingAssetId, setUpdatingAssetId] = useState('');
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
        assets: []
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

  useEffect(() => {
    let active = true;
    const loadPropertySettings = async () => {
      try {
        const response = await axios.get('/api/property/profile/me', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
        });
        const settings = response.data?.profile?.propertySettings || {};
        if (!active) return;
        setRequiredChecks(Array.isArray(settings.clearanceChecklist) ? settings.clearanceChecklist : []);
        setApprovalRules((current) => ({ ...current, ...(settings.clearanceRules || {}) }));
        setSettingsLoaded(true);
      } catch (error) {
        console.error('Unable to load property clearance rules:', error);
        if (active) {
          setSettingsError(error.response?.data?.message || 'Unable to load property clearance settings.');
          setSettingsLoaded(false);
        }
      }
    };
    loadPropertySettings();
    return () => { active = false; };
  }, []);

  const loadEmployeeAssets = async (request) => {
    if (!request?.employeeId || request.employeeId === 'N/A') {
      setAssetLoadError(t('This request does not include an employee ID, so asset records cannot be loaded.', 'ይህ ጥያቄ የሰራተኛ መለያ አልያዘም፤ ስለዚህ የንብረት መዝገቦች መጫን አይቻልም።'));
      return [];
    }

    try {
      setLoadingAssets(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:3000/api/property/dashboard/assets?employeeId=${encodeURIComponent(request.employeeId)}`, {
        headers: { Authorization: `Bearer ${token || ''}` }
      });
      return (res.data?.records || []).map((asset) => ({
        assetName: asset.assetName,
        assetId: asset.assetId,
        status: asset.status,
        condition: asset.condition,
        assetType: asset.assetType
      }));
    } catch (err) {
      console.warn('Unable to load employee assets for this request.', err);
      setAssetLoadError(t('Could not load the employee asset records. Check the connection and try opening the request again.', 'የሰራተኛውን የንብረት መዝገቦች መጫን አልተቻለም። ግንኙነቱን ያረጋግጡና ጥያቄውን እንደገና ለመክፈት ይሞክሩ።'));
      return [];
    } finally {
      setLoadingAssets(false);
    }
  };

  // Open Details Modal with the employee's current asset records.
  const handleView = async (req) => {
    let latestRequest = req;
    setAssetLoadError('');
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
    setCompletedChecks(Array.isArray(latestRequest.completedPropertyChecks) ? latestRequest.completedPropertyChecks : []);
    setIsModalOpen(true);
    const assets = await loadEmployeeAssets(latestRequest);
    setSelectedRequest((current) => current?.requestId === latestRequest.requestId ? { ...current, assets } : current);
  };

  const handleAssetAction = async (asset, status) => {
    if (!selectedRequest || !asset?.assetId || updatingAssetId) return;
    setUpdatingAssetId(asset.assetId);
    setAssetLoadError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `http://localhost:3000/api/property/clearance-requests/requests/${encodeURIComponent(selectedRequest.requestId)}/assets/${encodeURIComponent(asset.assetId)}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token || ''}` } }
      );
      const updatedAsset = response.data?.asset;
      if (!updatedAsset) throw new Error(t('The server did not return the updated asset record.', 'አገልጋዩ የተዘመነውን የንብረት መዝገብ አልመለሰም።'));
      const updateRequestAssets = (request) => request.requestId === selectedRequest.requestId
        ? { ...request, assets: request.assets.map((item) => item.assetId === updatedAsset.assetId ? { ...item, ...updatedAsset } : item) }
        : request;
      setSelectedRequest((current) => current ? updateRequestAssets(current) : current);
      setRequests((current) => current.map(updateRequestAssets));
    } catch (err) {
      console.error('Unable to update property asset status:', err);
      setAssetLoadError(err.response?.data?.message || err.message || t('Unable to update this asset. Please try again.', 'ይህን ንብረት ማዘመን አልተቻለም። እባክዎ እንደገና ይሞክሩ።'));
    } finally {
      setUpdatingAssetId('');
    }
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
        officerComment,
        completedChecks
      });
      const savedRequest = response.data;
      if (savedRequest?.propertyStatus !== 'Approved') {
        throw new Error(t('The server did not confirm the property approval.', 'አገልጋዩ የንብረት ማጽደቁን አላረጋገጠም።'));
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
      alert(err.response?.data?.message || t('Approval failed. The request is still Pending.', 'ማጽደቁ አልተሳካም። ጥያቄው አሁንም በመጠባበቅ ላይ ነው።'));
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
    const returned = assets.filter(a => String(a.status || '').toLowerCase() === 'returned').length;
    const outstanding = assets.filter(a => String(a.status || '').toLowerCase() !== 'returned').length;
    return { total, returned, outstanding };
  };

  const selectedAssetCounts = getAssetCounts(selectedRequest?.assets || []);
  const enabledRequiredChecks = requiredChecks.filter((check) => check.enabled);
  const missingRequiredChecks = enabledRequiredChecks.filter((check) => !completedChecks.includes(check.key));
  const approvalBlocked = !settingsLoaded
    || Boolean(settingsError)
    || loadingAssets
    || Boolean(assetLoadError)
    || (approvalRules.requireNoOutstandingAssets && selectedAssetCounts.outstanding > 0)
    || missingRequiredChecks.length > 0
    || (approvalRules.requireOfficerComment && !officerComment.trim());

  const filterLabels = {
    All: t('All', 'ሁሉም'),
    Pending: t('Pending', 'በመጠባበቅ ላይ'),
    'Under Review': t('Under Review', 'በግምገማ ላይ'),
    Approved: t('Approved', 'ጸድቋል'),
    Returned: t('Returned', 'ተመልሷል')
  };
  const localizedSettingsError = settingsError === 'Unable to load property clearance settings.'
    ? t(settingsError, 'የንብረት ማጽደቂያ ቅንብሮችን መጫን አልተቻለም።')
    : settingsError;
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
            <span>{t('Property Officer → Clearance Requests', 'የንብረት ኃላፊ → የማጽደቂያ ጥያቄዎች')}</span>
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {t('Verify employee assets, examine outstanding equipment, and grant or return clearance.', 'የሰራተኞችን ንብረቶች ያረጋግጡ፣ ያልተመለሱ መሳሪያዎችን ይመርምሩ፣ ማጽደቂያ ይስጡ ወይም ይመልሱ።')}
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
              {filterLabels[tab]}
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
                <th className="p-3">{t('Request ID', 'የጥያቄ መለያ')}</th>
                <th className="p-3">{t('Employee', 'ሰራተኛ')}</th>
                <th className="p-3">{t('Department', 'የስራ ክፍል')}</th>
                <th className="p-3">{t('Date', 'ቀን')}</th>
                <th className="p-3">{t('Status', 'ሁኔታ')}</th>
                <th className="p-3 text-right">{t('Action', 'ድርጊት')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-slate-400">
                    <Loader2 className="animate-spin inline mr-2" size={16} /> {t('Loading requests...', 'ጥያቄዎችን በመጫን ላይ...')}
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-slate-400 font-medium">
                    {t('No clearance requests found for category', 'ለዚህ ምድብ ምንም የማጽደቂያ ጥያቄ አልተገኘም')} "{filterLabels[filter] || filter}".
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
                        <span>{t('View', 'አሳይ')}</span>
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-3 backdrop-blur-sm sm:p-5">
          <div className="max-h-[94vh] w-full max-w-4xl space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
            
            {/* Modal Header */}
            <div className="sticky top-0 z-10 -mx-4 -mt-4 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:-mx-5 sm:-mt-5 sm:px-5">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="text-teal-600" size={18} />
                <h2 className="truncate text-sm font-bold text-slate-900">
                  {t('Clearance Request Details', 'የማጽደቂያ ጥያቄ ዝርዝሮች')} <span className="font-medium text-slate-500">{t('(Auto-populated from Asset Records)', '(ከንብረት መዝገቦች በራስ-ሰር የተሞላ)')}</span>
                </h2>
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-2">
                <UniversitySeal className="h-8 w-8" />
                <span className="text-xs font-bold text-blue-900">BDU</span>
                <button type="button" onClick={() => setIsModalOpen(false)} aria-label={t('Close clearance details', 'የማጽደቂያ ዝርዝሮችን ዝጋ')} className="ml-2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Employee Information */}
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-800">
                <User size={13} className="text-slate-500" />
                <span>{t('Employee Information', 'የሰራተኛ መረጃ')}</span>
              </h3>
              <div className="grid grid-cols-2 gap-3 text-[11px] sm:grid-cols-5">
                <div>
                  <span className="text-slate-400 block">{t('Name:', 'ስም፡')}</span>
                  <span className="font-semibold text-slate-800">{selectedRequest.employeeName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{t('Employee ID:', 'የሰራተኛ መለያ፡')}</span>
                  <span className="font-medium text-slate-700">{selectedRequest.employeeId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{t('Department:', 'የስራ ክፍል፡')}</span>
                  <span className="font-medium text-slate-700">{selectedRequest.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{t('Position:', 'የስራ መደብ፡')}</span>
                  <span className="font-medium text-slate-700">{selectedRequest.position || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{t('Reason:', 'ምክንያት፡')}</span>
                  <span className="font-medium text-slate-700">{selectedRequest.clearanceReason}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">{t('Clearance Information', 'የማጽደቂያ መረጃ')}</h3>
              <div className="grid grid-cols-2 gap-3 text-[11px] sm:grid-cols-3">
                <div>
                  <span className="text-slate-400 block">{t('Reason:', 'ምክንያት፡')}</span>
                  <span className="font-medium text-slate-700">{selectedRequest.clearanceReason}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{t('Request Date:', 'የጥያቄ ቀን፡')}</span>
                  <span className="font-medium text-slate-700">{selectedRequest.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{t('Status:', 'ሁኔታ፡')}</span>
                  <span className="font-semibold text-slate-700">{selectedRequest.status}</span>
                </div>
              </div>
            </div>

            {/* Asset Verification Section */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-800">
                  <Package size={13} className="text-teal-600" />
                  <span>{t('Property Verification & Asset Records', 'የንብረት ማረጋገጫ እና መዝገቦች')}</span>
                </h3>
                
                {/* Summary Badges */}
                {(() => {
                  const counts = getAssetCounts(selectedRequest.assets);
                  return (
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                      <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">{t('Assigned:', 'የተመደቡ፡')} {counts.total}</span>
                      <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-800">{t('Returned:', 'የተመለሱ፡')} {counts.returned}</span>
                      <span className="rounded bg-rose-100 px-2 py-1 text-rose-800">{t('Outstanding:', 'ያልተመለሱ፡')} {counts.outstanding}</span>
                    </div>
                  );
                })()}
              </div>
              <p className="rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-[10px] text-sky-800">
                {t('This verification list is automatically linked to the employee’s Asset Records. No manual asset search is required.', 'ይህ የማረጋገጫ ዝርዝር ከሰራተኛው የንብረት መዝገብ ጋር በራስ-ሰር ተያይዟል። ንብረትን በእጅ መፈለግ አያስፈልግም።')}
              </p>

              {/* Asset Table */}
              {loadingAssets && (
                <p className="text-[11px] text-slate-500 flex items-center gap-2">
                  <Loader2 className="animate-spin" size={13} /> {t('Loading employee asset records...', 'የሰራተኛ የንብረት መዝገቦችን በመጫን ላይ...')}
                </p>
              )}
              {assetLoadError && (
                <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
                  {assetLoadError}
                </p>
              )}
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/70 font-semibold text-slate-600">
                        <th className="p-2.5">{t('Asset', 'ንብረት')}</th>
                        <th className="p-2.5">{t('Asset ID', 'የንብረት መለያ')}</th>
                        <th className="p-2.5">{t('Condition', 'ሁኔታ')}</th>
                        <th className="p-2.5">{t('Current Status', 'አሁን ያለበት ሁኔታ')}</th>
                        <th className="p-2.5 text-right">{t('Action', 'ድርጊት')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {!loadingAssets && selectedRequest.assets?.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-3 text-center text-slate-400">{t('No assigned assets found for this employee.', 'ለዚህ ሰራተኛ የተመደበ ንብረት አልተገኘም።')}</td>
                        </tr>
                      ) : selectedRequest.assets?.map((ast) => (
                        <tr key={ast.assetId} className="hover:bg-slate-50">
                          <td className="p-2.5 font-medium text-slate-800">{ast.assetName}</td>
                          <td className="p-2.5 font-mono text-slate-500">{ast.assetId}</td>
                          <td className="p-2.5 text-slate-600">{ast.condition || 'N/A'}</td>
                          <td className="p-2.5">
                            <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                              String(ast.status || '').toLowerCase() === 'returned'
                                ? 'bg-emerald-100 text-emerald-800'
                                : String(ast.status || '').toLowerCase() === 'damaged'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                            }`}>
                              {ast.status || 'Outstanding'}
                            </span>
                          </td>
                          <td className="p-2.5 text-right">
                            <select
                              aria-label={`${t('Action for', 'ድርጊት ለ')} ${ast.assetName}`}
                              value={String(ast.status || '').toLowerCase() === 'returned'
                                ? 'Returned'
                                : String(ast.status || '').toLowerCase() === 'damaged'
                                  ? 'Damaged'
                                  : 'Outstanding'}
                              onChange={(event) => handleAssetAction(ast, event.target.value)}
                              disabled={selectedRequest.status !== 'Under Review' || Boolean(updatingAssetId)}
                              className="max-w-[190px] rounded border border-slate-300 bg-white px-2 py-1.5 text-[10px] text-slate-700 outline-none focus:border-teal-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                            >
                              <option value="Outstanding">{t('Pending', 'በመጠባበቅ ላይ')}</option>
                              <option value="Returned">{t('Mark as Returned', 'እንደተመለሰ ምልክት አድርግ')}</option>
                              <option value="Damaged">{t('Report as Damaged', 'እንደተበላሸ ሪፖርት አድርግ')}</option>
                            </select>
                            {updatingAssetId === ast.assetId && <Loader2 className="ml-1 inline animate-spin text-teal-600" size={12} />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Officer Comments / Reason section */}
            {(selectedRequest.officerComment || selectedRequest.returnReason) && (
              <div className="space-y-2">
                {selectedRequest.officerComment && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <span className="font-bold text-slate-800 block text-[11px]">{t('Officer Comment:', 'የኃላፊ አስተያየት፡')}</span>
                    <p className="text-slate-700">{selectedRequest.officerComment}</p>
                  </div>
                )}
                {selectedRequest.status === 'Returned' && selectedRequest.returnReason && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-1">
                    <span className="font-bold text-rose-900 block text-[11px]">{t('Return Reason:', 'የመመለሻ ምክንያት፡')}</span>
                    <p className="text-rose-800">{selectedRequest.returnReason}</p>
                  </div>
                )}
              </div>
            )}

            {selectedRequest.status === 'Under Review' && (
              <div className="space-y-3">
                <section className="rounded-lg border border-slate-200 bg-white p-3">
                  <h3 className="mb-2 text-[11px] font-bold text-slate-800">{t('Required Property Checks', 'አስፈላጊ የንብረት ማረጋገጫዎች')}</h3>
                  {settingsError ? (
                    <p role="alert" className="text-[10px] text-rose-700">{localizedSettingsError}</p>
                  ) : enabledRequiredChecks.length ? (
                    <div className="space-y-2">
                      {enabledRequiredChecks.map((check) => (
                        <label key={check.key} className="flex items-center gap-2 text-[10px] text-slate-700">
                          <input
                            type="checkbox"
                            checked={completedChecks.includes(check.key)}
                            onChange={(event) => setCompletedChecks((current) => event.target.checked
                              ? [...new Set([...current, check.key])]
                              : current.filter((key) => key !== check.key))}
                            className="h-3.5 w-3.5 accent-teal-600"
                          />
                          {check.label}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500">{t('No additional property checklist items are required.', 'ተጨማሪ የንብረት ማረጋገጫ ዝርዝሮች አያስፈልጉም።')}</p>
                  )}
                </section>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-800 text-[11px] block">
                    {t('Officer Comment', 'የኃላፊ አስተያየት')} {approvalRules.requireOfficerComment && <span className="text-rose-600">*</span>}
                  </label>
                  <textarea
                    rows="3"
                    value={officerComment}
                    onChange={(e) => setOfficerComment(e.target.value)}
                    placeholder={approvalRules.requireOfficerComment ? t('Required before approval...', 'ከማጽደቅ በፊት ያስፈልጋል...') : t('Describe the verification result or note the outstanding asset condition...', 'የማረጋገጫውን ውጤት ይግለጹ ወይም ያልተመለሰውን ንብረት ሁኔታ ይጻፉ...')}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Dynamic Action Buttons based on Workflow Status */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              
              {/* Status Badge */}
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400 font-semibold">{t('Current State:', 'አሁን ያለው ሁኔታ፡')}</span>
                <span className="font-bold text-slate-800">{selectedRequest.status}</span>
              </div>

              {/* Contextual Actions */}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-200"
                >
                  {t('Close', 'ዝጋ')}
                </button>
                
                {/* Workflow Step 1: Pending -> Start Review */}
                {selectedRequest.status === 'Pending' && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenEmployeeAssets()}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center space-x-1 transition-colors"
                    >
                      <Boxes size={14} />
                      <span>{t('View Employee Assets', 'የሰራተኛ ንብረቶችን አሳይ')}</span>
                    </button>
                    <button
                      onClick={handleStartReview}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center space-x-1 transition-colors"
                    >
                      <PlayCircle size={14} />
                      <span>{t('Start Review', 'ግምገማ ጀምር')}</span>
                    </button>
                  </div>
                )}

                {/* Workflow Step 2: Under Review -> Approve / Return */}
                {selectedRequest.status === 'Under Review' && (
                  <>
                    {getAssetCounts(selectedRequest.assets).outstanding === 0 && (
                      <span className="text-emerald-700 font-semibold">{t('No Outstanding Assets', 'ያልተመለሰ ንብረት የለም')}</span>
                    )}
                    <button
                      onClick={() => handleOpenEmployeeAssets()}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center space-x-1 transition-colors"
                    >
                      <Boxes size={14} />
                      <span>{t('Employee Assets', 'የሰራተኛ ንብረቶች')}</span>
                    </button>
                    <button
                      onClick={() => setShowReturnModal(true)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-lg flex items-center space-x-1 transition-colors"
                    >
                      <RotateCcw size={14} />
                      <span>{t('Return Clearance', 'ማጽደቂያውን መልስ')}</span>
                    </button>

                    <button
                      onClick={handleApprove}
                      disabled={approvalBlocked}
                      className={`px-3 py-1.5 font-semibold rounded-lg flex items-center space-x-1 transition-colors ${
                        approvalBlocked
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                      title={localizedSettingsError || (loadingAssets ? t('Waiting for asset records to load.', 'የንብረት መዝገቦች እስኪጫኑ በመጠባበቅ ላይ።') : assetLoadError || (approvalRules.requireNoOutstandingAssets && selectedAssetCounts.outstanding > 0 ? t('Disabled:', 'ተሰናክሏል፡') + ` ${selectedAssetCounts.outstanding} ` + t('outstanding asset(s) remain.', 'ያልተመለሱ ንብረቶች ቀርተዋል።') : missingRequiredChecks.length ? t('Complete all required property checks before approval.', 'ከማጽደቅ በፊት ሁሉንም አስፈላጊ የንብረት ማረጋገጫዎች ያጠናቅቁ።') : approvalRules.requireOfficerComment && !officerComment.trim() ? t('An officer comment is required before approval.', 'ከማጽደቅ በፊት የኃላፊ አስተያየት ያስፈልጋል።') : ''))}
                    >
                      <CheckCircle2 size={14} />
                      <span>{t('Approve Clearance', 'ማጽደቂያውን አጽድቅ')}</span>
                    </button>
                  </>
                )}

              </div>
            </div>
            {selectedRequest.status === 'Under Review' && approvalRules.requireNoOutstandingAssets && selectedAssetCounts.outstanding > 0 && (
              <p className="mt-2 text-right text-[10px] font-medium text-amber-700">
                {t('Disabled:', 'ተሰናክሏል፡')} {selectedAssetCounts.outstanding} {t('outstanding asset(s) remain.', 'ያልተመለሱ ንብረቶች ቀርተዋል።')}
              </p>
            )}
            {selectedRequest.status === 'Under Review' && missingRequiredChecks.length > 0 && (
              <p className="mt-2 text-right text-[10px] font-medium text-amber-700">
                {t('Complete', 'ያጠናቅቁ')} {missingRequiredChecks.length} {t('required property check(s) before approval.', 'አስፈላጊ የንብረት ማረጋገጫዎችን ከማጽደቅ በፊት።')}
              </p>
            )}
            {selectedRequest.status === 'Under Review' && approvalRules.requireOfficerComment && !officerComment.trim() && (
              <p className="mt-2 text-right text-[10px] font-medium text-amber-700">{t('An officer comment is required before approval.', 'ከማጽደቅ በፊት የኃላፊ አስተያየት ያስፈልጋል።')}</p>
            )}
            {selectedRequest.status === 'Under Review' && loadingAssets && (
              <p className="mt-2 text-right text-[10px] font-medium text-slate-500">{t('Waiting for asset records to load before approval.', 'ከማጽደቅ በፊት የንብረት መዝገቦች እስኪጫኑ በመጠባበቅ ላይ።')}</p>
            )}

          </div>
        </div>
      )}

      {/* -------------------- ⚠️ RETURN REASON MODAL -------------------- */}
      {showReturnModal && (
        <div className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-rose-900 flex items-center space-x-1.5">
                <AlertTriangle size={16} className="text-rose-600" />
                <span>{t('Return Clearance Request', 'የማጽደቂያ ጥያቄውን መልስ')}</span>
              </h3>
              <button onClick={() => setShowReturnModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={15} />
              </button>
            </div>

            <p className="text-slate-600 text-[11px]">
              {t('Explain why this request is being returned to the employee for follow-up.', 'ይህ ጥያቄ ለተጨማሪ እርምጃ ወደ ሰራተኛው ለምን እንደሚመለስ ያብራሩ።')}
            </p>

            {/* Mandatory Reason Textarea */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-800 text-[11px] block">
                {t('Return Reason', 'የመመለሻ ምክንያት')} <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows="3"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder={t('Write reason (e.g., Employee has not returned Laptop AST-00125)...', 'ምክንያቱን ይጻፉ (ለምሳሌ፦ ሰራተኛው AST-00125 ላፕቶፕን አልመለሰም)...')}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none"
              ></textarea>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowReturnModal(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                {t('Cancel', 'ሰርዝ')}
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
                {t('Confirm Return', 'መመለሱን አረጋግጥ')}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}