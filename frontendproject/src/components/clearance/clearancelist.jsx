import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, Filter, Plus, Search, X } from 'lucide-react';
import { fetchClearances, updateClearance } from '../../until/clearanceHelper';
import { HRTranslatedView, useOptionalHRLanguage } from '../hrofficedashboared/HRLanguage';

const ClearanceRequests = () => {
  const { t } = useOptionalHRLanguage();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All Status');
  const [department, setDepartment] = useState('All Department');
  const [campus, setCampus] = useState('All Campus');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [resolutionRemark, setResolutionRemark] = useState('');
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitError, setResubmitError] = useState('');
  const [resubmitNotice, setResubmitNotice] = useState('');
  const navigate = useNavigate();
  const { pathname, search: locationSearch } = useLocation();
  const routePrefix = pathname.startsWith('/hr-office') ? '/hr-office' : '/admin';

  const nameOf = (item) => item.employee?.fullName || item.employeeName || item.employee || 'Unknown employee';
  const departmentOf = (item) => item.department?.name || item.department || '-';
  const campusOf = (item) => item.campus || item.employee?.campus || '-';
  const statusOf = (item) => {
    const requestStatus = String(item.status || '').trim();
    if (['Returned', 'Rejected', 'Completed', 'Cancelled'].includes(requestStatus)) return requestStatus;
    if (item.initialHRStatus === 'Under Review' && item.initialHRAssessmentCompleted === true) {
      return 'Ready for Office Assignment';
    }
    if (item.initialHRStatus === 'Approved') return requestStatus || item.initialHRStatus;
    return item.initialHRStatus || requestStatus || 'Pending';
  };
  const departments = [...new Set(requests.map((item) => item.department?.name || item.department?.departmentName || item.department).filter((value) => typeof value === 'string' && value))];
  const campuses = [...new Set(requests.map((item) => item.campus || item.employee?.campus).filter(Boolean))];
  const filteredRequests = requests.filter((item) => {
    const query = search.toLowerCase();
    return (!query || `${nameOf(item)} ${item.employeeId || item.employee?.employeeId || ''}`.toLowerCase().includes(query))
      && (status === 'All Status' || statusOf(item) === status)
      && (department === 'All Department' || departmentOf(item) === department)
      && (campus === 'All Campus' || campusOf(item) === campus);
  });
  const statusStyle = { Pending: 'bg-amber-50 text-amber-700', 'Under Review': 'bg-blue-50 text-blue-700', 'Ready for Office Assignment': 'bg-blue-50 text-blue-700', 'In Progress': 'bg-blue-50 text-blue-700', Approved: 'bg-emerald-50 text-emerald-700', Completed: 'bg-emerald-50 text-emerald-700', Returned: 'bg-red-50 text-red-700', Rejected: 'bg-red-50 text-red-700' };

  const getOfficeStatus = (request, fieldNames, officeNames) => {
    let fieldStatus = '';
    for (const fieldName of fieldNames) {
      const value = fieldName.split('.').reduce((current, key) => current?.[key], request);
      const statusValue = typeof value === 'object' ? value?.status : value;
      if (statusValue && String(statusValue).toLowerCase() !== 'pending') return statusValue;
      if (statusValue) fieldStatus = statusValue;
    }

    const rows = [
      ...(Array.isArray(request.workflow) ? request.workflow : []),
      ...(Array.isArray(request.departmentClearances) ? request.departmentClearances : []),
    ];
    const matchingRows = rows.filter((row) => {
      const officeName = String(row.office || row.name || row.department || '').toLowerCase();
      return officeNames.some((name) => officeName.includes(name));
    });
    const row = [...matchingRows].reverse().find((candidate) => (
      candidate.status && !['pending', ''].includes(String(candidate.status).toLowerCase())
    )) || matchingRows[matchingRows.length - 1];

    return row?.status || fieldStatus || 'Pending';
  };

  const progressItems = (request) => [
    {
      label: 'HR Assessment',
      status: request.initialHRStatus || 'Pending',
    },
    {
      label: 'Finance',
      status: getOfficeStatus(request, ['financeStatus'], ['finance']),
    },
    {
      label: 'IT',
      status: getOfficeStatus(request, ['ictStatus', 'ictClearance.status'], ['ict', 'information technology']),
    },
    {
      label: 'Administration',
      status: getOfficeStatus(request, ['administrationStatus', 'departmentStatus'], ['administration', 'department head']),
    },
    {
      label: 'Procurement',
      status: getOfficeStatus(request, ['procurementStatus', 'propertyStatus'], ['procurement', 'property', 'asset']),
    },
    {
      label: 'HR Final Review',
      status: request.finalHRStatus || (request.finalHRApproval ? 'Approved' : 'Pending'),
    },
  ];

  const ProgressStatus = ({ children }) => {
    const normalized = String(children || 'Pending').toLowerCase();
    const classes = ['approved', 'completed', 'cleared'].includes(normalized)
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : ['under review', 'in progress'].includes(normalized)
        ? 'border-blue-200 bg-blue-50 text-blue-700'
        : ['returned', 'rejected'].includes(normalized)
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-amber-200 bg-amber-50 text-amber-700';

    return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${classes}`}>{children}</span>;
  };

  const openRequest = useCallback(async (request) => {
    const requestId = request.requestId || request._id;
    if (!requestId) return;
    setDetailLoading(true);
    setResolutionRemark('');
    setResubmitError('');
    setResubmitNotice('');
    try {
      const { data } = await axios.get(`http://localhost:3000/api/hr-final-clearance/clearance/${requestId}`);
      const loadedRequest = data?.clearance || request;
      setSelectedRequest(loadedRequest);
    } catch (requestError) {
      console.error('Unable to load clearance details:', requestError);
      setSelectedRequest(request);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleHRResubmission = async () => {
    const requestId = selectedRequest?.requestId || selectedRequest?._id;
    const resolution = resolutionRemark.trim();
    if (!requestId || !resolution) {
      setResubmitError('Enter how the returned issue was resolved before resubmitting.');
      return;
    }

    setResubmitting(true);
    setResubmitError('');
    setResubmitNotice('');
    try {
      const response = await updateClearance(requestId, {
        resubmitted: true,
        resolutionRemark: resolution,
      });
      const updatedClearance = response?.clearance;
      if (!response?.success || !updatedClearance) {
        throw new Error(response?.message || 'The returned request was not resubmitted.');
      }
      setSelectedRequest(updatedClearance);
      setResubmitNotice('Issue resolution recorded. The request has been sent back to the responsible clearance office.');
      setRequests(await fetchClearances());
    } catch (resubmitFailure) {
      setResubmitError(resubmitFailure.response?.data?.message || resubmitFailure.message || 'Unable to resubmit this request.');
    } finally {
      setResubmitting(false);
    }
  };

  useEffect(() => {
    fetchClearances().then((clearanceRows) => {
      const loadedRequests = Array.isArray(clearanceRows) ? clearanceRows : [];
      setRequests(loadedRequests);
      const requestId = new URLSearchParams(locationSearch).get('requestId');
      const requestedClearance = loadedRequests.find((item) => (item.requestId || item._id) === requestId);
      if (requestedClearance) {
        navigate(pathname, { replace: true });
        openRequest(requestedClearance);
      }
    }).catch((requestError) => {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to load clearance requests.');
    }).finally(() => {
      setLoading(false);
    });
  }, [locationSearch, navigate, openRequest, pathname]);

  return (
    <HRTranslatedView>
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div><p className="text-xs text-slate-500">Dashboard <span className="px-1">/</span> Clearance Requests <span className="px-1">/</span> All Requests</p><h1 className="mt-2 text-xl font-bold text-[#10254b]">Clearance Requests</h1></div>
        <button type="button" onClick={() => navigate(`${routePrefix}/add-clearance`)} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"><Plus className="h-4 w-4" />Create Request</button>
      </div>
      <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-5">
          <label className="relative flex items-center"><Search className="absolute left-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search by employee name or ID..." className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-blue-500" /></label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 outline-none"><option>All Status</option><option>Pending</option><option>Under Review</option><option>Ready for Office Assignment</option><option>In Progress</option><option>Approved</option><option>Returned</option><option>Completed</option><option>Rejected</option></select>
          <select value={department} onChange={(event) => setDepartment(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 outline-none"><option>All Department</option>{departments.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={campus} onChange={(event) => setCampus(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 outline-none"><option>All Campus</option>{campuses.map((item) => <option key={item}>{item}</option>)}</select>
          <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"><Filter className="h-4 w-4" />Filter</button>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs"><thead className="border-y border-slate-100 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-3">#</th><th className="px-3 py-3">Employee</th><th className="px-3 py-3">Employee ID</th><th className="px-3 py-3">Department</th><th className="px-3 py-3">Campus</th><th className="px-3 py-3">Request Date</th><th className="px-3 py-3">Last Working Date</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan="9" className="py-10 text-center text-slate-400">Loading clearance requests...</td></tr> : error ? <tr><td colSpan="9" className="py-10 text-center text-red-500">{error}</td></tr> : filteredRequests.length === 0 ? <tr><td colSpan="9" className="py-10 text-center text-slate-400">No clearance requests found.</td></tr> : filteredRequests.map((item, index) => {
          const needsOfficeAssignment = item.initialHRStatus === 'Under Review'
            && item.initialHRAssessmentCompleted === true
            && item.status !== 'Returned'
            && item.status !== 'Rejected';
          const needsInitialReview = ['Pending', 'Under Review'].includes(item.initialHRStatus || item.status)
            && item.initialHRAssessmentCompleted !== true
            && item.status !== 'Returned'
            && item.status !== 'Rejected';
          const actionLabel = routePrefix === '/hr-office'
            ? needsOfficeAssignment ? 'Assign Offices' : needsInitialReview ? 'Review' : 'View'
            : 'View';
          return <tr key={item._id || item.requestId || index} className="text-slate-600 hover:bg-slate-50"><td className="px-3 py-3">{index + 1}</td><td className="px-3 py-3 font-semibold text-slate-800">{nameOf(item)}{item.requestSource === 'HR Officer' && <span className="mt-1 block text-[9px] font-medium text-blue-700">HR initiated · {item.initiatedByName || 'HR Officer'}</span>}</td><td className="px-3 py-3">{item.employeeId || item.employee?.employeeId || '-'}</td><td className="px-3 py-3">{departmentOf(item)}</td><td className="px-3 py-3">{campusOf(item)}</td><td className="px-3 py-3">{item.requestDate || item.date || '-'}</td><td className="px-3 py-3">{item.lastWorkingDate || '-'}</td><td className="px-3 py-3"><span className={`rounded px-2 py-1 text-[10px] ${statusStyle[statusOf(item)] || 'bg-slate-100 text-slate-600'}`}>{t(statusOf(item))}</span></td><td className="px-3 py-3 text-right"><button type="button" onClick={() => {
            if (routePrefix === '/hr-office' && needsOfficeAssignment) {
              navigate('/hr-office/hr-workflow');
              return;
            }
            if (routePrefix === '/hr-office' && needsInitialReview) {
              navigate(`/hr-office/assessment/${encodeURIComponent(item.requestId || item._id)}`);
              return;
            }
            openRequest(item);
          }} className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100"><Eye className="h-3 w-3" />{actionLabel}</button></td></tr>;
        })}</tbody></table></div>
      </section>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl" role="dialog" aria-modal="true">
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div><h2 className="text-base font-bold text-slate-900">Clearance Request Details</h2><p className="text-[11px] text-slate-500">Review employee clearance request</p></div>
              <button type="button" onClick={() => setSelectedRequest(null)} aria-label="Close request details" className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </header>
            {detailLoading ? <p className="p-10 text-center text-xs text-slate-500">Loading request details...</p> : (
              <div className="space-y-4 p-5">
                <section className="rounded-lg border border-slate-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-bold text-slate-900">Employee Information</h3>
                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    <Detail label="Employee ID" value={selectedRequest.employeeId || selectedRequest.employee?.employeeId || '-'} />
                    <Detail label="Full Name" value={selectedRequest.employee?.fullName || nameOf(selectedRequest)} />
                    <Detail label="Department" value={departmentOf(selectedRequest)} />
                    <Detail label="Position" value={selectedRequest.employee?.position || selectedRequest.position || '-'} />
                    <Detail label="Campus" value={campusOf(selectedRequest)} />
                    <Detail label="Employment Status" value={selectedRequest.employee?.status || selectedRequest.employmentStatus || '-'} />
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-bold text-slate-900">Request Information</h3>
                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    <Detail label="Request ID" value={selectedRequest.requestId || selectedRequest._id || '-'} />
                    <Detail label="Clearance Type" value={selectedRequest.clearanceType || selectedRequest.clearanceReason || '-'} />
                    <Detail label="Reason" value={selectedRequest.reason || selectedRequest.clearanceReason || '-'} />
                    <Detail label="Request Date" value={selectedRequest.requestDate || selectedRequest.createdAt || '-'} />
                    <Detail label="Last Working Date" value={selectedRequest.lastWorkingDate || selectedRequest.expectedLastWorkingDate || '-'} />
                    {selectedRequest.requestSource === 'HR Officer' && <>
                      <Detail label="Created by HR Officer" value={selectedRequest.initiatedByName || '-'} />
                      <Detail label="HR Officer User ID" value={selectedRequest.initiatedBy || '-'} />
                    </>}
                    <div>
                      <p className="text-[10px] uppercase text-slate-400">Supporting Documents</p>
                      {selectedRequest.supportingDocument || selectedRequest.documentUrl || selectedRequest.attachment ? (
                        <a
                          href={selectedRequest.supportingDocument || selectedRequest.documentUrl || selectedRequest.attachment}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs font-semibold text-blue-700 underline"
                        >
                          View attached document
                        </a>
                      ) : <p className="mt-1 text-xs font-semibold text-slate-500">No document attached</p>}
                    </div>
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-bold text-slate-900">Clearance Progress</h3>
                  <div className="divide-y divide-slate-100">
                    {progressItems(selectedRequest).map(({ label, status: progressStatus }) => (
                      <div key={label} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                        <span className="text-xs font-medium text-slate-700">{label}</span>
                        <ProgressStatus>{progressStatus}</ProgressStatus>
                      </div>
                    ))}
                  </div>
                </section>

                {routePrefix === '/hr-office' && selectedRequest.requestSource === 'HR Officer'
                  && ['Returned', 'Rejected'].includes(selectedRequest.status) && (
                    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <h3 className="text-sm font-bold text-amber-900">Returned to HR Officer</h3>
                      <p className="mt-1 text-xs text-amber-800">
                        {selectedRequest.returnedReason || selectedRequest.returnReason || 'The clearance office requires an issue to be resolved.'}
                      </p>
                      <label className="mt-3 block text-xs font-semibold text-slate-700">
                        Resolution taken *
                        <textarea
                          value={resolutionRemark}
                          onChange={(event) => { setResolutionRemark(event.target.value); setResubmitError(''); }}
                          maxLength={1000}
                          rows={3}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs outline-none focus:border-blue-500"
                          placeholder="Record how the issue was resolved with the employee."
                        />
                      </label>
                      {resubmitError && <p role="alert" className="mt-2 text-xs text-red-700">{resubmitError}</p>}
                      {resubmitNotice && <p role="status" className="mt-2 text-xs text-emerald-700">{resubmitNotice}</p>}
                      <button
                        type="button"
                        onClick={handleHRResubmission}
                        disabled={resubmitting}
                        className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-50"
                      >
                        {resubmitting ? 'Resubmitting...' : 'Mark Resolved & Resubmit'}
                      </button>
                    </section>
                  )}

                {routePrefix === '/hr-office' && selectedRequest.requestSource !== 'HR Officer' && (
                  <div className="flex justify-end border-t border-slate-200 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        const requestId = selectedRequest.requestId || selectedRequest._id;
                        if (requestId) navigate(`/hr-office/assessment/${encodeURIComponent(requestId)}`);
                      }}
                      className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      View HR Assessment
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
    </HRTranslatedView>
  );
};

function Detail({ label, value }) {
  return <div><p className="text-[10px] uppercase text-slate-400">{label}</p><p className="mt-1 text-xs font-semibold text-slate-800">{value}</p></div>;
}

export default ClearanceRequests;
