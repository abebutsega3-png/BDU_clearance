import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Boxes, CheckCircle2, CirclePlay, RotateCcw, WalletCards } from 'lucide-react';

const getAuthConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
});

const financeRequestsUrl = 'http://localhost:3000/api/finance/clearance-requests/requests';

const getFinanceRequest = async (requestId) => {
  const response = await axios.get(`${financeRequestsUrl}/${requestId}`, getAuthConfig());
  return response.data;
};

const getFinanceRequests = async (status = 'All', search = '') => {
  const response = await axios.get(financeRequestsUrl, {
    ...getAuthConfig(),
    params: { status, search },
  });
  return response.data;
};

const startFinanceReview = async (requestId) => {
  const response = await axios.patch(`${financeRequestsUrl}/${requestId}/start-review`, {}, getAuthConfig());
  return response.data;
};

const approveFinanceClearance = async (requestId, comment) => {
  const response = await axios.patch(`${financeRequestsUrl}/${requestId}/approve`, { comment }, getAuthConfig());
  return response.data;
};

const returnFinanceRequest = async (requestId, returnReason, comment) => {
  const response = await axios.patch(
    `${financeRequestsUrl}/${requestId}/return`,
    { returnReason, comment },
    getAuthConfig()
  );
  return response.data;
};

const normalizeFinanceStatus = (value) => {
  const status = String(value || 'Pending').trim().toLowerCase();
  if (status === 'approved' || status === 'completed' || status === 'cleared') return 'Approved';
  if (status === 'returned' || status === 'rejected' || status === 'return') return 'Returned';
  if (status === 'under review' || status === 'in progress') return 'Under Review';
  return 'Pending';
};

