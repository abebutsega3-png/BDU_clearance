import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileText,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';

const apiRoot = 'http://localhost:3000/api';
const checklistItems = [
  { key: 'empInfoVerified', label: 'Employee record exists and details are verified', group: 'Employee Record', icon: UserRound },
  { key: 'clearanceRequestVerified', label: 'Request is complete and separation type is eligible', group: 'Request Eligibility', icon: ClipboardCheck },
  { key: 'documentVerified', label: 'Supporting documents have been reviewed', group: 'Document Requirements', icon: FileCheck2 },
  { key: 'employmentVerified', label: 'Employment details have been verified', group: 'Employment Review', icon: ShieldCheck },
  { key: 'noDuplicateRequest', label: 'No duplicate active clearance request exists', group: 'Duplicate Validation', icon: CheckCircle2 },
];

const emptyChecklist = () => Object.fromEntries(checklistItems.map(({ key }) => [key, false]));
const authConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
});

const fetchAssessmentQueue = async (status) => {
  const response = await axios.get(`${apiRoot}/hr/queue`, {
    ...authConfig(),
    params: { status, assessment: 'incomplete' },
  });
  return Array.isArray(response.data?.data) ? response.data.data : [];
};

const displayDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const getErrorMessage = (error) => error.response?.data?.message
  || error.response?.data?.error
  || error.message
  || 'Something went wrong. Please try again.';

const asText = (value) => {
  if (value && typeof value === 'object') {
    return value.fullName || value.name || value.departmentName || value.value || '—';
  }
  return String(value || '—');
};

const getEmployeeName = (request) => request?.employeeRecord?.fullName
  || request?.employeeName
  || request?.employee?.fullName
  || request?.employee?.name
  || 'Unknown employee';

const getDepartment = (request) => request?.employeeRecord?.department
  || request?.department
  || request?.employee?.department
  || '—';

const getSupportingDocuments = (request) => {
  const documents = request?.supportingDocuments || request?.documents || request?.attachments;
  if (Array.isArray(documents)) return documents;
  if (typeof documents === 'string' && documents.trim()) return [documents];
  return [];
};

const dateValidation = (request) => {
  const lastWorkingDate = new Date(`${String(request?.lastWorkingDate || '').slice(0, 10)}T00:00:00`);
  const requestDateValue = request?.requestDate || request?.createdAt;
  const requestDate = new Date(`${String(requestDateValue || '').slice(0, 10)}T00:00:00`);
  if (Number.isNaN(lastWorkingDate.getTime())) {
    return { valid: false, message: 'Last working date is missing or invalid.' };
  }
  if (!Number.isNaN(requestDate.getTime()) && lastWorkingDate < requestDate) {
    return { valid: false, message: 'Last working date cannot be earlier than the request date.' };
  }
  return { valid: true, message: 'Last working date is valid.' };
};

const isRequestComplete = (request) => Boolean(
  request?.employeeId
  && getEmployeeName(request) !== 'Unknown employee'
  && asText(getDepartment(request)) !== '—'
  && (request?.clearanceType || request?.reason)
  && request?.reason,
);

const StatusBadge = ({ status }) => {
  const styles = {
    'Under Review': 'bg-amber-100 text-amber-800',
    Pending: 'bg-blue-100 text-blue-800',
    Returned: 'bg-orange-100 text-orange-800',
    Approved: 'bg-emerald-100 text-emerald-800',
  };
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
      {status || 'Pending'}
    </span>
  );
};

const InfoCard = ({ title, icon: Icon, children }) => (
  <section className="rounded-lg border border-slate-200 bg-white p-3">
    <h3 className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-bold text-slate-700">
      <Icon size={15} className="text-blue-600" /> {title}
    </h3>
    <div className="space-y-2">{children}</div>
  </section>
);

const InfoRow = ({ label, value }) => (
  <div className="grid grid-cols-[minmax(90px,0.7fr)_minmax(0,1.3fr)] gap-2 text-[11px] leading-4">
    <span className="text-slate-500">{label}</span>
    <span className="break-words font-medium text-slate-800">{asText(value)}</span>
  </div>
);

