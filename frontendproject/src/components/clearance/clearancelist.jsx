import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, Filter, Plus, Search, X } from 'lucide-react';
import { fetchClearances } from '../../until/clearanceHelper';
import { fetchEmployees } from '../../until/EmployeeHelper';

const ClearanceRequests = () => {
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All Status');
  const [department, setDepartment] = useState('All Department');
  const [campus, setCampus] = useState('All Campus');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState('');
  const [remarks, setRemarks] = useState('');
  const [reviewDecision, setReviewDecision] = useState('');
  const [reviewStarted, setReviewStarted] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const routePrefix = pathname.startsWith('/hr-office') ? '/hr-office' : '/admin';

  useEffect(() => {
    Promise.allSettled([fetchClearances(), fetchEmployees()]).then(([clearanceResult, employeeResult]) => {
      if (clearanceResult.status === 'fulfilled') setRequests(Array.isArray(clearanceResult.value) ? clearanceResult.value : []);
      else setError('Unable to load clearance requests.');
      if (employeeResult.status === 'fulfilled') setEmployees(Array.isArray(employeeResult.value) ? employeeResult.value : []);
      setLoading(false);
    });
  }, []);

  const nameOf = (item) => item.employee?.fullName || item.employeeName || item.employee || 'Unknown employee';
  const departmentOf = (item) => item.department?.name || item.department || '-';
  const campusOf = (item) => item.campus || item.employee?.campus || '-';
  const statusOf = (item) => item.status || 'Pending';
  const departments = [...new Set(employees.map((item) => item.department).filter(Boolean))];
  const campuses = [...new Set(employees.map((item) => item.campus).filter(Boolean))];
  const filteredRequests = requests.filter((item) => {
    const query = search.toLowerCase();
    return (!query || `${nameOf(item)} ${item.employeeId || item.employee?.employeeId || ''}`.toLowerCase().includes(query))
      && (status === 'All Status' || statusOf(item) === status)
      && (department === 'All Department' || departmentOf(item) === department)
      && (campus === 'All Campus' || campusOf(item) === campus);
  });
  const statusStyle = { Pending: 'bg-amber-50 text-amber-700', 'In Progress': 'bg-blue-50 text-blue-700', Approved: 'bg-emerald-50 text-emerald-700', Completed: 'bg-emerald-50 text-emerald-700', Returned: 'bg-red-50 text-red-700', Rejected: 'bg-red-50 text-red-700' };

  const openRequest = async (request) => {
    const requestId = request.requestId || request._id;
    if (!requestId) return;
    setDecisionError('');
    setRemarks('');
    setReviewDecision('');
    setReviewStarted(request.initialHRStatus === 'Under Review');
    setShowReturnForm(false);
    setDetailLoading(true);
    try {
      const { data } = await axios.get(`http://localhost:3000/api/hr-final-clearance/clearance/${requestId}`);
      const loadedRequest = data?.clearance || request;
      setSelectedRequest(loadedRequest);
      setReviewStarted(loadedRequest.initialHRStatus === 'Under Review');
    } catch (requestError) {
      console.error('Unable to load clearance details:', requestError);
      setSelectedRequest(request);
    } finally {
      setDetailLoading(false);
    }
  };

  const startReview = async () => {
    const requestId = selectedRequest?.requestId || selectedRequest?._id;
    if (!requestId) return;
    try {
      setDecisionLoading(true);
      setDecisionError('');
      const { data } = await axios.patch(`http://localhost:3000/api/hr-final-clearance/initial-clearance/${requestId}/decision`, { decision: 'In Progress' }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      setSelectedRequest(data.clearance);
      setRequests((current) => current.map((request) => (request.requestId || request._id) === requestId ? { ...request, ...data.clearance } : request));
      setReviewStarted(true);
    } catch (requestError) {
      setDecisionError(requestError.response?.data?.message || 'Unable to start HR review.');
    } finally {
      setDecisionLoading(false);
    }
  };

  const saveDecision = async () => {
    const requestId = selectedRequest?.requestId || selectedRequest?._id;
    if (!requestId) return;
    if (!reviewDecision) {
      setDecisionError('Select Accept or Return before submitting the decision.');
      return;
    }
    if (reviewDecision === 'Returned' && !remarks.trim()) {
      setDecisionError('Return reason is required.');
      return;
    }

    try {
      setDecisionLoading(true);
      setDecisionError('');
      const { data } = await axios.patch(`http://localhost:3000/api/hr-final-clearance/initial-clearance/${requestId}/decision`, {
        decision: reviewDecision,
        remarks,
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
      setRequests((current) => current.map((request) => (
        (request.requestId || request._id) === requestId ? { ...request, ...data.clearance } : request
      )));
      setSelectedRequest(null);
      setShowReturnForm(false);
      setReviewDecision('');
    } catch (decisionRequestError) {
      setDecisionError(decisionRequestError.response?.data?.message || 'Unable to save the decision.');
    } finally {
      setDecisionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div><p className="text-xs text-slate-500">Dashboard <span className="px-1">/</span> Clearance Requests <span className="px-1">/</span> All Requests</p><h1 className="mt-2 text-xl font-bold text-[#10254b]">Clearance Requests</h1></div>
        <button type="button" onClick={() => navigate(`${routePrefix}/add-clearance`)} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"><Plus className="h-4 w-4" />Create Request</button>
      </div>
      <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-5">
          <label className="relative flex items-center"><Search className="absolute left-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search by employee name or ID..." className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-blue-500" /></label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 outline-none"><option>All Status</option><option>Pending</option><option>In Progress</option><option>Completed</option><option>Rejected</option></select>
          <select value={department} onChange={(event) => setDepartment(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 outline-none"><option>All Department</option>{departments.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={campus} onChange={(event) => setCampus(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 outline-none"><option>All Campus</option>{campuses.map((item) => <option key={item}>{item}</option>)}</select>
          <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"><Filter className="h-4 w-4" />Filter</button>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs"><thead className="border-y border-slate-100 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-3">#</th><th className="px-3 py-3">Employee</th><th className="px-3 py-3">Employee ID</th><th className="px-3 py-3">Department</th><th className="px-3 py-3">Campus</th><th className="px-3 py-3">Request Date</th><th className="px-3 py-3">Last Working Date</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan="9" className="py-10 text-center text-slate-400">Loading clearance requests...</td></tr> : error ? <tr><td colSpan="9" className="py-10 text-center text-red-500">{error}</td></tr> : filteredRequests.length === 0 ? <tr><td colSpan="9" className="py-10 text-center text-slate-400">No clearance requests found.</td></tr> : filteredRequests.map((item, index) => <tr key={item._id || item.requestId || index} className="text-slate-600 hover:bg-slate-50"><td className="px-3 py-3">{index + 1}</td><td className="px-3 py-3 font-semibold text-slate-800">{nameOf(item)}</td><td className="px-3 py-3">{item.employeeId || item.employee?.employeeId || '-'}</td><td className="px-3 py-3">{departmentOf(item)}</td><td className="px-3 py-3">{campusOf(item)}</td><td className="px-3 py-3">{item.requestDate || item.date || '-'}</td><td className="px-3 py-3">{item.lastWorkingDate || '-'}</td><td className="px-3 py-3"><span className={`rounded px-2 py-1 text-[10px] ${statusStyle[statusOf(item)] || 'bg-slate-100 text-slate-600'}`}>{statusOf(item)}</span></td><td className="px-3 py-3 text-right"><button type="button" onClick={() => openRequest(item)} className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100"><Eye className="h-3 w-3" />View</button></td></tr>)}</tbody></table></div>
      </section>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl" role="dialog" aria-modal="true">
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div><h2 className="text-base font-bold text-slate-900">Clearance Request Details</h2><p className="text-[11px] text-slate-500">Review employee clearance request</p></div>
              <button type="button" onClick={() => setSelectedRequest(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </header>
            {detailLoading ? <p className="p-10 text-center text-xs text-slate-500">Loading request details...</p> : (
              <div className="space-y-5 p-5">
                <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                  <Detail label="Employee Name" value={selectedRequest.employee?.fullName || nameOf(selectedRequest)} />
                  <Detail label="Employee ID" value={selectedRequest.employeeId || selectedRequest.employee?.employeeId || '-'} />
                  <Detail label="Department" value={departmentOf(selectedRequest)} />
                  <Detail label="Position" value={selectedRequest.employee?.position || selectedRequest.position || '-'} />
                  <Detail label="Email" value={selectedRequest.employee?.email || selectedRequest.email || '-'} />
                  <Detail label="Phone" value={selectedRequest.employee?.phone || selectedRequest.phone || '-'} />
                  <Detail label="Campus" value={campusOf(selectedRequest)} />
                  <Detail label="Request No" value={selectedRequest.requestId || selectedRequest._id || '-'} />
                  <Detail label="Clearance Type" value={selectedRequest.clearanceType || selectedRequest.clearanceReason || 'Resignation'} />
                  <Detail label="Reason" value={selectedRequest.reason || selectedRequest.clearanceReason || '-'} />
                  <Detail label="Request Date" value={selectedRequest.requestDate || selectedRequest.createdAt || '-'} />
                  <Detail label="Last Working Date" value={selectedRequest.lastWorkingDate || '-'} />
                  <Detail label="Current Status" value={statusOf(selectedRequest)} />
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <h3 className="mb-3 text-xs font-bold text-slate-800">Supporting Documents</h3>
                  {selectedRequest.supportingDocument || selectedRequest.documentUrl || selectedRequest.attachment ? (
                    <a
                      href={selectedRequest.supportingDocument || selectedRequest.documentUrl || selectedRequest.attachment}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-blue-700 underline"
                    >
                      View attached document
                    </a>
                  ) : <p className="text-xs text-slate-500">No supporting documents attached.</p>}
                </div>

                {routePrefix === '/hr-office' && !['Completed', 'Rejected', 'Returned'].includes(statusOf(selectedRequest)) && (
                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="text-sm font-bold text-slate-900">HR Initial Review</h3>
                    <p className="mt-1 text-xs text-slate-500">Review Status: {selectedRequest.initialHRStatus || 'Pending'}</p>
                    {!reviewStarted ? <button type="button" disabled={decisionLoading} onClick={startReview} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{decisionLoading ? 'Starting...' : 'Start Review'}</button> : <>
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold text-slate-700">Verification Result</p>
                        <label className="flex items-center gap-2 text-xs text-slate-700"><input type="radio" name="hr-review-decision" value="Approved" checked={reviewDecision === 'Approved'} onChange={(event) => setReviewDecision(event.target.value)} />Accept</label>
                        <label className="flex items-center gap-2 text-xs text-slate-700"><input type="radio" name="hr-review-decision" value="Returned" checked={reviewDecision === 'Returned'} onChange={(event) => setReviewDecision(event.target.value)} />Return</label>
                      </div>
                      <label className="mt-4 block text-xs font-semibold text-slate-700" htmlFor="hr-review-remarks">HR Comment / Remark</label>
                      <textarea id="hr-review-remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} rows="3" placeholder="Add HR review remarks..." className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-500" />
                      {reviewDecision === 'Returned' && <>
                        <label className="mt-3 block text-xs font-semibold text-slate-700" htmlFor="hr-return-reason">Return Reason <span className="text-red-600">*</span></label>
                        <textarea id="hr-return-reason" value={remarks} onChange={(event) => setRemarks(event.target.value)} rows="3" placeholder="Explain what the employee must correct..." className="mt-2 w-full rounded-lg border border-red-200 px-3 py-2 text-xs outline-none focus:border-red-500" />
                      </>}
                    </>}
                    {decisionError && <p className="mt-2 text-xs text-red-600">{decisionError}</p>}
                    {reviewStarted && <div className="mt-4 flex justify-end gap-2"><button type="button" disabled={decisionLoading} onClick={() => setSelectedRequest(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" disabled={decisionLoading} onClick={saveDecision} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{decisionLoading ? 'Submitting...' : 'Submit Decision'}</button></div>}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

function Detail({ label, value }) {
  return <div><p className="text-[10px] uppercase text-slate-400">{label}</p><p className="mt-1 text-xs font-semibold text-slate-800">{value}</p></div>;
}

export default ClearanceRequests;