const FinanceClearanceDetails = ({ requestId, onBack, openReturnMode = false }) => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [verificationResult, setVerificationResult] = useState(openReturnMode ? 'Return' : 'Clear');
  const [comment, setComment] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState('');

  const fetchDetails = async () => {
    if (!requestId) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      const res = await getFinanceRequest(requestId);
      if (res.success) {
        setData(res.request);
      } else {
        setData(null);
        setErrorMessage(res.message || 'Failed to load request details.');
      }
    } catch (err) {
      setErrorMessage('Failed to load request details.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [requestId]);

  const handleStartReview = async () => {
    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await startFinanceReview(requestId);
      if (res.success) {
        setData((current) => ({
          ...current,
          ...res.request,
          financeStatus: 'Under Review',
        }));
      } else {
        setErrorMessage(res.message || 'Unable to start the review.');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Unable to start the review. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await approveFinanceClearance(requestId, comment.trim());
      if (res.success) {
        setSuccessMessage('Financial clearance approved successfully.');
        setData((current) => ({ ...current, ...res.request, financeStatus: 'Approved' }));
      } else {
        setErrorMessage(res.message || 'Unable to approve this clearance.');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Unable to approve this clearance. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!returnReason.trim()) {
      setErrorMessage('Return reason is required.');
      return;
    }
    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await returnFinanceRequest(requestId, returnReason.trim(), comment.trim());
      if (res.success) {
        setSuccessMessage('Request returned to employee successfully.');
        setComment('');
        setReturnReason('');
        setData((current) => ({ ...current, ...res.request, financeStatus: 'Returned' }));
      } else {
        setErrorMessage(res.message || 'Unable to return this clearance.');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Unable to return this clearance. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading Financial Clearance Details...</div>;
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-red-500">
        <div className="mb-4">Request Details Not Found.</div>
        {onBack && (
          <button onClick={onBack} className="text-sm font-medium text-slate-600 hover:underline">
            &larr; Back to List
          </button>
        )}
      </div>
    );
  }

  const { employee, financialRecords = [], totalOutstanding = 0 } = data;
  const amountByType = (types) => financialRecords
    .filter((record) => types.includes(String(record.type || '').toLowerCase()))
    .reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const outstandingLoan = amountByType(['loan']);
  const salaryAdvance = amountByType(['advance', 'salary advance']);

  return (
    <div className="mx-auto max-w-4xl space-y-4 text-xs text-slate-700">
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100" aria-label="Back to requests">&larr;</button>
          <div>
            <h2 className="text-base font-bold text-slate-900">Clearance Request Details</h2>
            <p className="text-[11px] text-slate-500">Request ID: {data.requestId || data._id}</p>
          </div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-bold ${normalizeFinanceStatus(data.financeStatus) === 'Approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : normalizeFinanceStatus(data.financeStatus) === 'Returned' ? 'border-red-200 bg-red-50 text-red-600' : normalizeFinanceStatus(data.financeStatus) === 'Under Review' ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-amber-200 bg-amber-50 text-amber-600'}`}>
          {normalizeFinanceStatus(data.financeStatus)}
        </span>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 text-red-700 text-sm border-b border-red-200">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <span className="flex items-center gap-2"><CheckCircle2 size={16} />{successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage('')} className="text-emerald-700 hover:text-emerald-900" aria-label="Dismiss notification">&times;</button>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 font-bold text-slate-900"><span className="text-base text-teal-700">♙</span><h3>Employee Information</h3></div>
            <div className="grid grid-cols-2 gap-y-2 text-[11px]">
              <span className="text-slate-400">Employee ID:</span><span className="font-semibold text-slate-800">{data.employeeId || '-'}</span>
              <span className="text-slate-400">Full Name:</span><span className="font-semibold text-slate-800">{employee?.fullName || data.employeeName || '-'}</span>
              <span className="text-slate-400">Department:</span><span className="font-semibold text-slate-800">{employee?.department || data.department || '-'}</span>
              <span className="text-slate-400">Position:</span><span className="font-semibold text-slate-800">{employee?.position || data.position || '-'}</span>
              <span className="text-slate-400">Campus:</span><span className="font-semibold text-slate-800">{employee?.campus || data.campus || '-'}</span>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 font-bold text-slate-900"><span className="text-base text-teal-700">▣</span><h3>Request Information</h3></div>
            <div className="grid grid-cols-2 gap-y-2 text-[11px]">
              <span className="text-slate-400">Request ID:</span><span className="font-semibold text-blue-600">{data.requestId || data._id}</span>
              <span className="text-slate-400">Reason:</span><span className="font-semibold text-slate-800">{data.reason || data.clearanceReason || data.clearanceType || '-'}</span>
              <span className="text-slate-400">Request Date:</span><span className="font-semibold text-slate-800">{data.requestDate || (data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-GB') : '-')}</span>
              <span className="text-slate-400">Current Status:</span><span className="font-semibold text-slate-800">{normalizeFinanceStatus(data.financeStatus)}</span>
            </div>
          </section>
        </div>

        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="flex items-center gap-2 font-bold uppercase tracking-wide text-slate-900"><WalletCards size={14} className="text-teal-700" />Financial Records</h3>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${Number(totalOutstanding || 0) > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {Number(totalOutstanding || 0) > 0 ? 'Outstanding balance' : 'Cleared'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Review the employee's financial obligations before approving the Finance clearance.</p>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-[11px]">
              <thead className="border-b border-slate-200 bg-slate-100/70 text-slate-600">
                <tr><th className="p-2.5">Record</th><th className="p-2.5">Type</th><th className="p-2.5">Amount</th><th className="p-2.5 text-right">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {financialRecords.length === 0 ? <tr><td colSpan="4" className="p-4 text-center text-slate-400">No financial records found for this employee.</td></tr> : financialRecords.map((record) => (
                  <tr key={record._id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-medium text-slate-800">{record.description || 'Financial obligation'}</td>
                    <td className="p-2.5 text-slate-600">{record.type || 'Other'}</td>
                    <td className="p-2.5 font-semibold text-slate-800">{Number(record.amount || 0).toLocaleString()} ETB</td>
                    <td className="p-2.5 text-right"><span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${record.status === 'Outstanding' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>{record.status || 'N/A'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
            <div><p className="text-[10px] font-semibold uppercase text-slate-400">Outstanding Loan</p><p className="mt-1 font-bold text-slate-800">{outstandingLoan.toLocaleString()} ETB</p></div>
            <div><p className="text-[10px] font-semibold uppercase text-slate-400">Salary Advance</p><p className="mt-1 font-bold text-slate-800">{salaryAdvance.toLocaleString()} ETB</p></div>
            <div><p className="text-[10px] font-semibold uppercase text-slate-400">Total Outstanding</p><p className={`mt-1 font-bold ${Number(totalOutstanding || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{Number(totalOutstanding || 0).toLocaleString()} ETB</p></div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {normalizeFinanceStatus(data.financeStatus) === 'Pending' && (
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <div><span className="text-slate-400 font-semibold">Current State:</span> <span className="font-bold text-slate-800">Pending</span></div>
              <button type="button" onClick={handleStartReview} disabled={actionLoading} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                <CirclePlay size={14} />{actionLoading ? 'Starting Review...' : 'Start Review'}
              </button>
            </div>
          )}

          {(normalizeFinanceStatus(data.financeStatus) === 'Under Review' || (normalizeFinanceStatus(data.financeStatus) === 'Pending' && verificationResult === 'Return')) && (
            <div className="space-y-5">
              {verificationResult === 'Return' && (
                <label className="block text-sm font-medium text-slate-700">Return Reason *
                  <input value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="Outstanding loan balance" className="mt-2 w-full rounded-lg border border-slate-300 p-3 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100" />
                </label>
              )}
              <label className="block text-sm font-medium text-slate-700">Officer Comment
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Enter verification comment..." className="mt-2 w-full rounded-lg border border-slate-300 p-3 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100" rows="3" />
              </label>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div><span className="text-slate-400 font-semibold">Current State:</span> <span className="font-bold text-blue-700">{normalizeFinanceStatus(data.financeStatus)}</span></div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/finance-office/records')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  <Boxes size={14} /> Finance Record Assets
                </button>
                {normalizeFinanceStatus(data.financeStatus) === 'Under Review' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setVerificationResult('Return')}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2.5 font-semibold text-rose-700 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      <RotateCcw size={14} /> Return Request
                    </button>
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />{actionLoading ? 'Signing...' : 'Approve Clearance'}
                    </button>
                  </>
                )}
                </div>
              </div>
              {verificationResult === 'Return' && (
                <div className="flex justify-end border-t border-slate-100 pt-3">
                  <button type="button" onClick={handleReturn} disabled={actionLoading} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
                    {actionLoading ? 'Returning...' : 'Confirm Return Request'}
                  </button>
                </div>
              )}
            </div>
          )}

          {normalizeFinanceStatus(data.financeStatus) === 'Approved' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <div className="flex flex-col gap-4 border-b border-emerald-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">Financial Clearance: CLEARED</p>
                  <p className="mt-1 text-sm font-normal">Approved after finance review.</p>
                </div>
                <span className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide">Approved</span>
              </div>
              <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                <div><p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Signed by</p><p className="mt-1 font-semibold">{data.financeReviewedBy || 'Finance Officer'}</p></div>
                <div><p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Approval date</p><p className="mt-1 font-semibold">{data.financeReviewedAt ? new Date(data.financeReviewedAt).toLocaleDateString('en-GB') : '-'}</p></div>
                <div><p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Remarks</p><p className="mt-1 font-normal">{data.financeRemarks || 'No outstanding financial obligation.'}</p></div>
              </div>
            </div>
          )}

          {normalizeFinanceStatus(data.financeStatus) === 'Returned' && (
            <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
              <p className="font-semibold">Clearance returned to employee</p>
              <p className="text-sm"><span className="font-medium">Reason:</span> {data.returnReason || 'No return reason provided.'}</p>
              {data.financeRemarks && <p className="text-sm"><span className="font-medium">Comment:</span> {data.financeRemarks}</p>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const FinanceClearanceRequestPage = () => {
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState(() => searchParams.get('requestId') || '');
  const [openReturnMode, setOpenReturnMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [approvingRequestId, setApprovingRequestId] = useState('');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const res = await getFinanceRequests('All', '');
      if (res.success) {
        setRequests(res.requests || []);
      } else {
        setErrorMessage(res.message || 'Unable to load finance requests.');
        setRequests([]);
      }
    } catch (err) {
      setErrorMessage('Unable to load finance requests.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleListApprove = async (request) => {
    if (approvingRequestId) return;
    setApprovingRequestId(request._id);
    setErrorMessage('');
    try {
      const res = await approveFinanceClearance(request._id, '');
      if (!res.success) {
        setErrorMessage(res.message || 'Unable to approve this clearance.');
        return;
      }
      setRequests((current) => current.map((item) => (
        item._id === request._id
          ? { ...item, ...res.request, financeStatus: 'Approved' }
          : item
      )));
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Unable to approve this clearance. Please try again.');
    } finally {
      setApprovingRequestId('');
    }
  };

  if (selectedRequestId) {
    return (
      <FinanceClearanceDetails
        requestId={selectedRequestId}
        openReturnMode={openReturnMode}
        onBack={() => {
          setSelectedRequestId('');
          setOpenReturnMode(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Financial Clearance Requests</h1>
          <p className="text-sm text-slate-500">Review employee finance clearance requests.</p>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Loading financial clearance requests...
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Request ID</th>
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                      No finance clearance requests found.
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request._id} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-medium text-slate-700">{request.requestId || request._id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{request.employee?.fullName || request.employeeName || 'N/A'}</div>
                        <div className="text-xs text-slate-500">{request.employeeId || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{request.employee?.department || request.department || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                          normalizeFinanceStatus(request.financeStatus) === 'Approved'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : normalizeFinanceStatus(request.financeStatus) === 'Returned'
                              ? 'border-red-200 bg-red-50 text-red-700'
                              : normalizeFinanceStatus(request.financeStatus) === 'Under Review'
                                ? 'border-blue-200 bg-blue-50 text-blue-700'
                                : 'border-amber-200 bg-amber-50 text-amber-700'
                        }`}>
                          {normalizeFinanceStatus(request.financeStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setOpenReturnMode(false);
                              setSelectedRequestId(request._id);
                            }}
                            className="rounded-md bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-slate-700"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceClearanceRequestPage;