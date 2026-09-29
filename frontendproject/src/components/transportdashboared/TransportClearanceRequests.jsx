import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Bus,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  LoaderCircle,
  Search,
  X,
} from 'lucide-react';

const API_URL = 'http://localhost:3000/api/transport/requests';
const emptyRecordCheck = {
  hasAssignedVehicle: null,
  vehicleReturned: 'Pending',
  vehicleCondition: 'Pending',
  vehicleKeysReturned: 'Pending',
  vehicleDocumentsReturned: 'Pending',
  vehicleAccessoriesReturned: 'Pending',
  noOutstandingIssue: 'Pending',
  vehicleHandover: 'Pending',
  transportRecords: 'Pending',
  noUnreturnedTransportProperty: 'Pending',
  noOtherObligation: 'Pending',
};
const vehicleCheckFields = ['vehicleReturned', 'vehicleCondition', 'vehicleKeysReturned', 'vehicleDocumentsReturned', 'vehicleAccessoriesReturned'];
const allCheckFields = [...vehicleCheckFields, 'noOutstandingIssue', 'vehicleHandover', 'transportRecords', 'noUnreturnedTransportProperty', 'noOtherObligation'];

const authConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
});

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
};

const statusClass = (status) => {
  if (status === 'Approved') return 'bg-emerald-50 text-emerald-700';
  if (status === 'Returned') return 'bg-rose-50 text-rose-700';
  if (status === 'Under Review') return 'bg-sky-50 text-sky-700';
  return 'bg-amber-50 text-amber-800';
};

function InfoItem({ label, value }) {
  return (
    <div className="min-w-0 border-b border-slate-100 py-2.5">
      <dt className="text-[10px] font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-800">{value || 'N/A'}</dd>
    </div>
  );
}

function ChecklistStatusItem({ label, status, onChange, disabled }) {
  return (
    <label className="grid gap-2 rounded-md border border-slate-200 bg-white px-3 py-3 text-xs text-slate-700 sm:grid-cols-[minmax(0,1fr)_130px] sm:items-center">
      <span>{label}</span>
      <select value={status} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-teal-600 disabled:bg-slate-50">
        <option>Pending</option>
        <option>Cleared</option>
        <option>N/A</option>
      </select>
    </label>
  );
}

