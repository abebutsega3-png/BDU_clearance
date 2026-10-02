import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  User,
  FileText,
  BookCheck,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Play,
  RotateCcw,
  History,
  ClipboardCheck
} from 'lucide-react';

const libraryChecklistItems = [
  'Borrowed books and circulation records',
  'Unreturned or overdue materials',
  'Outstanding fines and charges',
  'Lost or damaged materials',
  'Library account and other obligations',
];

const createLibraryChecklist = (savedItems) => libraryChecklistItems.map((item) => {
  const savedChecklist = Array.isArray(savedItems) ? savedItems : [];
  const saved = savedChecklist.find((entry) => entry.item === item);
  return { item, status: ['Cleared', 'Pending', 'N/A'].includes(saved?.status) ? saved.status : 'Pending', note: saved?.note || '' };
});

export default function LibraryClearanceViewModal({ requestId, onClose, onRefresh }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [libraryRecords, setLibraryRecords] = useState([]);
  const [libraryChecklist, setLibraryChecklist] = useState(createLibraryChecklist());
  const [showChecklist, setShowChecklist] = useState(false);
  const checklistRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [verificationResult, setVerificationResult] = useState('Clear');
  const [comment, setComment] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const headers = { Authorization: `Bearer ${localStorage.getItem('token') || ''}` };

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:3000/api/clearance/${requestId}`, { headers });
      const request = res.data?.clearance || res.data;
      if (!request?._id && !request?.requestId) throw new Error('Clearance request details were not returned.');
      setData(request);
      setLibraryChecklist(createLibraryChecklist(request.libraryChecklist));
      if (request.employeeId) {
        const recordsResponse = await axios.get('http://localhost:3000/api/library/records', {
          params: { employeeId: request.employeeId },
          headers,
        });
        setLibraryRecords(recordsResponse.data.records || []);
      } else {
        setLibraryRecords([]);
      }
      setVerificationResult(request.libraryVerificationResult || request.verificationResult || 'Clear');
      if (request.libraryComment || request.comment) setComment(request.libraryComment || request.comment);
      if (request.libraryReturnReason || request.returnReason || request.remarks) setReturnReason(request.libraryReturnReason || request.returnReason || request.remarks);
      if (request.employeeId) {
        const employees = await axios.get('http://localhost:3000/api/employee', { headers });
        setEmployee((employees.data.employees || []).find((item) => item.employeeId === request.employeeId) || null);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Unable to load clearance request.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (requestId) fetchDetails();
  }, [requestId]);

  // Action Handlers
  const handleStartReview = async () => {
    setErrorMsg('');
    try {
      const identifier = data._id || data.requestId;
      const response = await axios.put(`http://localhost:3000/api/clearance/${identifier}`, { libraryDecision: { status: 'In Progress' } }, { headers });
      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to start library review.');
      await fetchDetails();
      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Unable to start library review.');
    }
  };

  const handleApprove = async () => {
    if (!checklistComplete) {
      setErrorMsg('Resolve every Library checklist item as Cleared or N/A before approving.');
      return;
    }
    const borrowedItemsClear = (data.borrowedItemsStatus || (data.outstandingItems?.length ? 'Not Clear' : 'Clear')) === 'Clear';
    const fineClear = Number(data.outstandingFineAmount || 0) <= 0;
    const obligationsClear = (data.otherObligationsStatus || (data.outstandingItems?.length ? 'Not Clear' : 'None')) === 'None';
    if (verificationResult !== 'Clear' || !borrowedItemsClear || !fineClear || !obligationsClear) {
      setErrorMsg('Clear all library obligations before approving the clearance.');
      return;
    }
    setErrorMsg('');
    try {
      await axios.put(`http://localhost:3000/api/clearance/${data._id}`, { libraryChecklist, libraryDecision: { status: 'Completed', verificationResult: 'Clear', comment: comment || 'No outstanding library obligations.' } }, { headers });
      fetchDetails();
      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Unable to approve clearance.');
    }
  };

  const handleReturn = async () => {
    if (!returnReason.trim()) {
      setErrorMsg('Return reason is required.');
      return;
    }
    setErrorMsg('');
    try {
      await axios.put(`http://localhost:3000/api/clearance/${data._id}`, { libraryChecklist, libraryDecision: { status: 'Rejected', verificationResult: 'Not Clear', returnReason } }, { headers });
      fetchDetails();
      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Unable to return request.');
    }
  };

  const handleReviewAgain = async () => {
    try {
      await axios.put(`http://localhost:3000/api/clearance/${data._id}`, { libraryDecision: { status: 'In Progress' } }, { headers });
      fetchDetails();
      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Unable to start review.');
    }
  };

  const openEmployeeLibraryRecords = () => {
    const employeeId = data?.employeeId || '';
    const query = employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : '';
    onClose();
    navigate(`/library-office/library-records${query}`);
  };
  const openLibraryChecklist = () => {
    if (!showChecklist) checklistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setShowChecklist((visible) => !visible);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-center items-center">
        <div className="bg-white p-6 rounded-xl text-slate-600 font-semibold text-xs">Loading request details...</div>
      </div>
    );
  }

  if (!data) return null;
  const libraryStatus = data.libraryStatus || data.status;
  const materials = [
    ...(Array.isArray(data.materials) ? data.materials : []),
    ...libraryRecords.flatMap((record) => Array.isArray(record.materials) ? record.materials : []),
  ];
  const materialCounts = {
    borrowed: materials.filter((item) => item.status === 'Borrowed').length,
    outstanding: materials.filter((item) => item.status === 'Outstanding').length,
    overdue: materials.filter((item) => item.status === 'Overdue').length,
    returned: materials.filter((item) => item.status === 'Returned').length,
  };
  const outstandingMaterials = materials.filter((item) => ['Outstanding', 'Overdue'].includes(item.status));
  const hasOutstanding = outstandingMaterials.length > 0
    || data.borrowedItemsStatus === 'Not Clear'
    || Number(data.outstandingFineAmount || 0) > 0
    || data.otherObligationsStatus === 'Pending';
  const checklistComplete = libraryChecklist.length === libraryChecklistItems.length
    && libraryChecklist.every((item) => item.status !== 'Pending');

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 overflow-y-auto p-4 md:p-6 text-xs text-slate-700">
      <div className="max-w-4xl mx-auto space-y-4 my-6">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3">
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-base font-bold text-slate-900">Clearance Request Details</h1>
              <p className="text-[11px] text-slate-500">Request ID: {data.requestId}</p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
              libraryStatus === 'Completed'
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                : libraryStatus === 'Rejected'
                ? 'bg-red-50 text-red-600 border-red-200'
                : libraryStatus === 'In Progress'
                ? 'bg-blue-50 text-blue-600 border-blue-200'
                : 'bg-amber-50 text-amber-600 border-amber-200'
            }`}
          >
            {libraryStatus === 'In Progress' ? 'Under Review' : libraryStatus === 'Completed' ? 'Approved' : libraryStatus === 'Rejected' ? 'Returned' : libraryStatus}
          </span>
        </div>

        {/* 1. Employee Info & 2. Request Info */}
        <div className="space-y-4">
          
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2 text-slate-900 font-bold">
              <User size={16} className="text-teal-700" />
              <h2>Employee Information</h2>
            </div>
            <div className="grid grid-cols-1 gap-y-2 text-[11px] sm:grid-cols-2 sm:gap-x-8">
              <span className="text-slate-400">Employee ID:</span>
              <span className="font-semibold text-slate-800">{employee?.employeeId || data.employeeId || '-'}</span>
              <span className="text-slate-400">Full Name:</span>
              <span className="font-semibold text-slate-800">{employee?.fullName || data.employeeName || '-'}</span>
              <span className="text-slate-400">Department:</span>
              <span className="font-semibold text-slate-800">{employee?.department || data.department?.name || data.department || '-'}</span>
              <span className="text-slate-400">Position:</span>
              <span className="font-semibold text-slate-800">{employee?.position || data.position || '-'}</span>
              <span className="text-slate-400">Campus:</span>
              <span className="font-semibold text-slate-800">{employee?.campus || data.campus || '-'}</span>
              <span className="text-slate-400">Reason:</span>
              <span className="font-semibold text-slate-800">{data.reason || data.clearanceReason || data.clearanceType || '-'}</span>
              <span className="text-slate-400">Employment Type:</span>
              <span className="font-semibold text-slate-800">{employee?.employmentType || data.employmentType || '-'}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2 text-slate-900 font-bold">
              <FileText size={16} className="text-teal-700" />
              <h2>Request Information</h2>
            </div>
            <div className="grid grid-cols-1 gap-y-2 text-[11px] sm:grid-cols-2 sm:gap-x-8">
              <span className="text-slate-400">Request ID:</span>
              <span className="font-semibold text-blue-600">{data.requestId}</span>
              <span className="text-slate-400">Request Date:</span>
              <span className="font-semibold text-slate-800">
                {new Date(data.submittedDate || data.requestDate || data.createdAt).toLocaleDateString('en-GB')}
              </span>
              <span className="text-slate-400">Current Status:</span>
              <span className="font-semibold text-slate-800">{libraryStatus === 'In Progress' ? 'Under Review' : libraryStatus === 'Completed' ? 'Approved' : libraryStatus === 'Rejected' ? 'Returned' : libraryStatus}</span>
            </div>
          </div>

        </div>

        {/* 3. Library Verification & Records */}
        <div ref={checklistRef} className="scroll-mt-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2 text-slate-900 font-bold">
            <BookCheck size={16} className="text-teal-700" />
            <h2>Library Verification &amp; Records</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[['Borrowed', materialCounts.borrowed], ['Outstanding', materialCounts.outstanding], ['Overdue', materialCounts.overdue], ['Returned', materialCounts.returned]].map(([label, count]) => <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase text-slate-400">{label}</p><p className="mt-1 text-lg font-bold text-slate-800">{count}</p></div>)}
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="min-w-[650px] w-full text-left text-[11px]"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-2.5">Material</th><th className="p-2.5">Material ID</th><th className="p-2.5">Borrow Date</th><th className="p-2.5">Due Date</th><th className="p-2.5">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{materials.length === 0 ? <tr><td colSpan="5" className="p-5 text-center text-slate-400">No library materials found for this employee.</td></tr> : materials.map((item) => <tr key={item._id || item.materialId} className="hover:bg-slate-50"><td className="p-2.5 font-semibold text-slate-800">{item.title || item.materialTitle || 'Library material'}</td><td className="p-2.5 font-mono text-slate-600">{item.materialId || '-'}</td><td className="p-2.5">{item.borrowDate ? new Date(item.borrowDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}</td><td className="p-2.5">{item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}</td><td className="p-2.5"><span className={`rounded px-2 py-1 text-[10px] font-semibold ${item.status === 'Returned' ? 'bg-emerald-50 text-emerald-700' : item.status === 'Overdue' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{item.status || 'Borrowed'}</span></td></tr>)}</tbody></table></div>
          {hasOutstanding && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800"><p className="font-bold">Outstanding Library Material Found</p><p className="mt-1 text-[11px]">{outstandingMaterials[0]?.title || 'Employee has an outstanding library material.'}{outstandingMaterials[0]?.materialId ? ` (${outstandingMaterials[0].materialId})` : ''}</p></div>}

        {showChecklist && <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 font-bold text-slate-900"><ClipboardCheck size={16} className="text-teal-700" /><h2>Library Clearance Checklist</h2></div>
            <span className={`text-[11px] font-semibold ${checklistComplete ? 'text-emerald-700' : 'text-amber-700'}`}>
              {libraryChecklist.filter((item) => item.status !== 'Pending').length} / {libraryChecklist.length} complete
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Verify each Library obligation before approving the request.</p>
          <div className="space-y-2">
            {libraryChecklist.map((item) => <div key={item.item} className="grid gap-2 rounded-lg border border-slate-100 p-3 sm:grid-cols-[minmax(0,1fr)_105px] sm:items-center">
              <span className="min-w-0 font-medium text-slate-800">{item.item}</span>
              <select aria-label={`${item.item} status`} value={item.status} disabled={!['In Progress', 'Under Review'].includes(libraryStatus)} onChange={(event) => setLibraryChecklist((current) => current.map((entry) => entry.item === item.item ? { ...entry, status: event.target.value } : entry))} className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold outline-none focus:border-teal-600 disabled:bg-slate-100">
                <option>Pending</option><option>Cleared</option><option>N/A</option>
              </select>
              <input aria-label={`${item.item} note`} value={item.note} disabled={!['In Progress', 'Under Review'].includes(libraryStatus)} onChange={(event) => setLibraryChecklist((current) => current.map((entry) => entry.item === item.item ? { ...entry, note: event.target.value } : entry))} placeholder="Note (optional)" className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] outline-none focus:border-teal-600 disabled:bg-slate-100 sm:col-span-2" />
            </div>)}
          </div>
          {(libraryStatus === 'In Progress' || libraryStatus === 'Under Review') && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
              <button type="button" onClick={handleReturn} className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-md border border-rose-300 bg-white px-4 py-2.5 font-semibold text-rose-700 hover:bg-rose-50"><RotateCcw size={14} /> Return Request</button>
              {!hasOutstanding && <button type="button" onClick={handleApprove} disabled={!checklistComplete} className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 size={14} /> Approve Clearance</button>}
            </div>
          )}
        </div>}
        </div>

        {/* 4. Decision & Actions Dynamic Section */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Library Officer Decision</h2>
          <p className="text-[11px] text-slate-500">Review the employee's Library records and checklist. Approve when obligations are cleared; if there are issues, explain them in the return reason.</p>

          {/* STATUS: Pending -> ACTION: Start Review */}
          {libraryStatus === 'Pending' && (
            <>
              <div className="flex justify-between items-center bg-amber-50 p-4 rounded-lg border border-amber-200">
              <span className="text-amber-800 font-semibold">Status: Pending — Click to start reviewing process.</span>
              <button
                onClick={handleStartReview}
                className="bg-teal-700 hover:bg-teal-800 text-white font-bold px-4 py-2 rounded-lg flex items-center space-x-1.5"
              >
                <Play size={14} />
                <span>Start Review</span>
              </button>
              </div>
              {errorMsg && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-[11px] text-red-700">{errorMsg}</p>}
            </>
          )}

          {/* STATUS: Under Review -> ACTIONS: Approve Clearance OR Return Request */}
          {(libraryStatus === 'In Progress' || libraryStatus === 'Under Review') && (
            <div className="space-y-4">
              <label className="block font-bold text-slate-700 mb-1">Comment (Optional)
                <textarea rows={3} placeholder={hasOutstanding ? 'Employee has an outstanding library material. Please return it before clearance.' : 'No outstanding library obligations.'} value={comment} onChange={(e) => setComment(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-teal-600" />
              </label>
              <label className="block font-bold text-slate-700 mb-1">Return Reason <span className="text-red-500">*</span>
                <textarea rows={2} placeholder="Employee has an outstanding library obligation." value={returnReason} onChange={(e) => setReturnReason(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-red-500" />
              </label>
              {errorMsg && <p className="text-red-500 text-[11px]">{errorMsg}</p>}
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
                <div><span className="text-slate-400 font-semibold">Current State:</span> <span className="font-bold text-blue-700">Under Review</span></div>
              </div>
            </div>
          )}

          {/* STATUS: Approved -> ACTION: View History */}
          {libraryStatus === 'Completed' && (
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-bold text-emerald-800">Status: Approved</p>
                {(data.libraryComment || data.comment) && <p className="text-slate-600 mt-1"><span className="font-semibold">Comment:</span> {data.libraryComment || data.comment}</p>}
              </div>
              <button
                onClick={() => setShowHistory((visible) => !visible)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-4 py-2 rounded-lg flex items-center space-x-1.5"
              >
                <History size={14} />
                <span>{showHistory ? 'Hide History' : 'View History'}</span>
              </button>
            </div>
          )}

          {showHistory && libraryStatus === 'Completed' && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-bold text-slate-800">Clearance History</h3>
              <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-3">
                <div><p className="text-slate-400">Submitted</p><p className="font-semibold text-slate-700">{new Date(data.submittedDate || data.requestDate || data.createdAt).toLocaleDateString('en-US')}</p></div>
                <div><p className="text-slate-400">Reviewed</p><p className="font-semibold text-slate-700">{new Date(data.updatedAt || data.createdAt).toLocaleDateString('en-US')}</p></div>
                <div><p className="text-slate-400">Decision</p><p className="font-semibold text-emerald-700">Library clearance approved</p></div>
              </div>
              <p className="mt-3 text-[11px] text-slate-600"><span className="font-semibold">Comment:</span> {data.libraryComment || data.comment || 'No outstanding library obligations.'}</p>
            </div>
          )}

          {/* STATUS: Returned -> ACTION: Review Again */}
          {libraryStatus === 'Rejected' && (
            <div className="p-4 bg-red-50/60 border border-red-200 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-bold text-red-800">Status: Returned</p>
                {(data.returnReason || data.remarks) && <p className="text-red-600 mt-1"><span className="font-semibold">Reason:</span> {data.returnReason || data.remarks}</p>}
              </div>
              <button
                onClick={handleReviewAgain}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg flex items-center space-x-1.5"
              >
                <RotateCcw size={14} />
                <span>Review Again</span>
              </button>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={openEmployeeLibraryRecords} className="inline-flex min-h-12 min-w-[190px] items-center justify-center rounded-md border border-teal-200 bg-teal-50 px-4 py-2.5 text-center font-semibold text-teal-700 hover:bg-teal-100">Employee Library Records</button>
            <button type="button" onClick={openLibraryChecklist} aria-expanded={showChecklist} className="inline-flex min-h-12 min-w-[160px] items-center justify-center rounded-md border border-rose-300 bg-white px-4 py-2.5 font-semibold text-rose-700 hover:bg-rose-50">{showChecklist ? 'Close Checklist' : 'Open Checklist'}</button>
            <button type="button" onClick={onClose} className="inline-flex min-h-12 min-w-[110px] items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50">Close</button>
          </div>
        </div>

      </div>
    </div>
  );
}