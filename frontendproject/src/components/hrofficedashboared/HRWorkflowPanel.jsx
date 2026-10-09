import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, ClipboardList, LoaderCircle, RefreshCw, Search } from 'lucide-react';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000')
  .replace(/\/api\/clearance\/?$/, '')
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');
const API_ROOT = `${API_BASE_URL}/api`;
const CHECKLIST_LABELS = [
  ['empInfoVerified', 'Employee details verified'],
  ['clearanceRequestVerified', 'Clearance request verified'],
  ['documentVerified', 'Supporting documents reviewed'],
  ['employmentVerified', 'Employment information verified'],
  ['noDuplicateRequest', 'No duplicate active request'],
];

const authConfig = () => {
  const token = localStorage.getItem('token');
  return { headers: token ? { Authorization: `Bearer ${token}` } : {} };
};

const fetchHRQueue = async () => {
  const response = await axios.get(`${API_ROOT}/hr/queue`, {
    ...authConfig(),
    params: { status: 'Under Review', assessment: 'passed' },
  });
  if (!response.data?.success || !Array.isArray(response.data.data)) {
    throw new Error(response.data?.message || 'The HR review queue was not returned.');
  }
  return response.data.data;
};

const fetchClearanceOffices = async () => {
  const response = await axios.get(`${API_ROOT}/hr/offices`, authConfig());
  if (!response.data?.success || !Array.isArray(response.data.data)) {
    throw new Error(response.data?.message || 'The clearance office list was not returned.');
  }
  return response.data.data;
};

const getErrorMessage = (error) => error.response?.data?.message
  || error.message
  || 'Unable to complete the HR workflow action.';

const employeeName = (request) => request?.employeeRecord?.fullName
  || request?.employeeName
  || request?.employee?.fullName
  || 'Unknown employee';

const departmentName = (request) => {
  const department = request?.employeeRecord?.department || request?.department;
  return typeof department === 'string'
    ? department
    : department?.departmentName || department?.name || '—';
};

const dateLabel = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
};

