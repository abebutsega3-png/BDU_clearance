import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { Building2, Check, ChevronDown, ChevronUp, ClipboardCheck, FileText, PackageCheck, RotateCcw, Save, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../../context/authContext';

const API_URL = 'http://localhost:3000/api/clearance-requests';
const UPDATE_URL = (id) => `http://localhost:3000/api/clearance/${id}`;

const sections = [
  { key: 'responsibilities', title: 'Department Responsibilities', description: 'Ensure all department-related responsibilities are completed and handed over.', icon: ShieldCheck, tone: 'blue', items: ['Pending Tasks', 'Assigned Responsibilities', 'Ongoing Work', 'Handover', 'Department Documents'] },
  { key: 'materials', title: 'Department Materials', description: 'Check all department materials and equipment returned by the employee.', icon: PackageCheck, tone: 'emerald', items: ['Files / Documents', 'Department Manual', 'Office Materials', 'Department Equipment', 'Keys', 'Other Materials'] },
  { key: 'documents', title: 'Documents', description: 'Verify all department documents and records are returned.', icon: FileText, tone: 'violet', items: ['Department Files', 'Project Documents', 'Official Documents', 'Reports', 'Records', 'Other Documents'] },
  { key: 'office', title: 'Office / Room / Keys', description: 'Ensure office space and keys are properly returned.', icon: Building2, tone: 'amber', items: ['Office Room', 'Room Key', 'Cabinet Key', 'Office Condition', 'Access Card', 'Other Keys'] },
];

const defaultChecklist = sections.flatMap((section) => section.items.map((item) => ({ section: section.key, item, status: 'Cleared', note: '' })));
const authConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });

