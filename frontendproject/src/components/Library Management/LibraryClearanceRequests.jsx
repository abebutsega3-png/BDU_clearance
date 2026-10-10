import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import {
  User,
  BookCheck,
  BookOpen,
  CheckCircle2,
  X,
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
const checklistSettingByItem = {
  'Borrowed books and circulation records': 'borrowedBooksChecked',
  'Unreturned or overdue materials': 'unreturnedBooksChecked',
  'Outstanding fines and charges': 'outstandingMaterialsChecked',
  'Lost or damaged materials': 'lostDamagedMaterialsChecked',
  'Library account and other obligations': 'libraryAccountChecked',
};
const DEFAULT_CLEARANCE_RULES = {
  checkUnreturnedBooks: true,
  checkOverdueBooks: true,
  checkOutstandingFines: true,
  checkLostDamagedBooks: true,
  requireChecklistCompletion: true,
};
const DEFAULT_CHECKLIST_SETTINGS = Object.fromEntries(Object.values(checklistSettingByItem).map((key) => [key, true]));

const normalizeMaterialStatus = (material) => String(material.status || material.recordStatus || '').trim().toLowerCase();
const isUnresolvedMaterial = (material) => ['borrowed', 'outstanding', 'overdue'].includes(normalizeMaterialStatus(material));
const getMaterialFineBalance = (material) => Number(material.fineBalance ?? Math.max(0, Number(material.fineAmount || 0) - Number(material.finePaidAmount || 0)));

const createLibraryChecklist = (savedItems = [], request = {}, records = [], checklistSettings = DEFAULT_CHECKLIST_SETTINGS) => {
  const savedChecklist = Array.isArray(savedItems) ? savedItems : [];
  const recordMaterials = records.flatMap((record) => Array.isArray(record.materials) ? record.materials : []);
  const materials = recordMaterials.length ? recordMaterials : (Array.isArray(request.materials) ? request.materials : []);
  const hasMaterialRecords = materials.length > 0;
  const allMaterialsReturned = materials.length > 0
    && materials.every((material) => ['returned', 'cleared', 'approved', 'completed'].includes(normalizeMaterialStatus(material)));
  const noUnresolvedMaterials = hasMaterialRecords
    ? !materials.some(isUnresolvedMaterial)
    : request.borrowedItemsStatus !== 'Not Clear' && (!Array.isArray(request.outstandingItems) || request.outstandingItems.length === 0);
  const outstandingFineAmount = Math.max(
    Number(request.outstandingFineAmount || 0),
    records.reduce((total, record) => total + Number(record.outstandingFineAmount || 0), 0),
    materials.reduce((total, material) => total + getMaterialFineBalance(material), 0),
  );
  const finesClear = outstandingFineAmount <= 0;
  const otherObligationsClear = !['Pending', 'Not Clear'].includes(request.otherObligationsStatus)
    && (!Array.isArray(request.outstandingItems) || request.outstandingItems.length === 0);
  const noLostOrDamagedMaterials = !materials.some((material) => (
    ['lost', 'damaged'].includes(normalizeMaterialStatus(material))
    || /^(lost|damaged)$/i.test(String(material.condition || material.currentCondition || '').trim())
  ));
  const resolvedItems = {
    'Borrowed books and circulation records': allMaterialsReturned || (materials.length === 0 && noUnresolvedMaterials),
    'Unreturned or overdue materials': noUnresolvedMaterials,
    'Outstanding fines and charges': finesClear,
    'Lost or damaged materials': noLostOrDamagedMaterials,
    'Library account and other obligations': otherObligationsClear,
  };

  return libraryChecklistItems.filter((item) => checklistSettings[checklistSettingByItem[item]]).map((item) => {
    const saved = savedChecklist.find((entry) => entry.item === item);
    const status = ['Cleared', 'Pending', 'N/A'].includes(saved?.status) ? saved.status : 'Pending';
    return {
      item,
      status: status === 'Pending' && resolvedItems[item] ? 'Cleared' : status,
      note: saved?.note || '',
    };
  });
};

export default function LibraryClearanceViewModal({ requestId, onClose, onRefresh }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?._id || user?.id || localStorage.getItem('userId') || '';
  const [data, setData] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [libraryRecords, setLibraryRecords] = useState([]);
  const [libraryChecklist, setLibraryChecklist] = useState(() => libraryChecklistItems.map((item) => ({ item, status: 'Pending', note: '' })));
  const [showChecklist, setShowChecklist] = useState(false);
  const checklistRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [verificationResult, setVerificationResult] = useState('Clear');
  const [comment, setComment] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [clearanceRules, setClearanceRules] = useState(DEFAULT_CLEARANCE_RULES);
  const [checklistSettings, setChecklistSettings] = useState(DEFAULT_CHECKLIST_SETTINGS);
  const [errorMsg, setErrorMsg] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const headers = useMemo(() => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` }), []);

  const currentMaterials = libraryRecords.flatMap((record) => Array.isArray(record.materials) ? record.materials : []);
  const materials = currentMaterials.length
    ? currentMaterials
    : (Array.isArray(data?.materials) ? data.materials : []);
  const hasMaterialRecords = materials.length > 0;
  const borrowedItemsClear = hasMaterialRecords
    ? !materials.some(isUnresolvedMaterial)
    : data?.borrowedItemsStatus !== 'Not Clear' && (!Array.isArray(data?.outstandingItems) || data.outstandingItems.length === 0);
  const outstandingFineAmount = Math.max(
    Number(data?.outstandingFineAmount || 0),
    libraryRecords.reduce((total, record) => total + Number(record.outstandingFineAmount || 0), 0),
    materials.reduce((total, material) => total + getMaterialFineBalance(material), 0),
  );
  const finesClear = outstandingFineAmount <= 0;
  const otherObligationsClear = !['Pending', 'Not Clear'].includes(data?.otherObligationsStatus)
    && (!Array.isArray(data?.outstandingItems) || data.outstandingItems.length === 0);
  const hasOverdueMaterials = materials.some((material) => {
    const status = normalizeMaterialStatus(material);
    const dueDate = material.dueDate ? new Date(material.dueDate).toISOString().slice(0, 10) : '';
    return isUnresolvedMaterial(material) && (status === 'overdue' || (dueDate && dueDate < new Date().toISOString().slice(0, 10)));
  });
  const hasLostOrDamagedMaterials = materials.some((material) => (
    ['lost', 'damaged'].includes(normalizeMaterialStatus(material))
    || /^(lost|damaged)$/i.test(String(material.condition || material.currentCondition || '').trim())
  ));
  const hasConfiguredOutstanding = (
    (clearanceRules.checkUnreturnedBooks && !borrowedItemsClear)
    || (clearanceRules.checkOverdueBooks && hasOverdueMaterials)
    || (clearanceRules.checkOutstandingFines && !finesClear)
    || (clearanceRules.checkLostDamagedBooks && hasLostOrDamagedMaterials)
    || (checklistSettings.libraryAccountChecked && !otherObligationsClear)
  );

  const fetchDetails = useCallback(async (signal) => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await axios.get(`http://localhost:3000/api/clearance/${encodeURIComponent(requestId)}`, {
        headers,
        timeout: 15000,
        signal,
      });
      const request = res.data?.clearance || res.data;
      if (!request?._id && !request?.requestId) throw new Error('Clearance request details were not returned.');
      if (signal?.aborted) return;
      setData(request);
      setVerificationResult(request.libraryVerificationResult || request.verificationResult || 'Clear');
      setComment(request.libraryComment || request.comment || '');
      setReturnReason(request.libraryReturnReason || request.returnReason || request.remarks || '');
      setLoading(false);

      const [recordsResult, employeesResult, settingsResult] = request.employeeId
        ? await Promise.allSettled([
            axios.get('http://localhost:3000/api/library/records', {
              params: { employeeId: request.employeeId },
              headers,
              timeout: 12000,
              signal,
            }),
            axios.get('http://localhost:3000/api/employee', { headers, timeout: 12000, signal }),
            userId ? axios.get(`http://localhost:3000/api/library-settings/${encodeURIComponent(userId)}`, { headers, timeout: 12000, signal }) : Promise.resolve({ data: {} }),
          ])
        : [null, null, null];
      if (signal?.aborted) return;

      const records = recordsResult?.status === 'fulfilled'
        ? Array.isArray(recordsResult.value.data?.records) ? recordsResult.value.data.records : []
        : [];
      setLibraryRecords(records);
      const settings = settingsResult?.status === 'fulfilled' ? settingsResult.value.data || {} : {};
      const nextRules = { ...DEFAULT_CLEARANCE_RULES, ...(settings.clearanceRules || {}) };
      const nextChecklistSettings = { ...DEFAULT_CHECKLIST_SETTINGS, ...(settings.clearanceChecklist || {}) };
      setClearanceRules(nextRules);
      setChecklistSettings(nextChecklistSettings);
      setLibraryChecklist(createLibraryChecklist(request.libraryChecklist, request, records, nextChecklistSettings));
      const employeeRecords = employeesResult?.status === 'fulfilled'
        ? employeesResult.value.data?.employees || []
        : [];
      setEmployee(employeeRecords.find((item) => item.employeeId === request.employeeId) || null);

      const relatedDataFailure = recordsResult?.status === 'rejected'
        ? recordsResult.reason
        : employeesResult?.status === 'rejected'
          ? employeesResult.reason
          : settingsResult?.status === 'rejected'
            ? settingsResult.reason
            : null;
      if (relatedDataFailure) {
        console.error('Unable to load all related library clearance details:', relatedDataFailure);
        setErrorMsg(relatedDataFailure.response?.data?.message || 'Request loaded, but some related employee or library record details could not be retrieved.');
      }
    } catch (err) {
      if (!signal?.aborted) {
        console.error('Unable to load library clearance request details:', err);
        setErrorMsg(err.response?.data?.message || (err.code === 'ECONNABORTED'
          ? 'Loading request details timed out. Check the server connection and try again.'
          : err.message || 'Unable to load clearance request.'));
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [headers, requestId, userId]);

  useEffect(() => {
    if (!requestId) return undefined;
    const controller = new AbortController();
    fetchDetails(controller.signal);
    return () => controller.abort();
  }, [fetchDetails, requestId]);

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
    if (clearanceRules.requireChecklistCompletion && !checklistComplete) {
      setErrorMsg('Resolve every Library checklist item as Cleared or N/A before approving.');
      return;
    }
    if (verificationResult !== 'Clear' || hasConfiguredOutstanding) {
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

  const openLibraryChecklist = () => {
    if (!showChecklist) checklistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setShowChecklist((visible) => !visible);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-center items-center">
        <div role="status" className="bg-white p-6 rounded-xl text-slate-600 font-semibold text-xs">Loading request details...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
        <section role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
          <h2 className="text-sm font-bold text-slate-900">Unable to open clearance request</h2>
          <p className="mt-2 text-xs text-rose-700">{errorMsg || 'Clearance request details could not be loaded.'}</p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Close</button>
            <button type="button" onClick={() => fetchDetails()} className="rounded-md bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800">Retry</button>
          </div>
        </section>
      </div>
    );
  }
  const libraryStatus = data.libraryStatus || data.status;
  const employeeIdentifier = employee?.employeeId || data.employeeId || data.employee?.employeeId || '';
  const materialCounts = {
    borrowed: materials.length,
    outstanding: materials.filter(isUnresolvedMaterial).length,
    returned: materials.filter((item) => ['returned', 'cleared', 'approved', 'completed'].includes(normalizeMaterialStatus(item))).length,
  };
  const checklistComplete = !clearanceRules.requireChecklistCompletion
    || libraryChecklist.every((item) => item.status !== 'Pending');
  const canReview = ['In Progress', 'Under Review'].includes(libraryStatus);
  const formattedDate = (value, options = { year: 'numeric', month: 'short', day: 'numeric' }) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-US', options);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 text-xs text-slate-700 backdrop-blur-[2px] sm:p-6">
      <section role="dialog" aria-modal="true" aria-labelledby="library-clearance-title" className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700"><BookCheck size={18} /></span>
            <div className="min-w-0">
              <h1 id="library-clearance-title" className="truncate text-sm font-bold text-slate-900 sm:text-base">Library Clearance Verification &amp; Action</h1>
              <p className="truncate text-[10px] text-slate-500">{data.requestId || requestId}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${libraryStatus === 'Completed' ? 'bg-emerald-100 text-emerald-800' : libraryStatus === 'Rejected' ? 'bg-rose-100 text-rose-800' : libraryStatus === 'In Progress' || libraryStatus === 'Under Review' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
              {libraryStatus === 'In Progress' ? 'Under Review' : libraryStatus === 'Completed' ? 'Approved' : libraryStatus === 'Rejected' ? 'Returned' : libraryStatus}
            </span>
            <button type="button" onClick={onClose} aria-label="Close clearance details" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={17} /></button>
          </div>
        </header>

        <div className="space-y-3 overflow-y-auto p-3 sm:p-5">
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2 font-bold text-slate-900"><User size={14} className="text-teal-700" /><h2>Employee Profile</h2></div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[10px] sm:grid-cols-4">
              {[
                ['Name', employee?.fullName || data.employeeName || data.employee?.fullName || '-'],
                ['ID', employee?.employeeId || data.employeeId || '-'],
                ['Department', employee?.department || data.department?.name || data.department || '-'],
                ['Position', employee?.position || data.position || '-'],
                ['Reason', data.reason || data.clearanceReason || data.clearanceType || '-'],
                ['Request Date', formattedDate(data.submittedDate || data.requestDate || data.createdAt)],
              ].map(([label, value]) => <div key={label} className="min-w-0"><p className="text-slate-500">{label}</p><p className="mt-0.5 truncate font-semibold text-slate-800" title={String(value)}>{value}</p></div>)}
            </div>
          </section>

          <section aria-label="Library record summary" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Total Borrowed', materialCounts.borrowed, 'bg-blue-50 text-blue-800'],
              ['Returned', materialCounts.returned, 'bg-emerald-50 text-emerald-800'],
              ['Outstanding', materialCounts.outstanding, 'bg-rose-50 text-rose-800'],
              ['Late Fees', `${outstandingFineAmount.toLocaleString()} ETB`, 'bg-amber-50 text-amber-800'],
            ].map(([label, value, style]) => <div key={label} className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 ${style}`}><span className="text-[10px] font-semibold">{label}</span><strong className="text-sm">{value}</strong></div>)}
          </section>

          <section ref={checklistRef} className="scroll-mt-3 overflow-hidden rounded-lg border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="flex items-center gap-2 font-bold text-slate-900"><BookCheck size={14} className="text-teal-700" /><h2>Library Loan Records</h2><span className="text-[10px] font-normal text-slate-500">{materials.length} record{materials.length === 1 ? '' : 's'}</span></div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[680px] w-full text-left text-[10px]">
                <thead className="bg-white text-slate-500"><tr><th className="px-3 py-2 font-semibold">Book Title</th><th className="px-3 py-2 font-semibold">ISBN / ID</th><th className="px-3 py-2 font-semibold">Borrowed</th><th className="px-3 py-2 font-semibold">Due Date</th><th className="px-3 py-2 font-semibold">Condition</th><th className="px-3 py-2 font-semibold">Action</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {materials.length === 0 ? <tr><td colSpan="6" className="px-3 py-7 text-center text-slate-400">No library materials found for this employee.</td></tr> : materials.map((item, index) => {
                    const itemStatus = item.status || 'Borrowed';
                    const statusStyle = itemStatus === 'Returned' ? 'bg-emerald-50 text-emerald-700' : ['Outstanding', 'Overdue'].includes(itemStatus) ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700';
                    return <tr key={item._id || item.materialId || `${item.title || 'material'}-${index}`} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-semibold text-slate-800">{item.title || item.materialTitle || 'Library material'}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-600">{item.materialId || item.isbn || '-'}</td>
                      <td className="px-3 py-2.5">{formattedDate(item.borrowDate, { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                      <td className="px-3 py-2.5">{formattedDate(item.dueDate, { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                      <td className="px-3 py-2.5">{item.condition || itemStatus}</td>
                      <td className="px-3 py-2.5"><span className={`rounded px-2 py-1 text-[9px] font-semibold ${statusStyle}`}>{itemStatus === 'Borrowed' ? 'Pending' : itemStatus}</span></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            {hasConfiguredOutstanding && <p className="border-t border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-800">Outstanding items covered by enabled Library rules must be resolved before clearance can be approved.</p>}
          </section>

          {showChecklist && <section className="space-y-3 rounded-lg border border-slate-200 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 font-bold text-slate-900"><ClipboardCheck size={15} className="text-teal-700" /><h2>Library Clearance Checklist</h2></div>
              <span className={`text-[10px] font-semibold ${checklistComplete ? 'text-emerald-700' : 'text-amber-700'}`}>{libraryChecklist.filter((item) => item.status !== 'Pending').length} / {libraryChecklist.length} complete</span>
            </div>
            <p className="text-[10px] text-slate-500">Verify each Library obligation before approving the request.</p>
            <div className="space-y-2">
              {libraryChecklist.map((item) => <div key={item.item} className="grid gap-2 rounded-lg border border-slate-100 p-3 sm:grid-cols-[minmax(0,1fr)_105px] sm:items-center">
                <span className="min-w-0 font-medium text-slate-800">{item.item}</span>
                <select aria-label={`${item.item} status`} value={item.status} disabled={!canReview} onChange={(event) => setLibraryChecklist((current) => current.map((entry) => entry.item === item.item ? { ...entry, status: event.target.value } : entry))} className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-semibold outline-none focus:border-teal-600 disabled:bg-slate-100"><option>Pending</option><option>Cleared</option><option>N/A</option></select>
                <input aria-label={`${item.item} note`} value={item.note} disabled={!canReview} onChange={(event) => setLibraryChecklist((current) => current.map((entry) => entry.item === item.item ? { ...entry, note: event.target.value } : entry))} placeholder="Note (optional)" className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] outline-none focus:border-teal-600 disabled:bg-slate-100 sm:col-span-2" />
              </div>)}
            </div>
          </section>}

          {canReview && <section className="grid gap-3 sm:grid-cols-2">
            <label className="block font-semibold text-slate-700">Officer Comment <span className="font-normal text-slate-400">(optional)</span>
              <textarea rows={2} placeholder={hasConfiguredOutstanding ? 'Employee has outstanding library materials or fees.' : 'No outstanding library obligations.'} value={comment} onChange={(event) => setComment(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-white p-2.5 font-normal outline-none focus:border-teal-600" />
            </label>
            <label className="block font-semibold text-slate-700">Return Reason <span className="font-normal text-rose-600">(required to return)</span>
              <textarea rows={2} placeholder="Describe the outstanding library obligation." value={returnReason} onChange={(event) => setReturnReason(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-white p-2.5 font-normal outline-none focus:border-rose-500" />
            </label>
          </section>}

          {libraryStatus === 'Completed' && <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="font-bold text-emerald-800">Library clearance approved</p><p className="mt-1 text-[10px] text-slate-600">{data.libraryComment || data.comment || 'No outstanding library obligations.'}</p></div>
              <button type="button" onClick={() => setShowHistory((visible) => !visible)} className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-emerald-800"><History size={13} />{showHistory ? 'Hide History' : 'View History'}</button>
            </div>
            {showHistory && <div className="mt-3 grid gap-2 border-t border-emerald-200 pt-3 text-[10px] sm:grid-cols-3">
              <div><p className="text-slate-500">Submitted</p><p className="font-semibold">{formattedDate(data.submittedDate || data.requestDate || data.createdAt)}</p></div>
              <div><p className="text-slate-500">Reviewed</p><p className="font-semibold">{formattedDate(data.libraryReviewedAt || data.updatedAt || data.createdAt)}</p></div>
              <div><p className="text-slate-500">Decision</p><p className="font-semibold text-emerald-700">Library clearance approved</p></div>
            </div>}
          </section>}

          {libraryStatus === 'Rejected' && <section className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
            <div><p className="font-bold text-rose-800">Request returned</p><p className="mt-1 text-[10px] text-rose-700">{data.libraryReturnReason || data.returnReason || data.remarks || 'Review the return reason before continuing.'}</p></div>
            <button type="button" onClick={handleReviewAgain} className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700"><RotateCcw size={13} /> Review Again</button>
          </section>}

          {errorMsg && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] text-rose-700">{errorMsg}</p>}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-3 py-3 sm:px-5">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={openLibraryChecklist} aria-expanded={showChecklist} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-100">{showChecklist ? 'Close Checklist' : 'Open Checklist'}</button>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {libraryStatus === 'Pending' && <button type="button" onClick={handleStartReview} className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-800 hover:bg-amber-100"><Play size={13} /> Start Review</button>}
            {canReview && <button type="button" onClick={handleReturn} className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-white px-3 py-2 text-[10px] font-semibold text-rose-700 hover:bg-rose-50"><RotateCcw size={13} /> Return Request</button>}
            <button
              type="button"
              onClick={() => navigate(`/library-office/library-records${employeeIdentifier ? `?employeeId=${encodeURIComponent(employeeIdentifier)}` : ''}`)}
              className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-white px-3 py-2 text-[10px] font-semibold text-blue-700 hover:bg-blue-50"
            >
              <BookOpen size={13} /> View Asset Records
            </button>
            {canReview && <button type="button" onClick={handleApprove} disabled={!checklistComplete || hasConfiguredOutstanding} title={hasConfiguredOutstanding ? 'Resolve outstanding items required by the Library clearance rules.' : !checklistComplete ? 'Complete the checklist before approving.' : ''} className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-3 py-2 text-[10px] font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 size={13} /> Approve Clearance</button>}
            <button type="button" onClick={onClose} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-100">Close</button>
          </div>
        </footer>
      </section>
    </div>
  );
}