export default function HRWorkflowPanel() {
  const [queue, setQueue] = useState([]);
  const [offices, setOffices] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [request, setRequest] = useState(null);
  const [selectedDepts, setSelectedDepts] = useState({});
  const [search, setSearch] = useState('');
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadQueue = useCallback(async () => {
    try {
      const [requests, clearanceOffices] = await Promise.all([
        fetchHRQueue(),
        fetchClearanceOffices(),
      ]);
      setOffices(clearanceOffices);
      setQueue(requests);
      setSelectedId((currentId) => (
        requests.some((item) => item._id === currentId) ? currentId : requests[0]?._id || ''
      ));
      if (!requests.length) {
        setRequest(null);
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([fetchHRQueue(), fetchClearanceOffices()])
      .then(([requests, clearanceOffices]) => {
        if (!active) return;
        setOffices(clearanceOffices);
        setQueue(requests);
        setSelectedId((currentId) => (
          requests.some((item) => item._id === currentId) ? currentId : requests[0]?._id || ''
        ));
        if (!requests.length) {
          setRequest(null);
        }
      })
      .catch((loadError) => {
        if (active) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoadingQueue(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedId) return undefined;

    let active = true;
    axios.get(`${API_ROOT}/hr/${encodeURIComponent(selectedId)}`, authConfig())
      .then((response) => {
        if (!active) return;
        const details = response.data?.success ? response.data.data : null;
        if (!details) throw new Error('The clearance request details were not returned.');
        setRequest(details);
        const previouslyAssigned = Array.isArray(details.assignedDepartments)
          ? details.assignedDepartments
          : [];
        setSelectedDepts(Object.fromEntries(previouslyAssigned.map((office) => [office, true])));
      })
      .catch((loadError) => {
        if (!active) return;
        setRequest(null);
        setError(getErrorMessage(loadError));
      });

    return () => { active = false; };
  }, [selectedId]);

  const activeRequest = selectedId && request?._id === selectedId ? request : null;
  const detailsLoading = Boolean(selectedId && !activeRequest && !error);
  const filteredQueue = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return queue;
    return queue.filter((item) => [
      item.requestId,
      item.employeeName,
      item.employeeId,
      typeof item.department === 'string' ? item.department : item.department?.name,
      item.clearanceType,
    ].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [queue, search]);

  const checklist = activeRequest?.assessmentChecklist || {};
  const checklistComplete = CHECKLIST_LABELS.every(([key]) => checklist[key] === true);
  const canApprove = Boolean(
    activeRequest
    && activeRequest.initialHRStatus === 'Under Review'
    && activeRequest.initialHRAssessmentCompleted === true
    && checklistComplete
    && activeRequest.employeeRecord
    && !activeRequest.hasActiveDuplicate,
  );

  const forwardRequest = async (event) => {
    event.preventDefault();
    if (!activeRequest?._id || !canApprove) {
      setError('Complete and pass HR Assessment before assigning offices and forwarding this request.');
      return;
    }

    const assignedDepartments = offices.filter((office) => selectedDepts[office]);

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await axios.patch(
        `${API_ROOT}/hr-final-clearance/initial-clearance/${encodeURIComponent(activeRequest._id)}/decision`,
        {
          decision: 'approved',
          remarks: activeRequest.hrComment || activeRequest.initialHRRemarks || '',
          assessmentChecklist: checklist,
          assignedDepartments,
        },
        authConfig(),
      );
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'The clearance request was not forwarded.');
      }
      setNotice(`${employeeName(activeRequest)}'s request was approved and sent to the Department Head.`);
      setRequest(null);
      setLoadingQueue(true);
      await loadQueue();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <ClipboardList className="text-blue-600" size={22} />
            HR Manual Workflow
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Select the clearance offices for an HR-assessed request, then forward it to the Department Head.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setLoadingQueue(true); setError(''); void loadQueue(); }}
          disabled={loadingQueue || saving}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          <RefreshCw size={15} className={loadingQueue ? 'animate-spin' : ''} />
          Refresh
        </button>
      </header>

      {error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.7fr)]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 p-4">
            <h2 className="font-semibold text-slate-800">Requests Under Review</h2>
            <label className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <Search size={15} className="text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search employee or request"
                className="min-w-0 flex-1 text-sm outline-none"
              />
            </label>
          </header>
          <div className="max-h-[65vh] overflow-y-auto">
            {loadingQueue ? (
              <p className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
                <LoaderCircle size={16} className="animate-spin" /> Loading HR requests…
              </p>
            ) : filteredQueue.length ? filteredQueue.map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => { setSelectedId(item._id); setNotice(''); setError(''); }}
                className={`block w-full border-b border-slate-100 p-4 text-left hover:bg-blue-50 ${selectedId === item._id ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : ''}`}
              >
                <span className="block text-sm font-semibold text-slate-800">{item.employeeName || 'Unknown employee'}</span>
                <span className="mt-1 block text-xs text-slate-500">{item.employeeId || 'No employee ID'} · {item.requestId || item._id}</span>
                <span className="mt-1 block text-xs text-slate-500">{item.clearanceType || 'Clearance'} · {dateLabel(item.createdAt)}</span>
              </button>
            )) : (
              <p className="p-8 text-center text-sm text-slate-500">
                {queue.length ? 'No requests match your search.' : 'There are no clearance requests under HR review.'}
              </p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          {detailsLoading ? (
            <p className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <LoaderCircle size={16} className="animate-spin" /> Loading request details…
            </p>
          ) : activeRequest ? (
            <form onSubmit={forwardRequest}>
              <header className="mb-5 border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900">{employeeName(activeRequest)}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {activeRequest.employeeId || '—'} · {departmentName(activeRequest)} · {activeRequest.requestId || activeRequest._id}
                </p>
              </header>

              <section className="mb-5">
                <h3 className="mb-2 text-sm font-semibold text-slate-800">HR Assessment</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CHECKLIST_LABELS.map(([key, label]) => {
                    const passed = checklist[key] === true;
                    return (
                      <div key={key} className={`flex items-center gap-2 rounded-lg p-3 text-xs ${passed ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                        <CheckCircle2 size={15} />
                        {label}: {passed ? 'Passed' : 'Not completed'}
                      </div>
                    );
                  })}
                </div>
              </section>

              <fieldset className="mb-5">
                <legend className="mb-2 text-sm font-semibold text-slate-800">Required clearance offices</legend>
                <p className="mb-3 text-xs text-slate-500">
                  Department Head review is mandatory. Select only the additional offices needed for this employee.
                </p>
                <div className="mb-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm font-medium text-blue-800">
                  Department Head <span className="text-xs">(Required)</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {offices.map((office) => (
                    <label key={office} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedDepts[office])}
                        onChange={() => setSelectedDepts((current) => ({ ...current, [office]: !current[office] }))}
                        className="h-4 w-4 accent-blue-600"
                      />
                      {office}
                    </label>
                  ))}
                </div>
                {!offices.length && (
                  <p role="alert" className="mt-2 text-xs text-rose-700">
                    No clearance offices are configured. Ask a System Admin to add active clearance-office roles.
                  </p>
                )}
                {!offices.some((office) => selectedDepts[office]) && (
                  <p className="mt-2 text-xs text-amber-700">
                    No additional offices selected. After Department Head approval, the request will return directly to Final HR.
                  </p>
                )}
              </fieldset>

              {activeRequest.hasActiveDuplicate && (
                <p className="mb-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">
                  Another active clearance request exists for this employee. Resolve it before forwarding.
                </p>
              )}
              {!activeRequest.employeeRecord && (
                <p className="mb-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">
                  No matching employee record was found. This request cannot be forwarded.
                </p>
              )}
              {!checklistComplete && (
                <p className="mb-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                  Complete every HR assessment checklist item in HR Assessment before forwarding.
                </p>
              )}
              {!activeRequest.initialHRAssessmentCompleted && (
                <p className="mb-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                  Complete HR Assessment before routing this request.
                </p>
              )}

              <button
                type="submit"
                disabled={saving || !canApprove}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Approving and forwarding…' : 'Approve & Forward to Department Head'}
              </button>
            </form>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <ClipboardList size={32} className="mb-3 text-slate-300" />
              <h2 className="font-semibold text-slate-700">Select a request</h2>
              <p className="mt-1 text-sm text-slate-500">Choose an HR request from the list to review its routing.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
