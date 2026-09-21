import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  FileText,
  Info,
  Paperclip,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/authContext';
import { createClearance, fetchClearances, updateClearance } from '../../until/MyclearanceHelper';
import { computeClearanceProgress, getClearanceRequestStatus } from '../../until/clearanceProgress';
import EmployeeNavbar from './employeenavbar';
import EmployeeSidebar from './employeesidbar';

const statusStyles = {
  'COMPLETED': 'bg-emerald-50 text-emerald-700',
  'Completed': 'bg-emerald-50 text-emerald-700',
  'Awaiting Final HR Clearance': 'bg-blue-50 text-blue-700',
  'IN PROGRESS': 'bg-amber-50 text-amber-700',
  'In Progress': 'bg-amber-50 text-amber-700',
  'RETURNED': 'bg-red-50 text-red-600',
  'Returned': 'bg-red-50 text-red-600',
  'PENDING': 'bg-slate-100 text-slate-500',
  'Pending': 'bg-slate-100 text-slate-500',
  'Waiting': 'bg-slate-100 text-slate-400',
  'APPROVED': 'bg-emerald-50 text-emerald-700',
  'Approved': 'bg-emerald-50 text-emerald-700',
  'CLEARED': 'bg-emerald-50 text-emerald-700',
  'Cleared': 'bg-emerald-50 text-emerald-700',
  'REJECTED': 'bg-red-50 text-red-600',
  'Rejected': 'bg-red-50 text-red-600',
};

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : '-';
const minimumLastWorkingDate = '2027-01-01';