export default function TransportClearanceRequests() {
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [search, setSearch] = useState('');
  const [requests, setRequests] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [recordCheck, setRecordCheck] = useState(emptyRecordCheck);
  const [officerNotes, setOfficerNotes] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [returnError, setReturnError] = useState('');
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmApproval, setConfirmApproval] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const loadRequests = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(API_URL, {
          ...authConfig(),
          params: { status: statusFilter, search: search.trim() || undefined },
          signal: controller.signal,
        });
        setRequests(response.data.requests || []);
        setTotalCount(response.data.totalCount || 0);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.response?.data?.message || 'Unable to load Transport clearance requests.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadRequests();
    return () => controller.abort();
  }, [statusFilter, search, refreshKey]);

  const closeDetails = () => {
    if (actionLoading) return;
    setSelectedRequest(null);
    setChecklistOpen(false);
    setConfirmApproval(false);
    setActionError('');
    setDetailError('');
  };

  const openRequest = async (requestId) => {
    setSelectedRequest({ requestId });
    setChecklistOpen(false);
    setDetailLoading(true);
    setDetailError('');
    setActionError('');
    setReturnError('');
    setRecordCheck(emptyRecordCheck);
    setOfficerNotes('');
    setReturnReason('');
    setConfirmApproval(false);

    try {
      const response = await axios.get(`${API_URL}/${encodeURIComponent(requestId)}`, authConfig());
      const request = response.data.request;
      setSelectedRequest(request);
      const transportAssets = request.transportAssets || [];
      const savedReview = request.transportReview || {};
      const normalizeStatus = (value) => value === true ? 'Cleared' : value === false ? 'Pending' : ['Cleared', 'Pending', 'N/A'].includes(value) ? value : 'Pending';
      const hasAssignedVehicle = savedReview.hasAssignedVehicle ?? (transportAssets.length ? true : null);
      setRecordCheck({
        ...emptyRecordCheck,
        ...savedReview,
        hasAssignedVehicle,
        ...Object.fromEntries(allCheckFields.map((field) => [field, normalizeStatus(savedReview[field])])),
        ...(hasAssignedVehicle === false ? Object.fromEntries(vehicleCheckFields.map((field) => [field, 'N/A'])) : {}),
      });
      setOfficerNotes(request.transportReview?.officerNotes || request.officerComment || '');
      setReturnReason(request.returnReason || '');
    } catch (requestError) {
      setDetailError(requestError.response?.data?.message || 'Unable to load this clearance request.');
    } finally {
      setDetailLoading(false);
    }
  };

  const startReview = async () => {
    if (!selectedRequest?.requestId || selectedRequest.status !== 'Pending' || actionLoading) return;
    setActionLoading(true);
    setActionError('');
    try {
      const response = await axios.patch(`${API_URL}/${encodeURIComponent(selectedRequest.requestId)}/start-review`, {}, authConfig());
      const status = response.data.request?.status || 'Under Review';
      setSelectedRequest((current) => ({ ...current, status }));
      setRequests((current) => current.map((request) => request.requestId === selectedRequest.requestId ? { ...request, status } : request));
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'Unable to start Transport review.');
    } finally {
      setActionLoading(false);
    }
  };

  const canApprove = recordCheck.hasAssignedVehicle !== null
    && (!selectedRequest?.transportAssets?.length || recordCheck.hasAssignedVehicle === true)
    && allCheckFields.every((field) => recordCheck[field] !== 'Pending')
    && (recordCheck.hasAssignedVehicle
      ? vehicleCheckFields.filter((field) => field !== 'vehicleAccessoriesReturned').every((field) => recordCheck[field] === 'Cleared')
      : vehicleCheckFields.every((field) => recordCheck[field] === 'N/A'))
    && (recordCheck.noUnreturnedTransportProperty === 'Cleared' || recordCheck.noUnreturnedTransportProperty === 'N/A');
  const canDecide = selectedRequest?.status === 'Under Review';

  const updateCheck = (field, value) => {
    setRecordCheck((current) => {
      if (field !== 'hasAssignedVehicle') return { ...current, [field]: value };
      if (value === false) return { ...current, hasAssignedVehicle: false, ...Object.fromEntries(vehicleCheckFields.map((checkField) => [checkField, 'N/A'])) };
      if (value === true && current.hasAssignedVehicle === false) return { ...current, hasAssignedVehicle: true, ...Object.fromEntries(vehicleCheckFields.map((checkField) => [checkField, 'Pending'])) };
      return { ...current, hasAssignedVehicle: value };
    });
    setActionError('');
  };

  const finishDecision = async (decision) => {
    if (!selectedRequest?.requestId) return;
    setActionLoading(true);
    setActionError('');
    try {
      if (decision === 'approve') {
        await axios.patch(`${API_URL}/${encodeURIComponent(selectedRequest.requestId)}/approve`, {
          recordCheck,
          officerNotes: officerNotes.trim(),
        }, authConfig());
        setSuccessMessage(`Transport clearance approved for ${selectedRequest.requestId}.`);
      } else {
        if (!returnReason.trim()) {
          setReturnError('Enter a return reason before returning this request.');
          setActionLoading(false);
          return;
        }
        await axios.patch(`${API_URL}/${encodeURIComponent(selectedRequest.requestId)}/return`, {
          returnReason: returnReason.trim(),
          officerComment: officerNotes.trim(),
          recordCheck,
        }, authConfig());
        setSuccessMessage(`Request ${selectedRequest.requestId} returned to the employee.`);
      }
      setSelectedRequest(null);
      setConfirmApproval(false);
      setRefreshKey((key) => key + 1);
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'Unable to save the Transport clearance decision.');
      setConfirmApproval(false);
    } finally {
      setActionLoading(false);
    }
  };

  const transportInfo = selectedRequest?.transportInformation;
  const vehicleDescription = typeof transportInfo?.assignedVehicle === 'string'
    ? transportInfo.assignedVehicle
    : transportInfo?.assignedVehicle?.plateNumber || transportInfo?.assignedVehicle?.vehicleNumber || transportInfo?.assignedVehicle?.name;
  const readOnly = !canDecide;

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-teal-700">Transport Office</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">Transport Clearance Requests</h1>
          <p className="mt-1 text-xs text-slate-500">Review employee records, resolve outstanding issues, then approve or return requests.</p>
        </div>
        <div className="text-xs text-slate-500">{totalCount} request{totalCount === 1 ? '' : 's'}</div>
      </header>

      {successMessage && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
          <span className="flex items-center gap-2"><CheckCircle2 size={15} />{successMessage}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => setSuccessMessage('')}><X size={15} /></button>
        </div>
      )}

      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Request status">
          {['Pending', 'Approved', 'Returned', 'All'].map((status) => (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={statusFilter === status}
              onClick={() => setStatusFilter(status)}
              className={`shrink-0 rounded px-3 py-2 text-xs font-semibold transition ${statusFilter === status ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              {status}
            </button>
          ))}
        </div>
        <label className="relative block w-full sm:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee or request" className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-xs outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
        </label>
      </div>

      {error && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800">{error}</div>}

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Employee ID</th>
                <th className="px-4 py-3 font-semibold">Employee Name</th>
                <th className="px-4 py-3 font-semibold">Department</th>
                <th className="px-4 py-3 font-semibold">Request Date</th>
                <th className="px-4 py-3 font-semibold">Last Working Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="7" className="px-4 py-12 text-center text-slate-500"><LoaderCircle size={17} className="mr-2 inline animate-spin" />Loading requests...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-12 text-center text-slate-500">No {statusFilter.toLowerCase()} Transport clearance requests found.</td></tr>
              ) : requests.map((request) => (
                <tr key={request._id || request.requestId} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-600">{request.employeeId || 'N/A'}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{request.employeeName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{request.department}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(request.date)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(request.lastWorkingDate)}</td>
                  <td className="px-4 py-3"><span className={`whitespace-nowrap rounded px-2 py-1 text-[10px] font-semibold ${statusClass(request.status)}`}>{request.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => openRequest(request.requestId)} className="inline-flex items-center gap-1.5 rounded bg-teal-700 px-3 py-2 text-[10px] font-semibold text-white hover:bg-teal-800">
                      <Eye size={13} />{['Pending', 'Under Review'].includes(request.status) ? 'View / Review' : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetails(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="transport-review-title" className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-md bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-semibold uppercase text-teal-700">{selectedRequest.requestId}</p>
                <h2 id="transport-review-title" className="mt-1 text-lg font-bold text-slate-900">Transport Clearance Review</h2>
              </div>
              <button type="button" aria-label="Close request details" onClick={closeDetails} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"><X size={18} /></button>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6">
              {detailLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin" />Loading request details...</div>
              ) : detailError ? (
                <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{detailError}</p>
              ) : (
                <>
                  {detailError && <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{detailError}</p>}
                  {actionError && <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{actionError}</p>}

                  <section>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-bold text-slate-900">Employee Information</h3>
                      <span className={`rounded px-2.5 py-1 text-[10px] font-semibold ${statusClass(selectedRequest.status)}`}>{selectedRequest.status}</span>
                    </div>
                    <dl className="grid grid-cols-1 gap-x-5 sm:grid-cols-2 lg:grid-cols-3">
                      <InfoItem label="Employee Name" value={selectedRequest.employee?.fullName || selectedRequest.employeeName} />
                      <InfoItem label="Employee ID" value={selectedRequest.employee?.employeeId || selectedRequest.employeeId} />
                      <InfoItem label="Department" value={selectedRequest.employee?.department || selectedRequest.department} />
                      <InfoItem label="Position" value={selectedRequest.employee?.position || selectedRequest.position} />
                    </dl>
                  </section>

                  <section className="rounded-md border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-bold text-slate-900">Request Information</h3>
                    <dl className="mt-2 grid grid-cols-1 gap-x-5 sm:grid-cols-2">
                      <InfoItem label="Request Date" value={formatDate(selectedRequest.requestDate || selectedRequest.date)} />
                      <InfoItem label="Last Working Date" value={formatDate(selectedRequest.lastWorkingDate)} />
                      <InfoItem label="Reason" value={selectedRequest.reason || 'Not provided'} />
                    </dl>
                  </section>

                  <section className="rounded-md border border-cyan-100 bg-cyan-50/70 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><Bus size={16} className="text-cyan-800" />Transport Information</div>
                    <p className="mt-2 text-xs leading-5 text-slate-700">
                      {vehicleDescription || (selectedRequest.transportAssets?.length
                        ? 'Vehicle or transport property records are linked to this employee.'
                        : 'No vehicle entry was found in the Property/Asset registry. Verify assigned vehicles and obligations in Transport Office records.')}
                    </p>
                    {selectedRequest.transportAssets?.length > 0 && (
                      <ul className="mt-3 divide-y divide-cyan-100 rounded border border-cyan-100 bg-white">
                        {selectedRequest.transportAssets.map((asset) => (
                          <li key={asset.assetId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
                            <span className="font-medium text-slate-800">{asset.plateNumber || asset.vehicleNumber || asset.assetId} <span className="ml-1 text-slate-500">{asset.assetType || asset.category || asset.assetName}</span></span>
                            <span className="text-slate-600">{asset.status} · {asset.condition}{asset.assignedDate ? ` · Assigned ${formatDate(asset.assignedDate)}` : ''}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {selectedRequest.transportInformation?.outstandingIssue && (
                      <p className="mt-2 text-xs font-medium text-rose-700">Outstanding issue: {selectedRequest.transportInformation.outstandingIssue}</p>
                    )}
                    {selectedRequest.returnReason && selectedRequest.status === 'Returned' && (
                      <p className="mt-2 rounded border border-rose-200 bg-white px-3 py-2 text-xs text-rose-800"><strong>Previous return reason:</strong> {selectedRequest.returnReason}</p>
                    )}
                  </section>

                  {checklistOpen && <>
                  {selectedRequest.status === 'Pending' && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Start Review before changing checklist items or making a clearance decision.</p>}
                  <section>
                    <div className="mb-3 flex items-center gap-2">
                      <ClipboardCheck size={16} className="text-teal-700" />
                      <h3 className="text-sm font-bold text-slate-900">Transport Clearance Checklist</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="rounded-md border border-slate-200 p-3">
                        <p className="text-xs font-semibold text-slate-800">Assigned Vehicle</p>
                        <div className="mt-2 flex gap-4 text-xs text-slate-700">
                          {[['Yes', true], ['No', false]].map(([label, value]) => (
                            <label key={label} className="flex cursor-pointer items-center gap-2">
                              <input type="radio" name="hasAssignedVehicle" checked={recordCheck.hasAssignedVehicle === value} disabled={readOnly || (value === false && selectedRequest.transportAssets?.length > 0)} onChange={() => updateCheck('hasAssignedVehicle', value)} className="h-4 w-4 accent-teal-700" />
                              {label}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="mb-2 text-xs font-bold text-slate-800">Vehicle Condition and Equipment</h4>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <ChecklistStatusItem label="Vehicle Return Status" status={recordCheck.vehicleReturned} disabled={readOnly || recordCheck.hasAssignedVehicle !== true} onChange={(value) => updateCheck('vehicleReturned', value)} />
                          <ChecklistStatusItem label="Vehicle Condition" status={recordCheck.vehicleCondition} disabled={readOnly || recordCheck.hasAssignedVehicle !== true} onChange={(value) => updateCheck('vehicleCondition', value)} />
                          <ChecklistStatusItem label="Vehicle Keys Returned" status={recordCheck.vehicleKeysReturned} disabled={readOnly || recordCheck.hasAssignedVehicle !== true} onChange={(value) => updateCheck('vehicleKeysReturned', value)} />
                          <ChecklistStatusItem label="Vehicle Documents Returned" status={recordCheck.vehicleDocumentsReturned} disabled={readOnly || recordCheck.hasAssignedVehicle !== true} onChange={(value) => updateCheck('vehicleDocumentsReturned', value)} />
                          <ChecklistStatusItem label="Fuel Card / Vehicle Accessories" status={recordCheck.vehicleAccessoriesReturned} disabled={readOnly || recordCheck.hasAssignedVehicle !== true} onChange={(value) => updateCheck('vehicleAccessoriesReturned', value)} />
                        </div>
                        {recordCheck.hasAssignedVehicle === false && <p className="mt-2 text-[11px] text-slate-500">Vehicle-specific checks are marked N/A because no vehicle is assigned.</p>}
                      </div>
                      <div>
                        <h4 className="mb-2 text-xs font-bold text-slate-800">Transport Responsibilities</h4>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <ChecklistStatusItem label="Outstanding Vehicle-related Tasks" status={recordCheck.noOutstandingIssue} disabled={readOnly} onChange={(value) => updateCheck('noOutstandingIssue', value)} />
                          <ChecklistStatusItem label="Vehicle Handover" status={recordCheck.vehicleHandover} disabled={readOnly} onChange={(value) => updateCheck('vehicleHandover', value)} />
                          <ChecklistStatusItem label="Transport Records" status={recordCheck.transportRecords} disabled={readOnly} onChange={(value) => updateCheck('transportRecords', value)} />
                          <ChecklistStatusItem label="No Unreturned Transport Property" status={recordCheck.noUnreturnedTransportProperty} disabled={readOnly} onChange={(value) => updateCheck('noUnreturnedTransportProperty', value)} />
                          <ChecklistStatusItem label="Pending Transport Obligations" status={recordCheck.noOtherObligation} disabled={readOnly} onChange={(value) => updateCheck('noOtherObligation', value)} />
                        </div>
                      </div>
                    </div>
                  </section>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">Officer Notes</span>
                    <textarea value={officerNotes} onChange={(event) => setOfficerNotes(event.target.value)} disabled={readOnly} rows={2} maxLength={1000} className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-xs outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50" placeholder="Add a note about the transport record review" />
                  </label>

                  {canDecide && (
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-slate-700">Return Reason <span className="text-rose-600">(required to return)</span></span>
                      <textarea value={returnReason} onChange={(event) => { setReturnReason(event.target.value); setReturnError(''); }} rows={2} maxLength={1000} className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-xs outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" placeholder="For example: Assigned vehicle has not been returned." />
                      {returnError && <span className="mt-1 block text-[11px] text-rose-700">{returnError}</span>}
                    </label>
                  )}
                  {canDecide && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
                    <button type="button" onClick={() => finishDecision('return')} disabled={actionLoading || !returnReason.trim()} className="rounded-md border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50">{actionLoading ? 'Saving...' : 'Return to Employee'}</button>
                    <button type="button" onClick={() => setConfirmApproval(true)} disabled={actionLoading || !canApprove} title={!canApprove ? 'Complete the transport record checks before approval' : undefined} className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 size={14} />Approve / Clear</button>
                  </div>}
                  </>}
                </>
              )}
            </div>

            {!detailLoading && !detailError && (
              <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
                {selectedRequest.status === 'Pending' && <button type="button" onClick={startReview} disabled={actionLoading} className="rounded-md bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50">{actionLoading ? 'Starting...' : 'Start Review'}</button>}
                {(selectedRequest.employee?.employeeId || selectedRequest.employeeId) && <Link to={`/transport-office/assigned-vehicles?search=${encodeURIComponent(selectedRequest.employee?.employeeId || selectedRequest.employeeId)}&requestId=${encodeURIComponent(selectedRequest.requestId)}`} state={{ transportClearanceContext: { request: selectedRequest, recordCheck, officerNotes, returnReason } }} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-teal-600 hover:text-teal-700"><Bus size={14} />Assigned Vehicle Record</Link>}
                <button type="button" onClick={() => setChecklistOpen((open) => !open)} aria-expanded={checklistOpen} className="rounded-md border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100">{checklistOpen ? 'Close Checklist' : 'Open Checklist'}</button>
                <button type="button" onClick={closeDetails} disabled={actionLoading} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">Close</button>
              </footer>
            )}
          </section>
        </div>
      )}

      {confirmApproval && selectedRequest && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4">
          <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-transport-title" className="w-full max-w-md rounded-md bg-white p-5 shadow-2xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-700"><AlertTriangle size={19} /></div>
            <h2 id="confirm-transport-title" className="mt-3 text-base font-bold text-slate-900">Confirm Transport Clearance</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Are you sure you want to approve this Transport Clearance?</p>
            <div className="mt-5 flex flex-col-reverse justify-end gap-2 sm:flex-row">
              <button type="button" onClick={() => setConfirmApproval(false)} disabled={actionLoading} className="rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={() => finishDecision('approve')} disabled={actionLoading} className="rounded-md bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60">{actionLoading ? 'Approving...' : 'Confirm Approval'}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}