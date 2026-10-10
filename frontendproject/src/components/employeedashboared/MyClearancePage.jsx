import { useEffect, useState } from 'react';
import axios from 'axios';
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
import { fetchActiveSeparationTypes } from '../../until/separationTypeHelper';
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
const formatReturnedDate = (value) => value ? new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-';
const getLocalDateOnly = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function MyClearancePage() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const isEmployeeRoute = pathname.startsWith('/employee/');
  const [menuOpen, setMenuOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [separationTypes, setSeparationTypes] = useState([]);
  const [loadingSeparationTypes, setLoadingSeparationTypes] = useState(true);
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [cancellingRequestId, setCancellingRequestId] = useState('');
  const [cancelCandidate, setCancelCandidate] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [resolutionRemark, setResolutionRemark] = useState('');
  const [returnedForm, setReturnedForm] = useState({
    clearanceType: '',
    reason: '',
    lastWorkingDate: '',
    relievingDate: '',
    remark: '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    clearanceReason: '',
    reason: '',
    remark: 'Thank you.',
    lastWorkingDate: getLocalDateOnly(),
    file: null,
    confirmed: false,
  });

  const profile = employeeProfile || user || {};
  const employeeId = profile.employeeId || profile.employee?.employeeId || '';
  const employeeName = profile.fullName || profile.name || '';
  const department = profile.department?.name || profile.department || '';
  const position = profile.position || profile.jobTitle || '';
  const email = profile.email || '';
  const phone = profile.phone || profile.phoneNumber || '';
  const campus = profile.campus || '';
  const college = profile.college || profile.institute || profile.collegeInstitute || '';

  useEffect(() => {
    fetchActiveSeparationTypes()
      .then((types) => {
        setSeparationTypes(types);
        setFormData((current) => ({
          ...current,
          clearanceReason: types.includes(current.clearanceReason) ? current.clearanceReason : types[0] || '',
        }));
      })
      .catch((requestError) => {
        setError(requestError.response?.data?.message || requestError.message || 'Unable to load active separation types.');
      })
      .finally(() => setLoadingSeparationTypes(false));
  }, []);

  useEffect(() => {
    const profileId = user?._id || user?.id;
    if (!profileId) return undefined;
    axios.get(`/api/profile/${profileId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } })
      .then((response) => setEmployeeProfile(response.data?.data || response.data || {}))
      .catch(() => setEmployeeProfile(null));
    return undefined;
  }, [user?._id, user?.id]);

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
    if (!separationTypes.includes(formData.clearanceReason)) {
      setError('Select an active clearance type before submitting your request.');
      return;
    }
    if (!formData.reason.trim()) {
      setError('Please enter the reason for your clearance request.');
      return;
    }
    if (!formData.lastWorkingDate) {
      setError('Last working date is required.');
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
        requestDate: getLocalDateOnly(),
        lastWorkingDate: formData.lastWorkingDate,
        remarks: formData.remark,
      });

      if (response.clearance) {
        setRequests((current) => [response.clearance, ...current]);
        setMessage('Clearance request submitted successfully.');
        setFormData({
          clearanceReason: separationTypes[0] || '',
          reason: '',
          remark: '',
          lastWorkingDate: getLocalDateOnly(),
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
  const isHRReturnedRequest = isReturnedRequest
    && (currentRequest?.initialHRStatus === 'Returned' || /^hr officer$/i.test(String(currentRequest?.returnedOffice || '')));
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
    if (isHRReturnedRequest) {
      const clearanceType = returnedForm.clearanceType
        || currentRequest.clearanceType
        || currentRequest.clearanceReason
        || currentRequest.type
        || 'Resignation';
      const requestDate = String(currentRequest.requestDate || currentRequest.createdAt || '').slice(0, 10);
      if (!clearanceType.trim()) {
        setError('Select a clearance type before resubmitting your request.');
        return;
      }
      if (!returnedForm.reason.trim()) {
        setError('Please enter the reason for your clearance request.');
        return;
      }
      if (!returnedForm.lastWorkingDate || (requestDate && returnedForm.lastWorkingDate < requestDate)) {
        setError('Last working date cannot be earlier than the request date.');
        return;
      }
      if (returnedForm.relievingDate && returnedForm.lastWorkingDate > returnedForm.relievingDate) {
        setError('Last working date cannot be after relieving date.');
        return;
      }
    }
    setResubmitting(true);
    setError('');
    try {
      const response = await updateClearance(clearanceId, {
        resubmitted: true,
        resolutionRemark: resolutionRemark.trim(),
        ...(isHRReturnedRequest ? {
          clearanceType: returnedForm.clearanceType || currentRequest.clearanceType || currentRequest.clearanceReason || currentRequest.type || 'Resignation',
          reason: returnedForm.reason.trim(),
          lastWorkingDate: returnedForm.lastWorkingDate,
          relievingDate: returnedForm.relievingDate,
          remarks: returnedForm.remark,
        } : {}),
      });
      if (response.clearance) {
        setRequests((current) => current.map((request) => request._id === response.clearance._id ? response.clearance : request));
        setResolutionRemark('');
        setResolving(false);
        setMessage(isHRReturnedRequest
          ? 'Your corrected request has been resubmitted to HR for review.'
          : 'Your request has been resubmitted for clearance review.');
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
                <select name="clearanceReason" value={formData.clearanceReason} onChange={handleInputChange} required disabled={loadingSeparationTypes || separationTypes.length === 0} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:border-blue-500 disabled:bg-slate-100">
                  <option value="">{loadingSeparationTypes ? 'Loading clearance types...' : 'Select Clearance Type'}</option>
                  {separationTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                {!loadingSeparationTypes && separationTypes.length === 0 && <p className="mt-1 text-[11px] text-amber-700">No active clearance types are available. Please contact HR.</p>}
              </div>

              <div>
                <label className="mb-2 block text-[12px] font-semibold text-slate-700">Reason <span className="text-red-500">*</span></label>
                <textarea name="reason" value={formData.reason} onChange={handleInputChange} rows={3} required className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:border-blue-500" placeholder="Explain your reason for requesting clearance." />
              </div>

              <div>
                <label className="mb-2 block text-[12px] font-semibold text-slate-700">Last Working Date <span className="text-red-500">*</span></label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="date" name="lastWorkingDate" min={getLocalDateOnly()} value={formData.lastWorkingDate} onChange={handleInputChange} required className="w-full rounded-md border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:border-blue-500" />
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
                        <button type="button" onClick={() => {
                          setSelectedRequestId(request.requestId);
                          setResolving(false);
                          setResolutionRemark('');
                          setReturnedForm({
                            clearanceType: request.clearanceType || request.clearanceReason || request.type || 'Resignation',
                            reason: request.reason || '',
                            lastWorkingDate: String(request.lastWorkingDate || '').slice(0, 10),
                            relievingDate: String(request.relievingDate || '').slice(0, 10),
                            remark: request.remarks || '',
                          });
                          setError('');
                        }} className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-700 hover:bg-blue-100">
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
                      <span className="font-semibold text-slate-800">{currentRequest?.returnedBy || currentRequest?.financeReviewedBy ? `${currentRequest.returnedOffice || 'Returning Officer'}: ${currentRequest.returnedBy || currentRequest.financeReviewedBy}` : (returnedStep?.clearedBy || returnedStep?.office || '-')}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
                      <span className="font-medium text-slate-500">Returned Date</span>
                      <span className="font-semibold text-slate-800">{formatReturnedDate(currentRequest?.returnedAt || returnedStep?.updatedAt)}</span>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-slate-500">Reason</p>
                      <p className="rounded-md border border-red-200 bg-red-50 p-2 text-red-700">{currentRequest?.returnedReason || progressInfo.returnReason || returnedStep?.returnReason || returnedStep?.comment || currentRequest?.returnReason || currentRequest?.financeRemarks || 'No return reason provided.'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-slate-500">HR Remark</p>
                      <p className="text-slate-600">{currentRequest?.returnedRemark || currentRequest?.initialHRRemarks || currentRequest?.officerComment || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-slate-500">Affected Field</p>
                      <p className="text-slate-600">{currentRequest?.affectedField || '-'}</p>
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
                      {isHRReturnedRequest ? 'Edit Returned Request' : 'Resolve Issue'}
                    </button>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {isHRReturnedRequest && (
                        <div className="space-y-3 rounded-lg border border-amber-200 bg-white p-3">
                          <p className="text-[12px] font-semibold text-slate-700">Correct your request information</p>
                          <label className="block text-[12px] font-semibold text-slate-700">
                            Clearance Type
                            <select
                              value={returnedForm.clearanceType || currentRequest.clearanceType || currentRequest.clearanceReason || currentRequest.type || 'Resignation'}
                              onChange={(event) => setReturnedForm((current) => ({ ...current, clearanceType: event.target.value }))}
                              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] font-normal outline-none focus:border-blue-500"
                            >
                              {!separationTypes.includes(returnedForm.clearanceType || currentRequest.clearanceType || currentRequest.clearanceReason || currentRequest.type || 'Resignation') && (
                                <option value={returnedForm.clearanceType || currentRequest.clearanceType || currentRequest.clearanceReason || currentRequest.type || 'Resignation'}>
                                  {returnedForm.clearanceType || currentRequest.clearanceType || currentRequest.clearanceReason || currentRequest.type || 'Resignation'}
                                </option>
                              )}
                              {separationTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                            </select>
                          </label>
                          <label className="block text-[12px] font-semibold text-slate-700">
                            Reason
                            <textarea
                              value={returnedForm.reason}
                              onChange={(event) => setReturnedForm((current) => ({ ...current, reason: event.target.value }))}
                              rows={3}
                              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] font-normal outline-none focus:border-blue-500"
                            />
                          </label>
                          <label className="block text-[12px] font-semibold text-slate-700">
                            Last Working Date
                            <input
                              type="date"
                              min={String(currentRequest?.requestDate || currentRequest?.createdAt || '').slice(0, 10)}
                              value={returnedForm.lastWorkingDate}
                              onChange={(event) => setReturnedForm((current) => ({ ...current, lastWorkingDate: event.target.value }))}
                              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] font-normal outline-none focus:border-blue-500"
                            />
                          </label>
                          <label className="block text-[12px] font-semibold text-slate-700">
                            Relieving Date (Optional)
                            <input
                              type="date"
                              min={returnedForm.lastWorkingDate || String(currentRequest?.requestDate || currentRequest?.createdAt || '').slice(0, 10)}
                              value={returnedForm.relievingDate}
                              onChange={(event) => setReturnedForm((current) => ({ ...current, relievingDate: event.target.value }))}
                              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] font-normal outline-none focus:border-blue-500"
                            />
                          </label>
                          <label className="block text-[12px] font-semibold text-slate-700">
                            Additional Remark (Optional)
                            <textarea
                              value={returnedForm.remark}
                              onChange={(event) => setReturnedForm((current) => ({ ...current, remark: event.target.value }))}
                              rows={2}
                              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] font-normal outline-none focus:border-blue-500"
                            />
                          </label>
                        </div>
                      )}
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