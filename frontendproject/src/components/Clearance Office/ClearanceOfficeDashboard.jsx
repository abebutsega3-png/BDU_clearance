import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, RefreshCw, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/authContext';

const authorization = () => ({
  headers: { Authorization: `******'token') || ''}` },
});

const requestName = (request) => request.employeeName || request.employee?.fullName || 'Unknown employee';

const ClearanceOfficeDashboard = () => {
  const { user } = useAuth();
  const [offices, setOffices] = useState([]);
  const [office, setOffice] = useState('');
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadOffices = useCallback(async () => {
    const response = await axios.get('/api/clearance-office/roles', authorization());
    if (!response.data?.success || !Array.isArray(response.data.offices)) {
      throw new Error(response.data?.message || 'Clearance-office roles were not returned.');
    }

    const availableOffices = response.data.offices;
    setOffices(availableOffices);
    const activeRole = String(user?.activeRole || localStorage.getItem('activeRole') || '').trim();
    const matchingOffice = availableOffices.find((item) => item.toLowerCase() === activeRole.toLowerCase());
    setOffice((current) => availableOffices.includes(current) ? current : matchingOffice || availableOffices[0] || '');
  }, [user?.activeRole]);

  const loadRequests = useCallback(async (selectedOffice = office) => {
    if (!selectedOffice) {
      setRequests([]);
      setSelectedId('');
      return;
    }
    const response = await axios.get('/api/clearance-office/requests', {
      ...authorization(),
      params: { office: selectedOffice },
    });
    if (!response.data?.success || !Array.isArray(response.data.requests)) {
      throw new Error(response.data?.message || 'Clearance-office requests were not returned.');
    }
    setRequests(response.data.requests);
    setSelectedId((current) => (
      response.data.requests.some((item) => item._id === current)
        ? current
        : response.data.requests[0]?._id || ''
    ));
  }, [office]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await loadOffices();
    } catch (loadError) {
      setError(loadError.response?.data?.message || loadError.message || 'Unable to load clearance-office roles.');
      setOffices([]);
      setRequests([]);
      setSelectedId('');
    } finally {
      setLoading(false);
    }
  }, [loadOffices]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    let active = true;
    if (!office) {
      setRequests([]);
      setSelectedId('');
      return undefined;
    }

    setLoading(true);
    setError('');
    axios.get('/api/clearance-office/requests', {
      ...authorization(),
      params: { office },
    }).then((response) => {
      if (!response.data?.success || !Array.isArray(response.data.requests)) {
        throw new Error(response.data?.message || 'Clearance-office requests were not returned.');
      }
      if (!active) return;
      setRequests(response.data.requests);
      setSelectedId((current) => (
        response.data.requests.some((item) => item._id === current)
          ? current
          : response.data.requests[0]?._id || ''
      ));
    }).catch((loadError) => {
      if (active) setError(loadError.response?.data?.message || loadError.message || 'Unable to load office requests.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [office]);

  const selectedRequest = useMemo(
    () => requests.find((request) => request._id === selectedId) || null,
    [requests, selectedId],
  );

  const review = async (decision) => {
    if (!selectedRequest?._id) return;
    if (decision === 'return' && !comment.trim()) {
      setError('Enter a return reason before returning this request.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await axios.patch(
        `/api/clearance-office/requests/${encodeURIComponent(selectedRequest.requestId || selectedRequest._id)}/decision`,
        { office, decision, comment: comment.trim() },
        authorization(),
      );
      if (!response.data?.success) throw new Error(response.data?.message || 'The review decision was not saved.');
      setNotice(response.data.message || 'Decision saved.');
      setComment('');
      await loadRequests(office);
    } catch (saveError) {
      setError(saveError.response?.data?.message || saveError.message || 'Unable to save this decision.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Clearance workflow</p>
          <h1 className="mt-1 text-2xl font-bold">Office Clearance Requests</h1>
          <p className="mt-1 text-sm text-slate-500">Review and complete requests assigned to your clearance office.</p>
        </div>
        <div className="flex items-center gap-2">
          {offices.length > 1 && (
            <select value={office} onChange={(event) => setOffice(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              {offices.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          )}
          <button type="button" onClick={() => { void loadRequests(); }} disabled={loading || saving} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </header>

      {error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
      {!loading && !offices.length && !error && (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Your account has no active clearance-office role. Ask a System Admin to assign you a role marked “Use as a clearance office”.
        </p>
      )}

      {offices.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.5fr)]">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <h2 className="border-b border-slate-100 p-4 font-semibold">{office || 'Office'} Queue</h2>
            <div className="max-h-[70vh] overflow-y-auto">
              {loading ? <p className="p-6 text-center text-sm text-slate-500">Loading assigned requests...</p>
                : requests.length ? requests.map((request) => (
                  <button key={request._id} type="button" onClick={() => { setSelectedId(request._id); setComment(''); setNotice(''); }} className={`block w-full border-b border-slate-100 p-4 text-left hover:bg-blue-50 ${selectedId === request._id ? 'bg-blue-50' : ''}`}>
                    <span className="block font-semibold">{requestName(request)}</span>
                    <span className="mt-1 block text-xs text-slate-500">{request.employeeId || 'No employee ID'} · {request.requestId || request._id}</span>
                    <span className="mt-1 block text-xs text-slate-500">{request.clearanceType || 'Clearance'} · {request.department?.name || request.department || '—'}</span>
                  </button>
                )) : <p className="p-6 text-center text-sm text-slate-500">No requests are waiting for this office.</p>}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            {selectedRequest ? (
              <>
                <h2 className="text-lg font-bold">{requestName(selectedRequest)}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedRequest.employeeId || '—'} · {selectedRequest.requestId || selectedRequest._id}</p>
                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div><dt className="text-xs font-semibold uppercase text-slate-500">Department</dt><dd className="mt-1 text-sm">{selectedRequest.department?.name || selectedRequest.department || '—'}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase text-slate-500">Clearance Type</dt><dd className="mt-1 text-sm">{selectedRequest.clearanceType || selectedRequest.reason || '—'}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase text-slate-500">Last Working Date</dt><dd className="mt-1 text-sm">{selectedRequest.lastWorkingDate || '—'}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase text-slate-500">Employee Reason</dt><dd className="mt-1 text-sm">{selectedRequest.reason || '—'}</dd></div>
                </dl>
                <label className="mt-5 block text-sm font-semibold">
                  Comment or return reason
                  <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={4} maxLength={1000} className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm font-normal outline-none focus:border-blue-500" placeholder="Add the review comment or explain what needs correction..." />
                </label>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => { void review('approve'); }} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 size={16} /> Approve</button>
                  <button type="button" onClick={() => { void review('return'); }} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"><RotateCcw size={16} /> Return</button>
                </div>
              </>
            ) : <p className="py-12 text-center text-sm text-slate-500">Select a request to review.</p>}
          </section>
        </div>
      )}
    </main>
  );
};

export default ClearanceOfficeDashboard;