export default function DepartmentAssets() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [request, setRequest] = useState(null);
  const [checklist, setChecklist] = useState(defaultChecklist);
  const [comment, setComment] = useState('');
  const [expanded, setExpanded] = useState(Object.fromEntries(sections.map((section) => [section.key, true])));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadRequest = async () => {
      try {
        const response = await axios.get(API_URL, { ...authConfig(), params: { status: 'All Requests', page: 1, limit: 20 } });
        const requests = response.data?.requests || [];
        const requestedId = searchParams.get('requestId');
        const nextRequest = requests.find((item) => requestedId && (item.requestId === requestedId || item._id === requestedId))
          || requests.find((item) => ['Pending', 'In Progress', 'Under Review'].includes(item.departmentStatus || item.status))
          || requests[0];
        if (!nextRequest) {
          setError('No department clearance request is waiting for review.');
          return;
        }
        setRequest(nextRequest);
        setComment(nextRequest.departmentComment || nextRequest.remarks || '');
        const saved = Array.isArray(nextRequest.departmentClearances) ? nextRequest.departmentClearances : [];
        setChecklist(defaultChecklist.map((entry) => {
          const match = saved.find((item) => String(item.item || item.name || item.office || '').toLowerCase() === entry.item.toLowerCase());
          return match ? { ...entry, status: match.status === 'Returned' ? 'Pending' : match.status || entry.status, note: match.comment || match.remarks || '' } : entry;
        }));
      } catch (loadError) {
        setError(loadError.response?.data?.message || 'Unable to load department clearance.');
      } finally {
        setLoading(false);
      }
    };
    loadRequest();
  }, [searchParams]);

  const updateItem = (item, field, value) => setChecklist((current) => current.map((entry) => entry.item === item ? { ...entry, [field]: value } : entry));
  const completedCount = checklist.filter((item) => item.status === 'Cleared').length;
  const totalCount = checklist.length;
  const allCleared = completedCount === totalCount;
  const grouped = useMemo(() => Object.fromEntries(sections.map((section) => [section.key, checklist.filter((item) => item.section === section.key)])), [checklist]);

  const saveDecision = async (status) => {
    if (!request?._id || saving) return;
    if (status === 'Returned' && !comment.trim()) {
      setError('Add a comment before returning this request.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await axios.put(UPDATE_URL(request._id), {
        status,
        remarks: comment.trim(),
        departmentComment: comment.trim(),
        departmentClearances: checklist.map((item) => ({ ...item, office: item.item, updatedAt: new Date().toISOString() })),
      }, authConfig());
      setRequest(response.data?.clearance || { ...request, departmentStatus: status });
      setMessage(status === 'Approved' ? 'Department clearance approved.' : 'Request returned for correction.');
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Unable to save department clearance.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">Loading department clearance...</div>;

  return <div className="space-y-5 text-slate-700">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="mb-2 flex items-center gap-2 text-xs text-slate-400"><span>Department Clearance</span><span>/</span><span className="font-semibold text-teal-700">Department Assets</span></div><h1 className="text-2xl font-bold text-[#10254b]">Department Clearance</h1><p className="mt-1 text-sm text-slate-500">Review and verify department-related clearance items before approving the employee's final clearance.</p></div>
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-right shadow-sm"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Overall Status</p><span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />{request?.departmentStatus || 'Under Review'}</span></div>
    </div>

    {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

    {request && <>
      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <Info icon={UserRound} label="Employee" value={request.employeeName || request.employeeId || 'Employee'} />
        <Info label="Employee ID" value={request.employeeId || 'Not provided'} />
        <Info label="Campus" value={request.campus || user?.campus || 'Main Campus'} />
        <Info label="Request Type" value={request.clearanceType || 'Resignation'} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-base font-bold text-[#10254b]"><ClipboardCheck size={18} className="text-teal-600" />Department Assets</h2><p className="mt-1 text-xs text-slate-500">Verify and confirm the following items related to the employee's department clearance.</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{completedCount} / {totalCount} Cleared</span></div>
        <div className="space-y-3">{sections.map((section, index) => <ChecklistSection key={section.key} section={section} index={index + 1} entries={grouped[section.key]} expanded={expanded[section.key]} onToggle={() => setExpanded((current) => ({ ...current, [section.key]: !current[section.key] }))} onUpdate={updateItem} />)}</div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-4 lg:grid-cols-[1fr_2fr]"><div><p className="text-xs font-bold text-[#10254b]">Overall Department Clearance Status</p><div className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${allCleared ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><Check size={14} />{allCleared ? 'Cleared' : 'Pending Review'}</div><p className="mt-2 text-[11px] text-slate-400">All department responsibilities, materials, documents and keys must be verified.</p></div><label className="text-xs font-semibold text-slate-600">Comments / Remarks<textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} placeholder="Add comments or remarks..." className="mt-1 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal outline-none focus:border-teal-500" /></label></div><div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => saveDecision('Returned')} disabled={saving} className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-white px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"><RotateCcw size={14} />Return Request</button><button type="button" onClick={() => saveDecision('Approved')} disabled={saving || !allCleared} className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"><Save size={14} />{saving ? 'Saving...' : 'Approve Clearance'}</button></div></section>
    </>}
  </div>;
}

function Info({ icon: Icon, label, value }) { return <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3"><div className="rounded-full bg-teal-100 p-2 text-teal-700">{Icon ? <Icon size={17} /> : <FileText size={17} />}</div><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="truncate text-sm font-bold text-slate-800">{value}</p></div></div>; }

function ChecklistSection({ section, index, entries, expanded, onToggle, onUpdate }) { const Icon = section.icon; const cleared = entries.filter((entry) => entry.status === 'Cleared').length; const tone = { blue: 'bg-blue-50 border-blue-100', emerald: 'bg-emerald-50 border-emerald-100', violet: 'bg-violet-50 border-violet-100', amber: 'bg-amber-50 border-amber-100' }[section.tone]; return <div className={`overflow-hidden rounded-lg border ${tone}`}><button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 p-3 text-left"><span className="flex items-center gap-3"><span className="rounded-full bg-white p-2 shadow-sm"><Icon size={17} /></span><span><span className="block text-sm font-bold text-slate-800">{index}. {section.title}</span><span className="block text-[10px] text-slate-500">{section.description}</span></span></span><span className="flex items-center gap-3"><span className="hidden rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700 sm:inline-flex">{cleared === entries.length ? 'Cleared' : 'In Progress'}</span>{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span></button>{expanded && <div className="grid gap-x-5 gap-y-2 border-t border-white/70 bg-white/60 p-3 sm:grid-cols-2">{entries.map((entry) => <label key={entry.item} className="flex items-center gap-2 rounded-md bg-white px-2.5 py-2 text-xs"><input type="checkbox" checked={entry.status === 'Cleared'} onChange={(event) => onUpdate(entry.item, 'status', event.target.checked ? 'Cleared' : 'Pending')} className="h-3.5 w-3.5 accent-teal-600" /><span className="min-w-0 flex-1">{entry.item}</span><select value={entry.status} onChange={(event) => onUpdate(entry.item, 'status', event.target.value)} className="border-0 bg-transparent text-[10px] font-semibold text-slate-500 outline-none"><option>Cleared</option><option>Pending</option></select></label>)}</div>}</div>; }