export default function HRAssessmentPage() {
  const navigate = useNavigate();
  const { id: routeRequestId } = useParams();
  const [queue, setQueue] = useState([]);
  const [selectedId, setSelectedId] = useState(routeRequestId || '');
  const [request, setRequest] = useState(null);
  const [detailsLoadedId, setDetailsLoadedId] = useState('');
  const [checklist, setChecklist] = useState(emptyChecklist);
  const [decision, setDecision] = useState('approve');
  const [returnReason, setReturnReason] = useState('');
  const [comment, setComment] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Under Review');
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadQueue = useCallback(async (status = statusFilter) => {
    try {
      const rows = await fetchAssessmentQueue(status);
      setQueue(rows);
      setSelectedId((currentId) => (
        rows.some((row) => row._id === currentId) ? currentId : routeRequestId || rows[0]?._id || ''
      ));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
    setLoadingQueue(false);
  }, [routeRequestId, statusFilter]);

  useEffect(() => {
    let current = true;
    fetchAssessmentQueue(statusFilter)
      .then((rows) => {
        if (!current) return;
        setQueue(rows);
        setSelectedId((currentId) => (
          rows.some((row) => row._id === currentId) ? currentId : routeRequestId || rows[0]?._id || ''
        ));
      })
      .catch((loadError) => {
        if (current) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (current) setLoadingQueue(false);
      });
    return () => { current = false; };
  }, [routeRequestId, statusFilter]);

  useEffect(() => {
    if (!selectedId) return undefined;

    let current = true;
    axios.get(`${apiRoot}/hr/${selectedId}`, authConfig())
      .then((response) => {
        if (!current) return;
        const data = response.data?.data;
        setRequest(data);
        setDetailsLoadedId(selectedId);
        setChecklist({ ...emptyChecklist(), ...(data?.assessmentChecklist || {}) });
        setComment(data?.hrComment || data?.initialHRRemarks || '');
        setDecision('approve');
        setReturnReason('');
      })
      .catch((loadError) => {
        if (!current) return;
        setRequest(null);
        setDetailsLoadedId(selectedId);
        setError(getErrorMessage(loadError));
      });

    return () => { current = false; };
  }, [selectedId]);

  const loadingDetails = Boolean(selectedId) && detailsLoadedId !== selectedId;

  const filteredQueue = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return queue;
    return queue.filter((item) => [
      item.requestId,
      getEmployeeName(item),
      item.employeeId,
      asText(getDepartment(item)),
      item.clearanceType,
    ].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [queue, search]);

  const validation = useMemo(() => request ? dateValidation(request) : null, [request]);
  const requestComplete = isRequestComplete(request);
  const documents = useMemo(() => getSupportingDocuments(request), [request]);
  const allChecksPassed = checklistItems.every(({ key }) => checklist[key] === true);
  const canApprove = allChecksPassed
    && requestComplete
    && Boolean(request?.employeeRecord)
    && validation?.valid
    && !request?.hasActiveDuplicate;

  const saveDraft = async () => {
    if (!request) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await axios.put(`${apiRoot}/hr/${request._id}/draft`, {
        assessmentChecklist: checklist,
        hrComment: comment,
      }, authConfig());
      setRequest((current) => ({ ...current, ...response.data?.data }));
      setNotice('Assessment saved for later.');
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const submitDecision = async () => {
    if (!request) return;
    if (decision === 'return' && !returnReason) {
      setError('Choose a return reason before returning this request.');
      return;
    }
    if (decision === 'return' && !comment.trim()) {
      setError('Add an HR comment explaining what the employee needs to correct.');
      return;
    }
    if (decision === 'approve' && !canApprove) {
      setError('Resolve the failed validations and pass every assessment checklist item before approving.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (decision === 'approve') {
        await axios.put(`${apiRoot}/hr/${request._id}/complete`, {
          assessmentChecklist: checklist,
          hrComment: comment.trim(),
        }, authConfig());
        setNotice('Assessment passed. Choose required offices in HR Workflow before forwarding to the Department Head.');
        setRequest(null);
        await loadQueue();
        navigate('/hr-office/hr-workflow');
        return;
      }
      await axios.patch(
        `${apiRoot}/hr-final-clearance/initial-clearance/${request._id}/decision`,
        {
          decision: 'returned',
          reason: returnReason === 'Other' ? comment.trim() : returnReason,
          remarks: comment.trim(),
          affectedField: returnReason,
          assessmentChecklist: checklist,
        },
        authConfig(),
      );
      setNotice('Request returned to the employee for correction.');
      setRequest(null);
      await loadQueue();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  const startReview = async () => {
    if (!request) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await axios.patch(
        `${apiRoot}/hr-final-clearance/initial-clearance/${request._id}/decision`,
        { decision: 'in progress' },
        authConfig(),
      );
      const detailsResponse = await axios.get(`${apiRoot}/hr/${request._id}`, authConfig());
      setRequest(detailsResponse.data?.data || null);
      setNotice('Review started. You can now assess this request.');
      await loadQueue();
    } catch (startError) {
      setError(getErrorMessage(startError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[11px] text-slate-500">
            <span>HR Assessment</span><span>/</span><span className="font-medium text-blue-700">Request Queue</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">HR Assessment</h1>
          <p className="mt-1 text-xs text-slate-500">Review and assess employee clearance requests before sending them to departments.</p>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="flex items-center gap-2"><AlertCircle size={16} />{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button>
        </div>
      )}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <ClipboardCheck size={17} className="text-blue-600" /> HR Assessment Queue
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex min-w-0 items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-500 sm:w-64">
              <Search size={15} />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by employee name, ID, or request number..."
                className="min-w-0 flex-1 outline-none placeholder:text-slate-400"
                aria-label="Search assessment requests"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => {
                setError('');
                setLoadingQueue(true);
                setStatusFilter(event.target.value);
              }}
              aria-label="Filter assessment status"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
            >
              {['Under Review', 'Pending', 'Returned', 'Approved', 'All'].map((status) => <option key={status}>{status}</option>)}
            </select>
            <button
              type="button"
              onClick={() => {
                setError('');
                setLoadingQueue(true);
                loadQueue();
              }}
              disabled={loadingQueue}
              aria-label="Refresh assessment queue"
              title="Refresh"
              className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            ><RefreshCw size={15} className={loadingQueue ? 'animate-spin' : ''} /></button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left">
            <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">Request No.</th>
                <th className="px-3 py-2.5">Employee Name</th>
                <th className="px-3 py-2.5">Employee ID</th>
                <th className="px-3 py-2.5">Clearance Type</th>
                <th className="px-3 py-2.5">Request Date</th>
                <th className="px-3 py-2.5">Last Working Date</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {filteredQueue.map((item, index) => (
                <tr
                  key={item._id}
                  onClick={() => { setError(''); setSelectedId(item._id); }}
                  className={`cursor-pointer transition hover:bg-blue-50/50 ${selectedId === item._id ? 'bg-blue-50/70' : ''}`}
                >
                  <td className="px-3 py-2.5 text-slate-500">{index + 1}</td>
                  <td className="px-3 py-2.5 font-semibold text-blue-700">{item.requestId || item._id}</td>
                  <td className="px-3 py-2.5 font-medium text-slate-800">{getEmployeeName(item)}</td>
                  <td className="px-3 py-2.5 text-slate-600">{item.employeeId || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{item.clearanceType || item.reason || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{displayDate(item.requestDate || item.createdAt)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{displayDate(item.lastWorkingDate)}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={item.initialHRStatus || 'Pending'} /></td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); setError(''); setSelectedId(item._id); }}
                      className="rounded bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-blue-700"
                    >Assess</button>
                  </td>
                </tr>
              ))}
              {!loadingQueue && filteredQueue.length === 0 && (
                <tr><td colSpan="9" className="px-3 py-10 text-center text-sm text-slate-500">No requests found for this filter.</td></tr>
              )}
              {loadingQueue && (
                <tr><td colSpan="9" className="px-3 py-10 text-center text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2"><LoaderCircle size={16} className="animate-spin" /> Loading assessment queue...</span>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-500">
          Showing {filteredQueue.length} of {queue.length} requests
        </div>
      </section>

      {selectedId && (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(260px,0.82fr)]">
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <FileText size={16} className="text-blue-600" />
              <h2 className="text-sm font-bold text-slate-800">HR Assessment - Request Details</h2>
              <span className="text-[10px] text-slate-500">{request?.requestId || ''}</span>
              {request && <StatusBadge status={request.initialHRStatus || 'Pending'} />}
            </div>

            {loadingDetails ? (
              <div role="status" className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-14 text-sm text-slate-500">
                <LoaderCircle size={18} className="animate-spin" /> Loading request details...
              </div>
            ) : request ? (
              <>
                <div className="grid gap-3 lg:grid-cols-2">
                  <InfoCard title="Employee Information" icon={UserRound}>
                    <InfoRow label="Full Name" value={getEmployeeName(request)} />
                    <InfoRow label="Employee ID" value={request.employeeId} />
                    <InfoRow label="Department" value={getDepartment(request)} />
                    <InfoRow label="Position" value={request.employeeRecord?.position || request.position} />
                    <InfoRow label="Campus" value={request.employeeRecord?.campus || request.campus} />
                    <InfoRow label="Employment Type" value={request.employeeRecord?.employmentType || request.employmentType} />
                    <InfoRow label="Employment Status" value={request.employeeRecord?.status || 'Not available'} />
                  </InfoCard>
                  <InfoCard title="Request Information" icon={FileText}>
                    <InfoRow label="Clearance Type" value={request.clearanceType || request.reason} />
                    <InfoRow label="Reason" value={request.reason || request.remarks} />
                    <InfoRow label="Request Date" value={displayDate(request.requestDate || request.createdAt)} />
                    <InfoRow label="Last Working Date" value={displayDate(request.lastWorkingDate)} />
                    <InfoRow label="Supporting Documents" value={documents.length ? documents.map(asText).join(', ') : 'No document attached'} />
                    <InfoRow label="Current Status" value={request.initialHRStatus || 'Pending'} />
                  </InfoCard>
                </div>

                <InfoCard title="HR Assessment Checklist" icon={ClipboardCheck}>
                  <p className="text-[10px] text-slate-500">Verify each item. Any failed validation must be resolved or returned to the employee.</p>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {checklistItems.map(({ key, label, group, icon: Icon }) => (
                      <label key={key} className={`flex cursor-pointer items-start gap-2 rounded-md border p-2.5 transition ${checklist[key] ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-white hover:border-blue-200'}`}>
                        <input
                          type="checkbox"
                          checked={Boolean(checklist[key])}
                          onChange={(event) => setChecklist((current) => ({ ...current, [key]: event.target.checked }))}
                          className="mt-0.5 h-3.5 w-3.5 accent-emerald-600"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500"><Icon size={12} />{group}</span>
                          <span className="mt-1 block text-[10px] leading-4 text-slate-700">{label}</span>
                        </span>
                        {checklist[key]
                          ? <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                          : <Clock3 size={13} className="mt-0.5 shrink-0 text-slate-400" />}
                      </label>
                    ))}
                    <div className={`rounded-md border p-2.5 ${validation?.valid ? 'border-emerald-200 bg-emerald-50/70' : 'border-red-200 bg-red-50'}`}>
                      <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500"><CalendarDays size={12} />Date Validation</div>
                      <p className="mt-1 text-[10px] leading-4 text-slate-700">{validation?.message}</p>
                      {validation?.valid
                        ? <Check size={14} className="mt-1 text-emerald-600" />
                        : <XCircle size={14} className="mt-1 text-red-600" />}
                    </div>
                    <div className={`rounded-md border p-2.5 ${request.hasActiveDuplicate ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50/70'}`}>
                      <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500"><ShieldCheck size={12} />Duplicate Validation</div>
                      <p className="mt-1 text-[10px] leading-4 text-slate-700">
                        {request.hasActiveDuplicate ? 'Another active clearance request exists for this employee.' : 'No other active clearance request found.'}
                      </p>
                      {request.hasActiveDuplicate
                        ? <XCircle size={14} className="mt-1 text-red-600" />
                        : <Check size={14} className="mt-1 text-emerald-600" />}
                    </div>
                    <div className={`rounded-md border p-2.5 ${requestComplete && request.employeeRecord ? 'border-emerald-200 bg-emerald-50/70' : 'border-red-200 bg-red-50'}`}>
                      <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500"><FileText size={12} />Request Validation</div>
                      <p className="mt-1 text-[10px] leading-4 text-slate-700">
                        {!request.employeeRecord
                          ? 'Employee ID does not match an employee record.'
                          : requestComplete
                            ? 'Required employee and request information is complete.'
                            : 'Employee, department, separation type, reason, and last working date are required.'}
                      </p>
                      {requestComplete && request.employeeRecord
                        ? <Check size={14} className="mt-1 text-emerald-600" />
                        : <XCircle size={14} className="mt-1 text-red-600" />}
                    </div>
                  </div>
                  {!documents.length && (
                    <p className="mt-2 flex items-center gap-1 text-[10px] text-amber-700">
                      <AlertCircle size={13} /> No supporting documents are attached to this request.
                    </p>
                  )}
                </InfoCard>

                <label className="block rounded-lg border border-slate-200 bg-white p-3">
                  <span className="text-[10px] font-semibold text-slate-700">HR Comment</span>
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    maxLength={1000}
                    rows={3}
                    placeholder="Enter your assessment comment or notes..."
                    className="mt-2 w-full resize-y rounded-md border border-slate-200 px-3 py-2 text-[11px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="mt-1 block text-right text-[9px] text-slate-400">{comment.length}/1000</span>
                </label>
              </>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">Select a request to review.</div>
            )}
          </section>

          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-800">
              <ShieldCheck size={16} className="text-blue-600" /> Decision
            </h2>
            {request && !loadingDetails && (
              request.initialHRStatus === 'Pending' ? (
                <div>
                  <p className="mb-4 text-xs leading-5 text-slate-600">Start the Initial HR Review before submitting an assessment decision.</p>
                  <button type="button" onClick={startReview} disabled={saving} className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'Starting...' : 'Start HR Review'}
                  </button>
                </div>
              ) : request.initialHRAssessmentCompleted ? (
                <div className="rounded-md bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
                  HR Assessment has passed. Continue to HR Workflow to select required offices and forward the request.
                  <button type="button" onClick={() => navigate('/hr-office/hr-workflow')} className="mt-3 w-full rounded-md bg-emerald-700 px-3 py-2 font-semibold text-white hover:bg-emerald-800">
                    Continue to HR Workflow
                  </button>
                </div>
              ) : request.initialHRStatus !== 'Under Review' ? (
                <div className="rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                  This request has already been {String(request.initialHRStatus || '').toLowerCase()}. Select an Under Review request to submit a decision.
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <label className={`flex cursor-pointer items-start gap-2 rounded-md p-2 ${decision === 'return' ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <input type="radio" name="hr-decision" value="return" checked={decision === 'return'} onChange={() => setDecision('return')} className="mt-0.5 accent-blue-600" />
                      <span><span className="block text-xs font-semibold text-slate-800">Return to Employee</span><span className="mt-0.5 block text-[10px] text-slate-500">Send back for correction.</span></span>
                    </label>
                    <label className={`flex cursor-pointer items-start gap-2 rounded-md p-2 ${decision === 'approve' ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <input type="radio" name="hr-decision" value="approve" checked={decision === 'approve'} onChange={() => setDecision('approve')} className="mt-0.5 accent-blue-600" />
                      <span><span className="block text-xs font-semibold text-slate-800">Pass Assessment &amp; Continue to HR Workflow</span><span className="mt-0.5 block text-[10px] text-slate-500">Select required clearance offices in the next step before forwarding to the Department Head.</span></span>
                    </label>
                  </div>

                  {decision === 'return' && (
                    <div className="mt-3 space-y-3 rounded-md border border-blue-100 bg-blue-50/50 p-3">
                      <h3 className="text-[11px] font-bold text-slate-800">Return Request Details</h3>
                      <label className="block text-[10px] font-medium text-slate-700">
                        Return Reason <span className="text-red-500">*</span>
                        <select
                          value={returnReason}
                          onChange={(event) => setReturnReason(event.target.value)}
                          className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-[10px] outline-none focus:border-blue-500"
                        >
                          <option value="">Select a reason</option>
                          <option>Invalid Last Working Date</option>
                          <option>Missing Supporting Documents</option>
                          <option>Employee Information Incorrect</option>
                          <option>Request Information Incomplete</option>
                          <option>Other</option>
                        </select>
                      </label>
                      {returnReason === 'Other' && (
                        <label className="block text-[10px] font-medium text-slate-700">
                          Specify reason <span className="text-red-500">*</span>
                          <input
                            value={comment}
                            onChange={(event) => setComment(event.target.value)}
                            maxLength={1000}
                            className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-[10px] outline-none focus:border-blue-500"
                            placeholder="Describe what needs correction"
                          />
                        </label>
                      )}
                    </div>
                  )}

                  {decision === 'approve' && (!canApprove) && (
                    <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[10px] leading-4 text-amber-800">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      One or more checks failed. Resolve the validation issues or return the request with a reason.
                    </div>
                  )}

                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                    <button type="button" onClick={saveDraft} disabled={saving} className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                      Save for Later
                    </button>
                    <button
                      type="button"
                      onClick={submitDecision}
                      disabled={saving || (decision === 'approve' && !canApprove)}
                      className={`flex-1 rounded-md px-3 py-2 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${decision === 'return' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                      {saving ? 'Saving...' : decision === 'return' ? 'Return Request' : 'Pass Assessment'}
                    </button>
                  </div>
                  {saving && <p role="status" className="mt-2 flex items-center justify-center gap-1 text-[10px] text-slate-500"><LoaderCircle size={13} className="animate-spin" />Saving assessment...</p>}
                </>
              )
            )}
            {!request && !loadingDetails && <p className="text-xs text-slate-500">Select a request to see available decisions.</p>}
          </aside>
        </div>
      )}
    </div>
  );
}