export default function MyClearancePage() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const isEmployeeRoute = pathname.startsWith('/employee/');
  const [menuOpen, setMenuOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [cancellingRequestId, setCancellingRequestId] = useState('');
  const [cancelCandidate, setCancelCandidate] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [resolutionRemark, setResolutionRemark] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    clearanceReason: 'Resignation',
    reason: 'I am resigning from my position.',
    remark: 'Thank you.',
    lastWorkingDate: '2024-05-31',
    file: null,
    confirmed: false,
  });

  const employeeId = user?.employeeId || user?.employee?.employeeId || '';
  const employeeName = user?.name || user?.fullName || '';
  const department = user?.department?.name || user?.department || '';
  const position = user?.position || user?.jobTitle || '';
  const email = user?.email || '';
  const phone = user?.phone || user?.phoneNumber || '';
  const campus = user?.campus || '';
  const college = user?.college || user?.institute || '';

  useEffect(() => {
    if (!employeeId) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    fetchClearances()
      .then((items) => {
        setRequests(items);
      })
      .catch((requestError) => setError(requestError.message || 'Unable to load your clearance requests.'))
      .finally(() => setLoading(false));

    return undefined;
  }, [employeeId]);

  const handleInputChange = (event) => {
    const { name, type, value, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCancelRequest = (request) => {
    const requestId = request.requestId || request._id;
    if (!requestId) return;
    setCancellationReason('');
    setCancelCandidate(request);
  };

  const confirmCancelRequest = async () => {
    if (!cancelCandidate || !cancellationReason.trim()) return;
    const requestId = cancelCandidate.requestId || cancelCandidate._id;
    setCancellingRequestId(requestId);
    setError('');
    try {
      const response = await updateClearance(requestId, { cancelRequest: true, cancellationReason: cancellationReason.trim() });
      const cancelledRequest = response.clearance || response.request || response;
      setRequests((current) => current.map((item) => (item.requestId || item._id) === requestId ? { ...item, ...cancelledRequest, status: 'Cancelled' } : item));
      setMessage('Clearance request cancelled successfully.');
      setCancelCandidate(null);
      setCancellationReason('');
    } catch (cancelError) {
      setError(cancelError.message || 'Unable to cancel clearance request.');
    } finally {
      setCancellingRequestId('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.lastWorkingDate || formData.lastWorkingDate < minimumLastWorkingDate) {
      setError('Last working date must be January 1, 2027 or later.');
      return;
    }
    if (!formData.confirmed) {
      setError('Please confirm that the information provided is correct.');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const response = await createClearance({
        employeeId,
        employeeName,
        department,
        clearanceReason: formData.clearanceReason,
        reason: formData.reason,
        requestDate: new Date().toISOString().slice(0, 10),
        expectedLastWorkingDate: formData.lastWorkingDate,
        remarks: formData.remark,
      });

      if (response.clearance) {
        setRequests((current) => [response.clearance, ...current]);
        setMessage('Clearance request submitted successfully.');
        setFormData({
          clearanceReason: 'Resignation',
          reason: '',
          remark: '',
          lastWorkingDate: '',
          file: null,
          confirmed: false,
        });
      } else {
        setError(response.message || 'Unable to submit your clearance request.');
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || 'Unable to submit your clearance request.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentRequest = requests.find((request) => request.requestId === selectedRequestId) || requests[0] || { requestId: 'No request selected' };
  const progressInfo = computeClearanceProgress(currentRequest);
  const progressSteps = requests.length ? [...progressInfo.steps, progressInfo.finalHRStep] : [];
  const returnedStep = progressInfo.returnedStep;
  const isReturnedRequest = Boolean(returnedStep) || ['Returned', 'Rejected', 'returned', 'rejected'].includes(String(currentRequest?.status || ''));
  const isResolvableReturn = isReturnedRequest && currentRequest?.returnResolvable !== false && currentRequest?.isResolvable !== false;
  const requestProgressInfo = (request) => {
    const info = computeClearanceProgress(request);
    return {
      label: `${info.progressCount} / ${info.totalOffices || 5} Offices`,
      percent: info.percent,
    };
  };

  const handleResubmit = async () => {
    const clearanceId = currentRequest?._id || currentRequest?.requestId;
    if (!clearanceId || !resolutionRemark.trim()) return;
    setResubmitting(true);
    setError('');
    try {
      const response = await updateClearance(clearanceId, {
        resubmitted: true,
        resolutionRemark: resolutionRemark.trim(),
      });
      if (response.clearance) {
        setRequests((current) => current.map((request) => request._id === response.clearance._id ? response.clearance : request));
        setResolutionRemark('');
        setResolving(false);
        setMessage('Your request has been resubmitted for clearance review.');
      }
    } catch (requestError) {
      setError(requestError?.message || 'Unable to resubmit your clearance request.');
    } finally {
      setResubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-800">
      {isEmployeeRoute && (
        <>
          <div className="hidden lg:block"><EmployeeSidebar /></div>
          {menuOpen && (
            <>
              <button type="button" aria-label="Close menu" className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" onClick={() => setMenuOpen(false)} />
              <div className="relative z-50 lg:hidden"><EmployeeSidebar onNavigate={() => setMenuOpen(false)} /></div>
            </>
          )}
          <EmployeeNavbar onMenuClick={() => setMenuOpen(true)} />
        </>
      )}

      <main className={`mx-auto max-w-7xl space-y-6 p-6 ${isEmployeeRoute ? 'lg:ml-72' : ''}`}>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-[28px] font-bold text-slate-800">New Clearance Request</h2>
        </div>

        <section className="grid gap-5 xl:grid-cols-[1.12fr_1.12fr_1fr]">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <FileText className="h-5 w-5 text-blue-600" />
              <h3 className="text-[16px] font-bold text-slate-800">Employee Information</h3>
            </div>
            <div className="space-y-3 p-5">
              <div className="grid grid-cols-2 gap-3">
                <InfoField label="Full Name" value={employeeName} />
                <InfoField label="Employee ID" value={employeeId} />
                <InfoField label="Department" value={department} />
                <InfoField label="Position" value={position} />
                <InfoField label="Email" value={email} />
                <InfoField label="Phone" value={phone} />
                <InfoField label="Campus" value={campus} />
                <InfoField label="College / Institute" value={college} />
              </div>
              <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-[12px] text-blue-700">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Employee information is loaded from your profile.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <FileText className="h-5 w-5 text-blue-600" />
              <h3 className="text-[16px] font-bold text-slate-800">Clearance Request Information</h3>
            </div>
            <form id="clearance-form" onSubmit={handleSubmit} className="space-y-4 p-5">
              <div>
                <label className="mb-2 block text-[12px] font-semibold text-slate-700">Clearance Type <span className="text-red-500">*</span></label>
                <select name="clearanceReason" value={formData.clearanceReason} onChange={handleInputChange} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:border-blue-500">
                  <option>Resignation</option>
                  <option>Retirement</option>
                  <option>Transfer to Another Institution</option>
                  <option>Internal Transfer</option>
                  <option>Study Leave</option>
                  <option>Contract End</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[12px] font-semibold text-slate-700">Reason <span className="text-red-500">*</span></label>
                <textarea name="reason" value={formData.reason} onChange={handleInputChange} rows={3} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:border-blue-500" placeholder="I am resigning from my position." />
              </div>

              <div>
                <label className="mb-2 block text-[12px] font-semibold text-slate-700">Last Working Date <span className="text-red-500">*</span></label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="date" name="lastWorkingDate" value={formData.lastWorkingDate} min={minimumLastWorkingDate} onChange={handleInputChange} required className="w-full rounded-md border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:border-blue-500" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[12px] font-semibold text-slate-700">Additional Remark (Optional)</label>
                <textarea name="remark" value={formData.remark} onChange={handleInputChange} rows={2} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:border-blue-500" placeholder="Thank you." />
              </div>

              <label className="flex items-start gap-2 text-[12px] text-slate-600">
                <input type="checkbox" name="confirmed" checked={formData.confirmed} onChange={handleInputChange} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span>I confirm that the information provided is correct.</span>
              </label>

              {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>}
              {message && <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">{message}</p>}
            </form>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <Paperclip className="h-5 w-5 text-blue-600" />
              <h3 className="text-[16px] font-bold text-slate-800">Supporting Documents</h3>
            </div>
            <div className="space-y-4 p-5">
              <UploadField label="Resignation Letter" fileName="resignation_letter.pdf" />
              <UploadField label="ID Copy" fileName="id_copy.pdf" />
              <UploadField label="Other Document (Optional)" fileName="No file chosen" optional />

              <div className="mt-6 flex justify-end gap-3 pt-3">
                <button type="button" className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" form="clearance-form" disabled={submitting} className="rounded-md bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70">
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="px-5 py-4">
            <h3 className="text-[18px] font-bold text-slate-800">My Clearance Requests</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-t border-slate-100 text-left">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Request No</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Request Date</th>
                  <th className="px-4 py-3">Last Working Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.length ? requests.map((request, index) => {
                  const progressMeta = requestProgressInfo(request);
                  const requestStatus = getClearanceRequestStatus(request);
                  return (
                  <tr key={request.requestId || index} className="border-t border-slate-100 text-[12px] text-slate-700">
                    <td className="px-4 py-3 font-semibold text-slate-800">{index + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{request.requestId}</td>
                    <td className="px-4 py-3">{request.clearanceType || request.clearanceReason || request.type || 'Resignation'}</td>
                    <td className="px-4 py-3">{request.requestDate || formatDate(request.createdAt)}</td>
                    <td className="px-4 py-3">{request.lastWorkingDate || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-1 text-[10px] font-bold ${statusStyles[requestStatus] || statusStyles.PENDING}`}>
                        {requestStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-[180px] items-center gap-2">
                        <span className="min-w-[70px] text-[11px] font-semibold text-slate-600">{progressMeta.label}</span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progressMeta.percent}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => { setSelectedRequestId(request.requestId); setResolving(false); setResolutionRemark(''); setError(''); }} className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-700 hover:bg-blue-100">
                          View
                        </button>
                        {['Pending', 'PENDING'].includes(requestStatus) && (
                          <button type="button" onClick={() => handleCancelRequest(request)} disabled={cancellingRequestId === (request.requestId || request._id)} title="Cancel request" className="rounded-md border border-red-200 px-2 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60">
                            {cancellingRequestId === (request.requestId || request._id) ? 'Cancelling...' : 'Cancel Request'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-slate-400">No clearance requests found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedRequestId && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-[18px] font-bold text-slate-800">Clearance Details</h3>
            <div className="mt-4 grid gap-5 lg:grid-cols-2">
              <div>
                <h4 className="mb-3 text-[13px] font-bold text-slate-700">Employee Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="Full Name" value={currentRequest.employeeName || employeeName || '-'} />
                  <InfoField label="Employee ID" value={currentRequest.employeeId || employeeId || '-'} />
                  <InfoField label="Department" value={currentRequest.department?.name || currentRequest.department || department || '-'} />
                  <InfoField label="Position" value={currentRequest.position || position || '-'} />
                  <InfoField label="Campus" value={currentRequest.campus || campus || '-'} />
                </div>
              </div>
              <div>
                <h4 className="mb-3 text-[13px] font-bold text-slate-700">Clearance Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="Request No" value={currentRequest.requestId || '-'} />
                  <InfoField label="Type" value={currentRequest.clearanceType || currentRequest.clearanceReason || currentRequest.type || '-'} />
                  <InfoField label="Request Date" value={currentRequest.requestDate || formatDate(currentRequest.createdAt)} />
                  <InfoField label="Last Working Date" value={currentRequest.lastWorkingDate || currentRequest.expectedLastWorkingDate || '-'} />
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-5 xl:grid-cols-[1.45fr_0.9fr]">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-[18px] font-bold text-slate-800">Clearance Progress (Request: {currentRequest.requestId})</h3>
            </div>
            <div className="grid gap-0 md:grid-cols-[1.2fr_0.8fr]">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Office / Department</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Cleared By</th>
                      <th className="px-4 py-3">Cleared Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progressSteps.map((step) => (
                      <tr key={step.office} className="border-t border-slate-100 text-[12px] text-slate-700">
                        <td className="px-4 py-3 font-medium">{step.office}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${statusStyles[step.status] || statusStyles.PENDING}`}>
                            {step.status === 'Approved' || step.status === 'Cleared' ? <CheckCircle2 className="h-3.5 w-3.5" /> : step.status === 'Returned' ? <XCircle className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                            {step.status === 'Completed' ? 'Cleared' : step.status === 'Under Review' ? 'Under Review' : step.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{step.clearedBy || (step.status === 'Completed' ? 'Finance Officer' : '-')}</td>
                        <td className="px-4 py-3 text-slate-500">{step.clearedDate ? formatDate(step.clearedDate) : step.updatedAt ? formatDate(step.updatedAt) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isReturnedRequest ? (
                <div className="border-t border-slate-100 bg-slate-50 p-4 md:border-l md:border-t-0">
                  <h4 className="text-[16px] font-bold text-red-600">Returned Detail</h4>
                  <div className="mt-4 space-y-4 text-[12px] text-slate-700">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
                      <span className="font-medium text-slate-500">Returned By</span>
                      <span className="font-semibold text-slate-800">{returnedStep?.office || currentRequest?.returnedOffice || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
                      <span className="font-medium text-slate-500">Returned Date</span>
                      <span className="font-semibold text-slate-800">{returnedStep?.updatedAt ? formatDate(returnedStep.updatedAt) : currentRequest?.returnedAt ? formatDate(currentRequest.returnedAt) : '-'}</span>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-slate-500">Reason</p>
                      <p className="rounded-md border border-red-200 bg-red-50 p-2 text-red-700">{progressInfo.returnReason || returnedStep?.returnReason || returnedStep?.comment || currentRequest?.returnReason || currentRequest?.financeRemarks || 'No return reason provided.'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-slate-500">Remark</p>
                      <p className="text-slate-600">{currentRequest?.remarks || '-'}</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">
                    <div className="flex items-start gap-2">
                      <Info className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>Please revise the above issue and resubmit your request.</span>
                    </div>
                  </div>

                  {isResolvableReturn && (!resolving ? (
                    <button type="button" onClick={() => setResolving(true)} className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700">
                      Resolve Issue
                    </button>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <label className="block text-[12px] font-semibold text-slate-700" htmlFor="resolution-remark">Resolution Remark</label>
                      <textarea id="resolution-remark" value={resolutionRemark} onChange={(event) => setResolutionRemark(event.target.value)} rows={3} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-700 outline-none focus:border-blue-500" placeholder="Describe how you resolved the returned issue." />
                      <button type="button" onClick={handleResubmit} disabled={resubmitting || !resolutionRemark.trim()} className="inline-flex w-full items-center justify-center rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
                        {resubmitting ? 'Resubmitting...' : 'Resubmit Request'}
                      </button>
                    </div>
                  ))}

                </div>
              ) : (
                <div className="border-t border-slate-100 bg-slate-50 p-4 md:border-l md:border-t-0">
                  <h4 className="text-[16px] font-bold text-slate-600">Request Status</h4>
                  <p className="mt-3 text-[12px] text-slate-600">This request is active and has no returned office issue at the moment.</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            {(() => {
              const requestStatus = getClearanceRequestStatus(currentRequest, progressInfo);
              return (
                <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[18px] font-bold text-slate-800">Status Overview</h3>
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${statusStyles[requestStatus] || statusStyles.PENDING}`}>
                {requestStatus}
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-[12px] text-slate-600">
                  <span>Overall Progress</span>
                  <span>{progressInfo.progressCount} / {progressInfo.totalOffices || 5} Offices</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progressInfo.percent}%` }} />
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Current Stage</p>
                  <p className="mt-1 text-[14px] font-bold text-slate-800">{progressInfo.currentStage?.office || 'Pending'}{progressInfo.currentStage?.status === 'Returned' ? ' - Returned' : ''}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Request Date</p>
                <p className="mt-1 text-[14px] font-bold text-slate-800">{currentRequest?.requestDate || formatDate(currentRequest?.createdAt) || '-'}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Last Working Date</p>
                <p className="mt-1 text-[14px] font-bold text-slate-800">{currentRequest?.lastWorkingDate || currentRequest?.expectedLastWorkingDate || '-'}</p>
              </div>
            </div>
                </>
              );
            })()}
          </div>
        </section>

        {cancelCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation">
            <section role="dialog" aria-modal="true" aria-labelledby="cancel-request-title" className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
              <div className="flex items-start gap-3">
                <div>
                  <h3 id="cancel-request-title" className="text-lg font-bold text-slate-800">Cancel clearance request?</h3>
                  <p className="mt-2 text-sm text-slate-600">Request <span className="font-semibold text-slate-800">{cancelCandidate.requestId || cancelCandidate._id}</span> will remain in the clearance history.</p>
                  <textarea value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} rows={3} placeholder="Enter cancellation reason..." className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-500" />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setCancelCandidate(null)} disabled={Boolean(cancellingRequestId)} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">Keep Request</button>
                <button type="button" onClick={confirmCancelRequest} disabled={Boolean(cancellingRequestId) || !cancellationReason.trim()} className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">{cancellingRequestId ? 'Cancelling...' : 'Cancel Request'}</button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function UploadField({ label, fileName, optional = false }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-700">{label}</p>
          <p className="mt-1 text-[11px] text-slate-500">{optional ? 'Optional' : 'Required'}</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100">
          <UploadCloud className="h-4 w-4" />
          Choose File
          <input type="file" className="hidden" />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-md bg-white px-2.5 py-2 text-[11px] text-slate-600">
        <FileText className="h-4 w-4 text-slate-400" />
        <span>{fileName}</span>
      </div>
    </div>
  );
}