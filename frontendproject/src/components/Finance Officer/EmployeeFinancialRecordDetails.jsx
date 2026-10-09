import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, CalendarDays, CheckCircle2, CircleDollarSign, FileText, Pencil, Printer, RotateCcw, WalletCards, X } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

const RECORDS_API_URL = 'http://localhost:3000/api/finance/dashboard/records';
const PAYMENTS_API_URL = `${RECORDS_API_URL}/payments`;
const CLEARANCE_REQUESTS_URL = 'http://localhost:3000/api/finance/clearance-requests/requests';
const getRecordApiUrl = (recordId) => `${RECORDS_API_URL}/${encodeURIComponent(recordId)}`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const money = (value) => `ETB ${Number(value || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const formatDate = (value) => {
  if (!value) return '—';
  const dateOnly = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return '—';
  const [year, month, day] = dateOnly.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB');
};

const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const nextDate = (value) => {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const isPayment = (record) => ['payment / repayment', 'payment', 'repayment'].includes(
  String(record.type || '').toLowerCase()
);
const isReversal = (record) => Boolean(record.reversalOf);

const normalizeFinanceStatus = (value) => {
  const status = String(value || 'Pending').trim().toLowerCase();
  if (['approved', 'completed', 'cleared'].includes(status)) return 'Approved';
  if (['returned', 'rejected', 'return'].includes(status)) return 'Returned';
  if (['under review', 'in progress'].includes(status)) return 'Under Review';
  return 'Pending';
};

const initialPayment = () => ({
  amount: '',
  paymentMethod: '',
  paymentDate: localDate(),
  paymentReference: '',
  notes: '',
});

const editValues = (record) => ({
  type: record.type || 'Other',
  adjustmentDirection: record.adjustmentDirection || 'Increase',
  amount: String(record.amount ?? ''),
  issueDate: String(record.issueDate || '').slice(0, 10),
  dueDate: String(record.dueDate || '').slice(0, 10),
  description: record.description || '',
  notes: record.notes || '',
});

export default function EmployeeFinancialRecordDetails() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [records, setRecords] = useState([]);
  const [clearanceRequest, setClearanceRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingPayment, setSavingPayment] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [payment, setPayment] = useState(initialPayment);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [historyRecordId, setHistoryRecordId] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [receiptTarget, setReceiptTarget] = useState(null);
  const [reverseTarget, setReverseTarget] = useState(null);
  const [reverseReason, setReverseReason] = useState('');
  const [reversing, setReversing] = useState(false);
  const processedAction = useRef('');
  const action = searchParams.get('action') || '';
  const actionRecordId = searchParams.get('recordId') || '';

  const loadDetails = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [recordsResponse, requestsResponse] = await Promise.all([
        axios.get(RECORDS_API_URL, {
          params: { employeeId },
          headers: getAuthHeaders(),
        }),
        axios.get(CLEARANCE_REQUESTS_URL, {
          params: { status: 'All', search: employeeId },
          headers: getAuthHeaders(),
        }),
      ]);
      if (!recordsResponse.data?.success || !Array.isArray(recordsResponse.data.records)) {
        throw new Error(recordsResponse.data?.message || 'Unable to load employee financial records.');
      }
      if (!requestsResponse.data?.success || !Array.isArray(requestsResponse.data.requests)) {
        throw new Error(requestsResponse.data?.message || 'Unable to load Finance Clearance requests.');
      }

      const employeeRecords = recordsResponse.data.records;
      setRecords(employeeRecords);
      const matchingRequests = requestsResponse.data.requests
        .filter((request) => request.employeeId === employeeId)
        .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
      const activeRequest = matchingRequests.find((request) =>
        ['Pending', 'Under Review'].includes(normalizeFinanceStatus(request.financeStatus))
      );
      const approvedRequest = matchingRequests.find((request) =>
        normalizeFinanceStatus(request.financeStatus) === 'Approved'
      );
      setClearanceRequest(activeRequest || approvedRequest || null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to load employee financial records.');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  useEffect(() => {
    if (loading) return;
    const actionKey = `${action}:${actionRecordId}`;
    if (!action || processedAction.current === actionKey) return;
    processedAction.current = actionKey;

    if (action === 'payment') {
      const targetRecord = records.find((record) => String(record._id) === actionRecordId);
      if (!targetRecord) {
        setError('The selected financial record could not be found.');
        return;
      }
      setPaymentTarget(targetRecord);
      setPaymentFormOpen(true);
    }
    if (action === 'history') {
      setHistoryRecordId(actionRecordId);
      document.getElementById('payment-history')?.scrollIntoView({ behavior: 'smooth' });
    }
    if (['view', 'edit', 'receipt', 'reverse'].includes(action)) {
      const targetRecord = records.find((record) => String(record._id) === actionRecordId);
      if (!targetRecord) {
        setError('The selected financial record could not be found.');
        return;
      }
      if (action === 'view') setViewTarget(targetRecord);
      if (action === 'edit') {
        setEditTarget(targetRecord);
        setEditForm(editValues(targetRecord));
      }
      if (action === 'receipt') setReceiptTarget(targetRecord);
      if (action === 'reverse') {
        setReverseTarget(targetRecord);
        setReverseReason('');
      }
    }
  }, [action, actionRecordId, loading, records]);

  const employee = records[0] || {};
  const paymentHistory = useMemo(
    () => records.filter((record) => isPayment(record) || isReversal(record)).sort((left, right) =>
      new Date(right.paymentDate || right.createdAt || 0) - new Date(left.paymentDate || left.createdAt || 0)
    ),
    [records]
  );
  const financialObligations = records.filter((record) =>
    !isPayment(record) && !isReversal(record)
      && !(record.type === 'Adjustment' && record.adjustmentDirection === 'Reduce')
  );
  const selectedHistoryRecord = financialObligations.find(
    (record) => String(record._id) === historyRecordId
  );
  const scopedPaymentHistory = selectedHistoryRecord
    ? paymentHistory.filter((record) => String(record.paymentFor || '') === historyRecordId
      || (!record.paymentFor && financialObligations.length === 1))
    : paymentHistory;
  const totalAmount = records
    .filter((record) => !isPayment(record) && !isReversal(record) && !(record.type === 'Adjustment' && record.adjustmentDirection === 'Reduce'))
    .reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const paidAmount = records
    .filter((record) => !isPayment(record) && !isReversal(record) && !(record.type === 'Adjustment' && record.adjustmentDirection === 'Reduce'))
    .reduce((sum, record) => sum + Number(record.paidAmount || 0), 0);
  const outstandingAmount = Math.max(
    records.reduce((balance, record) => {
      if (isReversal(record)) return balance;
      if (isPayment(record)) return record.isReversed ? balance : balance - Number(record.amount || 0);
      const isCredit = record.type === 'Adjustment' && record.adjustmentDirection === 'Reduce';
      return isCredit
        ? balance - Number(record.amount || 0)
        : balance + Number(record.amount || 0) - Number(record.paidAmount || 0);
    }, 0),
    0
  );
  const financeStatus = normalizeFinanceStatus(clearanceRequest?.financeStatus);
  const paymentAmount = Number(payment.amount);
  const paymentOutstanding = paymentTarget
    ? Number(paymentTarget.outstandingBalance || 0)
    : outstandingAmount;
  const clearActionQuery = () => {
    setSearchParams({});
    processedAction.current = '';
  };
  const closePaymentForm = () => {
    setPaymentFormOpen(false);
    setPaymentTarget(null);
    clearActionQuery();
  };

  const savePayment = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }
    if (paymentAmount > paymentOutstanding) {
      setError(`Payment cannot exceed the outstanding balance of ${money(paymentOutstanding)}.`);
      return;
    }
    if (!payment.paymentMethod || !payment.paymentDate || !payment.paymentReference.trim()) {
      setError('Payment method, payment date, and payment reference are required.');
      return;
    }

    setSavingPayment(true);
    try {
      const response = await axios.post(
        PAYMENTS_API_URL,
        {
          employeeId,
          ...(paymentTarget?._id ? { financialRecordId: paymentTarget._id } : {}),
          amount: paymentAmount,
          paymentMethod: payment.paymentMethod,
          paymentDate: payment.paymentDate,
          paymentReference: payment.paymentReference.trim(),
          notes: payment.notes.trim(),
        },
        { headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' } }
      );
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to record payment.');
      }
      setPaymentFormOpen(false);
      setPayment(initialPayment());
      setPaymentTarget(null);
      clearActionQuery();
      setMessage(response.data.message || 'Payment recorded successfully.');
      await loadDetails();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to record payment.');
    } finally {
      setSavingPayment(false);
    }
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!editTarget || savingEdit) return;
    setError('');
    setMessage('');
    setSavingEdit(true);
    try {
      const response = await axios.patch(
        getRecordApiUrl(editTarget._id),
        {
          ...editForm,
          amount: Number(editForm.amount),
        },
        { headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' } }
      );
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to update financial record.');
      }
      setEditTarget(null);
      setEditForm(null);
      clearActionQuery();
      setMessage(response.data.message || 'Financial record updated successfully.');
      await loadDetails();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to update financial record.');
    } finally {
      setSavingEdit(false);
    }
  };

  const reversePayment = async (event) => {
    event.preventDefault();
    if (!reverseTarget || reversing || !reverseReason.trim()) return;
    setError('');
    setMessage('');
    setReversing(true);
    try {
      const response = await axios.post(
        `${getRecordApiUrl(reverseTarget._id)}/reverse`,
        { reason: reverseReason.trim() },
        { headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' } }
      );
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to reverse payment.');
      }
      setReverseTarget(null);
      setReverseReason('');
      clearActionQuery();
      setMessage(response.data.message || 'Payment reversed. The original remains in the audit trail.');
      await loadDetails();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to reverse payment.');
    } finally {
      setReversing(false);
    }
  };

  const approveClearance = async () => {
    if (!clearanceRequest || outstandingAmount > 0 || approving) return;
    setApproving(true);
    setError('');
    setMessage('');
    try {
      if (financeStatus === 'Pending') {
        const reviewResponse = await axios.patch(
          `${CLEARANCE_REQUESTS_URL}/${clearanceRequest._id}/start-review`,
          {},
          { headers: getAuthHeaders() }
        );
        if (!reviewResponse.data?.success) {
          throw new Error(reviewResponse.data?.message || 'Unable to start Finance Clearance review.');
        }
      }
      const response = await axios.patch(
        `${CLEARANCE_REQUESTS_URL}/${clearanceRequest._id}/approve`,
        { comment: '' },
        { headers: getAuthHeaders() }
      );
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to approve Finance Clearance.');
      }
      setMessage('Financial Clearance: Cleared successfully.');
      await loadDetails();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to approve Finance Clearance.');
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-sm text-slate-500">Loading employee financial details…</div>;
  }

  if (error && records.length === 0) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
        <button type="button" onClick={() => navigate('/finance-office/records')} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900">
          <ArrowLeft size={16} /> Return to Financial Records
        </button>
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <button
        type="button"
        onClick={() => navigate('/finance-office/records')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 hover:text-blue-900"
      >
        <ArrowLeft size={15} /> Return to Financial Records
      </button>

      <header className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">Finance Officer · Employee Account</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">Financial Record Details</h1>
          <p className="mt-1 text-xs text-slate-500">Review obligations, record repayments and clear eligible finance requests.</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-xs font-bold ${
          outstandingAmount > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
        }`}>
          {outstandingAmount > 0 ? 'Outstanding' : 'Balance cleared'}
        </span>
      </header>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</div>}
      {message && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">{message}</div>}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900"><WalletCards size={16} className="text-blue-600" /> Employee Information</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Full Name" value={employee.employeeName || '—'} />
          <Info label="Employee ID" value={employee.employeeId || employeeId} />
          <Info label="Department" value={employee.department || '—'} />
          <Info label="Position" value={employee.position || '—'} />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><CircleDollarSign size={16} className="text-blue-600" /> Financial Information</h2>
            <p className="mt-1 text-[11px] text-slate-500">Current totals reflect all obligations and recorded repayments.</p>
          </div>
          {outstandingAmount > 0 && (
            <button
              type="button"
              onClick={() => {
                setError('');
                setPaymentFormOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-blue-600 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <CircleDollarSign size={15} /> Record Payment
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Total Amount" value={money(totalAmount)} />
          <Info label="Paid Amount" value={money(paidAmount)} tone="text-emerald-700" />
          <Info label="Outstanding Amount" value={money(outstandingAmount)} tone={outstandingAmount > 0 ? 'text-rose-700' : 'text-emerald-700'} />
          <Info label="Finance Clearance" value={financeStatus === 'Approved' ? 'Cleared' : financeStatus} />
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-[900px] w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>{['Record Type', 'Total Amount', 'Paid Amount', 'Outstanding', 'Issue Date', 'Due Date', 'Payment Status'].map((label) => <th key={label} className="px-3 py-3 font-semibold">{label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.filter((record) => !isPayment(record) && !isReversal(record)).length === 0 ? (
                <tr><td colSpan="7" className="p-6 text-center text-slate-500">No obligation records found.</td></tr>
              ) : records.filter((record) => !isPayment(record) && !isReversal(record)).map((record) => (
                <tr key={record._id} className="hover:bg-slate-50">
                  <td className="px-3 py-3 font-medium text-slate-800">{record.type === 'Adjustment' && record.adjustmentDirection ? `Adjustment (${record.adjustmentDirection})` : record.type || 'Other'}</td>
                  <td className="px-3 py-3">{money(record.amount)}</td>
                  <td className="px-3 py-3 text-emerald-700">{money(record.paidAmount)}</td>
                  <td className={`px-3 py-3 font-semibold ${Number(record.outstandingBalance || 0) > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{money(record.outstandingBalance)}</td>
                  <td className="whitespace-nowrap px-3 py-3">{formatDate(record.issueDate)}</td>
                  <td className="whitespace-nowrap px-3 py-3">{formatDate(record.dueDate)}</td>
                  <td className="px-3 py-3">{record.status || 'Outstanding'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="payment-history" className="scroll-mt-6 space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><RotateCcw size={16} className="text-violet-600" /> Payment History{selectedHistoryRecord ? ` — ${selectedHistoryRecord.type}` : ''}</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            {selectedHistoryRecord
              ? `Payments recorded against this financial record${financialObligations.length > 1 ? '. Older employee-level payments without a linked record are not included.' : '.'}`
              : 'All repayments recorded for this employee.'}
          </p>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-[680px] w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>{['Date', 'Type', 'Amount', 'Method', 'Reference', 'Recorded By', 'Notes', 'Receipt'].map((label) => <th key={label} className="px-3 py-3 font-semibold">{label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scopedPaymentHistory.length === 0 ? (
                <tr><td colSpan="8" className="p-6 text-center text-slate-500">No payment history recorded.</td></tr>
              ) : scopedPaymentHistory.map((record) => (
                <tr key={record._id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-3">{formatDate(record.paymentDate || record.createdAt)}</td>
                  <td className="px-3 py-3">
                    {isReversal(record) ? (
                      <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700">Reversal</span>
                    ) : record.isReversed ? (
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">Reversed payment</span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">Payment</span>
                    )}
                  </td>
                  <td className={`whitespace-nowrap px-3 py-3 font-semibold ${isReversal(record) ? 'text-rose-700' : 'text-emerald-700'}`}>{money(record.amount)}</td>
                  <td className="px-3 py-3">{record.paymentMethod || '—'}</td>
                  <td className="px-3 py-3">{record.paymentReference || '—'}</td>
                  <td className="px-3 py-3">{record.recordedBy || 'Finance Officer'}</td>
                  <td className="max-w-64 whitespace-normal px-3 py-3 text-slate-600">{record.notes || '—'}</td>
                  <td className="px-3 py-3">
                    {!isReversal(record) && (
                      <button type="button" onClick={() => setReceiptTarget(record)} className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2 py-1.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-50">
                        <Printer size={12} /> Receipt
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {scopedPaymentHistory.length > 0 && (
              <tfoot className="border-t border-slate-200 bg-slate-50">
                <tr>
                  <td colSpan="2" className="px-3 py-3 text-right font-semibold text-slate-700">Total Paid</td>
                  <td className="px-3 py-3 font-bold text-emerald-700">
                    {money(scopedPaymentHistory.reduce((sum, record) =>
                      sum + (!isReversal(record) && !record.isReversed ? Number(record.amount || 0) : 0), 0
                    ))}
                  </td>
                  <td colSpan="5" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">Finance Clearance</p>
          <p className="mt-1 text-xs text-slate-500">
            {financeStatus === 'Approved'
              ? 'Financial Clearance: Cleared'
              : outstandingAmount > 0
                ? 'Record repayments until the outstanding balance reaches zero.'
                : clearanceRequest
                  ? 'No outstanding amount. This request is ready for finance approval.'
                  : 'No active Finance Clearance request was found for this employee.'}
          </p>
        </div>
        {financeStatus === 'Approved' ? (
          <span className="inline-flex items-center gap-1.5 self-start rounded-lg bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-700">
            <CheckCircle2 size={15} /> Financial Clearance: Cleared
          </span>
        ) : clearanceRequest && outstandingAmount <= 0 && financeStatus !== 'Returned' && (
          <button
            type="button"
            onClick={approveClearance}
            disabled={approving}
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-emerald-600 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 size={15} /> {approving ? 'Approving…' : 'Approve / Clear Financial Clearance'}
          </button>
        )}
      </section>

      {viewTarget && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-3 sm:items-center sm:p-4" onClick={() => {
          setViewTarget(null);
          clearActionQuery();
        }}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="financial-record-view-title"
            className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl space-y-4 overflow-y-auto rounded-xl bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Read only</p>
                <h2 id="financial-record-view-title" className="mt-1 text-base font-bold text-slate-900">Financial Record Details</h2>
                <p className="mt-1 text-xs text-slate-500">{viewTarget.description || viewTarget.type || 'Financial record'}</p>
              </div>
              <button type="button" onClick={() => {
                setViewTarget(null);
                clearActionQuery();
              }} aria-label="Close financial record details" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </header>
            <div className="grid gap-2 sm:grid-cols-2">
              <ViewInfo label="Employee Name" value={viewTarget.employeeName || employee.employeeName || '—'} />
              <ViewInfo label="Employee ID" value={viewTarget.employeeId || employeeId} />
              <ViewInfo label="Department" value={viewTarget.department || employee.department || '—'} />
              <ViewInfo label="Record Type" value={viewTarget.type || '—'} />
              {isPayment(viewTarget) ? (
                <>
                  <ViewInfo label="Payment Amount" value={money(viewTarget.amount)} tone="text-emerald-700" />
                  <ViewInfo label="Payment Status" value={viewTarget.isReversed ? 'Reversed' : viewTarget.status || 'Paid'} />
                  <ViewInfo label="Payment Date" value={formatDate(viewTarget.paymentDate || viewTarget.createdAt)} />
                  <ViewInfo label="Payment Method" value={viewTarget.paymentMethod || '—'} />
                  <ViewInfo label="Payment Reference" value={viewTarget.paymentReference || '—'} />
                  <ViewInfo label="Recorded By" value={viewTarget.recordedBy || 'Finance Officer'} />
                </>
              ) : (
                <>
                  <ViewInfo label="Debt Amount" value={money(viewTarget.totalDue ?? viewTarget.amount)} />
                  <ViewInfo label="Paid Amount" value={money(viewTarget.paidAmount)} tone="text-emerald-700" />
                  <ViewInfo label="Remaining Balance" value={money(viewTarget.outstandingBalance)} tone={Number(viewTarget.outstandingBalance) > 0 ? 'text-rose-700' : 'text-emerald-700'} />
                  <ViewInfo label="Status" value={viewTarget.status || 'Outstanding'} />
                  <ViewInfo label="Created Date" value={formatDate(viewTarget.createdAt)} />
                  <ViewInfo label="Recorded By" value={viewTarget.recordedBy || 'Finance Officer'} />
                  <ViewInfo label="Issue Date" value={formatDate(viewTarget.issueDate)} />
                  <ViewInfo label="Due Date" value={formatDate(viewTarget.dueDate)} />
                </>
              )}
            </div>
            {viewTarget.notes && <p className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600"><span className="font-semibold">Remark:</span> {viewTarget.notes}</p>}
            <footer className="flex justify-end border-t border-slate-100 pt-3">
              <button type="button" onClick={() => {
                setViewTarget(null);
                clearActionQuery();
              }} className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Close</button>
            </footer>
          </section>
        </div>
      )}

      {paymentFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => !savingPayment && closePaymentForm()}>
          <form
            onSubmit={savePayment}
            role="dialog"
            aria-modal="true"
            aria-labelledby="record-payment-title"
            className="w-full max-w-xl space-y-4 rounded-xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3">
              <div>
                <h2 id="record-payment-title" className="text-base font-bold text-slate-900">Record Payment</h2>
                <p className="mt-1 text-xs text-slate-500">Record the employee payment against their current outstanding balance.</p>
              </div>
              <button type="button" onClick={closePaymentForm} disabled={savingPayment} className="text-sm text-slate-400 hover:text-slate-700" aria-label="Close payment form">✕</button>
            </header>
            {error && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
            <div className="grid gap-4 sm:grid-cols-2">
              <PaymentReadOnlyField label="Employee Name" value={employee.employeeName || '—'} />
              <PaymentReadOnlyField label="Employee ID" value={employee.employeeId || employeeId} />
              <PaymentReadOnlyField label="Outstanding Balance" value={money(paymentOutstanding)} />
              <label className="text-xs font-semibold text-slate-700">
                Amount to Pay (ETB) *
                <span className="relative mt-1.5 block">
                  <CircleDollarSign size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="number"
                    min="0.01"
                    max={paymentOutstanding}
                    step="0.01"
                    required
                    value={payment.amount}
                    onChange={(event) => setPayment((current) => ({ ...current, amount: event.target.value }))}
                    aria-describedby="payment-amount-limit"
                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-500"
                  />
                </span>
                <span id="payment-amount-limit" className="mt-1 block text-[10px] font-normal text-slate-500">Cannot exceed {money(paymentOutstanding)}.</span>
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Payment Method *
                <select
                  required
                  value={payment.paymentMethod}
                  onChange={(event) => setPayment((current) => ({ ...current, paymentMethod: event.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-blue-500"
                >
                  <option value="">Select payment method</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Other">Other approved method</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Payment Date *
                <span className="relative mt-1.5 block">
                  <CalendarDays size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="date"
                    max={localDate()}
                    required
                    value={payment.paymentDate}
                    onChange={(event) => setPayment((current) => ({ ...current, paymentDate: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-500"
                  />
                </span>
              </label>
              <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                Payment Reference *
                <span className="relative mt-1.5 block">
                  <FileText size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    maxLength={100}
                    required
                    value={payment.paymentReference}
                    onChange={(event) => setPayment((current) => ({ ...current, paymentReference: event.target.value }))}
                    placeholder="Receipt, bank transaction, or voucher number"
                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-500"
                  />
                </span>
              </label>
              <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                Remark
                <textarea
                  rows={3}
                  maxLength={500}
                  value={payment.notes}
                  onChange={(event) => setPayment((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Optional payment remark"
                  className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-blue-500"
                />
              </label>
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={closePaymentForm} disabled={savingPayment} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={savingPayment || !payment.amount || !payment.paymentMethod || !payment.paymentReference.trim()} className="rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{savingPayment ? 'Recording Payment…' : 'Record Payment'}</button>
            </footer>
          </form>
        </div>
      )}

      {editTarget && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => !savingEdit && setEditTarget(null)}>
          <form onSubmit={saveEdit} role="dialog" aria-modal="true" aria-labelledby="edit-financial-record-title" className="w-full max-w-2xl space-y-4 rounded-xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <header className="flex items-center justify-between gap-3">
              <div>
                <h2 id="edit-financial-record-title" className="text-base font-bold text-slate-900">Edit Financial Record</h2>
                <p className="mt-1 text-xs text-slate-500">Changes are saved with an audit trail. Payments cannot be edited; reverse them instead.</p>
              </div>
              <button type="button" onClick={() => setEditTarget(null)} disabled={savingEdit} aria-label="Close edit dialog" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </header>
            {error && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700">Record Type
                <select value={editForm.type} onChange={(event) => setEditForm((current) => ({ ...current, type: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs">
                  {['Loan', 'Advance', 'Salary Advance', 'Other Financial Obligation', 'Overpayment', 'Other', 'Adjustment'].map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
              {editForm.type === 'Adjustment' && (
                <label className="text-xs font-semibold text-slate-700">Adjustment Direction
                  <select value="Increase" disabled className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs"><option>Increase</option></select>
                </label>
              )}
              <label className="text-xs font-semibold text-slate-700">Amount (ETB)
                <input type="number" min={editTarget.paidAmount || 0.01} step="0.01" required value={editForm.amount} onChange={(event) => setEditForm((current) => ({ ...current, amount: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs" />
                {Number(editTarget.paidAmount || 0) > 0 && <span className="mt-1 block text-[10px] font-normal text-slate-500">Cannot be less than already paid {money(editTarget.paidAmount)}.</span>}
              </label>
              <label className="text-xs font-semibold text-slate-700">Issue Date
                <input type="date" max={localDate()} required value={editForm.issueDate} onChange={(event) => setEditForm((current) => ({ ...current, issueDate: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs" />
              </label>
              <label className="text-xs font-semibold text-slate-700">Due Date
                <input type="date" min={nextDate(editForm.issueDate)} required value={editForm.dueDate} onChange={(event) => setEditForm((current) => ({ ...current, dueDate: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs" />
              </label>
              <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Description / Reason
                <textarea rows={2} maxLength={500} required value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs" />
              </label>
              <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Notes
                <textarea rows={2} maxLength={500} value={editForm.notes} onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs" />
              </label>
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setEditTarget(null)} disabled={savingEdit} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button>
              <button type="submit" disabled={savingEdit} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50"><Pencil size={13} />{savingEdit ? 'Saving…' : 'Save Changes'}</button>
            </footer>
          </form>
        </div>
      )}

      {reverseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => !reversing && setReverseTarget(null)}>
          <form onSubmit={reversePayment} role="dialog" aria-modal="true" aria-labelledby="reverse-payment-title" className="w-full max-w-lg space-y-4 rounded-xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <header className="flex items-start justify-between gap-3">
              <div>
                <h2 id="reverse-payment-title" className="text-base font-bold text-slate-900">Reverse Payment</h2>
                <p className="mt-1 text-xs text-slate-500">The original payment will remain in the financial history.</p>
              </div>
              <button type="button" onClick={() => setReverseTarget(null)} disabled={reversing} aria-label="Close reversal dialog" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </header>
            {error && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
            <div className="rounded-lg bg-slate-50 p-3 text-xs">
              <p><span className="text-slate-500">Payment:</span> <span className="font-semibold">{money(reverseTarget.amount)}</span></p>
              <p className="mt-1"><span className="text-slate-500">Reference:</span> <span className="font-semibold">{reverseTarget.paymentReference || '—'}</span></p>
            </div>
            <label className="block text-xs font-semibold text-slate-700">Reason for reversal *
              <textarea rows={3} maxLength={500} required value={reverseReason} onChange={(event) => setReverseReason(event.target.value)} placeholder="Explain why this payment is being reversed" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs" />
            </label>
            <footer className="flex justify-end gap-2">
              <button type="button" onClick={() => setReverseTarget(null)} disabled={reversing} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button>
              <button type="submit" disabled={reversing || !reverseReason.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50"><RotateCcw size={13} />{reversing ? 'Reversing…' : 'Confirm Reversal'}</button>
            </footer>
          </form>
        </div>
      )}

      {receiptTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <style>{'@media print { body * { visibility: hidden !important; } #finance-payment-receipt, #finance-payment-receipt * { visibility: visible !important; } #finance-payment-receipt { position: fixed; inset: 0; width: 100%; padding: 32px; background: white; } }'}</style>
          <section role="dialog" aria-modal="true" aria-labelledby="payment-receipt-title" className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl">
            <div id="finance-payment-receipt" className="space-y-5">
              <header className="border-b border-slate-200 pb-4 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Bahir Dar University</p>
                <h2 id="payment-receipt-title" className="mt-2 text-lg font-bold text-slate-900">Financial Payment Receipt</h2>
                <p className="mt-1 text-xs text-slate-500">Receipt No. {receiptTarget.paymentReference || receiptTarget._id}</p>
              </header>
              <div className="grid gap-3 text-xs sm:grid-cols-2">
                <ReceiptInfo label="Employee" value={employee.employeeName || '—'} />
                <ReceiptInfo label="Employee ID" value={employee.employeeId || employeeId} />
                <ReceiptInfo label="Department" value={employee.department || '—'} />
                <ReceiptInfo label="Payment Date" value={formatDate(receiptTarget.paymentDate || receiptTarget.createdAt)} />
                <ReceiptInfo label="Payment Method" value={receiptTarget.paymentMethod || '—'} />
                <ReceiptInfo label="Payment Reference" value={receiptTarget.paymentReference || '—'} />
                <ReceiptInfo label="Recorded By" value={receiptTarget.recordedBy || 'Finance Officer'} />
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-xs text-slate-500">Amount Received</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">{money(receiptTarget.amount)}</p>
              </div>
              <p className="text-xs text-slate-600"><span className="font-semibold">Notes:</span> {receiptTarget.notes || '—'}</p>
              <p className="border-t border-dashed border-slate-300 pt-4 text-center text-[10px] text-slate-500">This receipt confirms that the payment shown above was recorded in the employee financial ledger.</p>
            </div>
            <footer className="mt-5 flex justify-end gap-2 print:hidden">
              <button type="button" onClick={() => setReceiptTarget(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Close</button>
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white"><Printer size={14} />Print Receipt</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, tone = 'text-slate-900' }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function PaymentReadOnlyField({ label, value }) {
  return (
    <label className="text-xs font-semibold text-slate-700">
      {label}
      <input
        type="text"
        value={value}
        readOnly
        aria-readonly="true"
        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-600"
      />
    </label>
  );
}

function ViewInfo({ label, value, tone = 'text-slate-900' }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 break-words text-xs font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function ReceiptInfo({ label, value }) {
  return (
    <p>
      <span className="block text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
      <span className="mt-1 block font-semibold text-slate-800">{value}</span>
    </p>
  );
}
