import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, CarFront, Check, ChevronDown, ChevronUp, ClipboardCheck, FileText, PackageCheck, RotateCcw, Save, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../../context/authContext';

const API_URL = 'http://localhost:3000/api/clearance-requests';
const UPDATE_URL = (id) => `http://localhost:3000/api/clearance/${id}`;
const authConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });

const checklistProfiles = {
	transport: {
		title: 'Transport Clearance Checklist',
		description: 'Verify assigned vehicles, equipment, handover, and outstanding transport obligations.',
		sections: [
			{ key: 'vehicle', title: 'Assigned Vehicle', description: 'Confirm vehicle assignment and return status.', icon: CarFront, tone: 'blue', items: ['Vehicle Plate Number', 'Vehicle Type', 'Assigned Driver / Employee', 'Vehicle Return Status'] },
			{ key: 'condition', title: 'Vehicle Condition and Equipment', description: 'Check vehicle condition and assigned accessories.', icon: PackageCheck, tone: 'emerald', items: ['Vehicle Condition', 'Vehicle Keys Returned', 'Vehicle Documents Returned', 'Fuel Card / Vehicle Accessories'] },
			{ key: 'responsibilities', title: 'Transport Responsibilities', description: 'Check records, handover, and pending transport work.', icon: ShieldCheck, tone: 'amber', items: ['Outstanding Vehicle-related Tasks', 'Vehicle Handover', 'Transport Records', 'Pending Transport Obligations'] },
		],
	},
	academic: {
		title: 'Academic Department Clearance Checklist',
		description: 'Verify teaching duties, academic records, department materials, and work handover.',
		sections: [
			{ key: 'teaching', title: 'Teaching Responsibilities', description: 'Confirm course delivery, assessments, grades, and teaching handover.', icon: BookOpen, tone: 'blue', items: ['Course Completion Status', 'Student Assessment / Exam Records', 'Grade Submission Status', 'Pending Academic Tasks', 'Teaching Material Handover'] },
			{ key: 'documents', title: 'Department Documents', description: 'Verify academic and department records.', icon: FileText, tone: 'violet', items: ['Course Files', 'Exam and Assessment Documents', 'Academic Reports', 'Project / Research Documents', 'Department Records'] },
			{ key: 'materials', title: 'Department Materials', description: 'Check assigned teaching materials, equipment, and access items.', icon: PackageCheck, tone: 'emerald', items: ['Books or Teaching Materials', 'Department Equipment', 'Laboratory Materials', 'Office Keys / Access Card'] },
			{ key: 'handover', title: 'Work Handover', description: 'Confirm ongoing academic work is handed to assigned staff.', icon: ShieldCheck, tone: 'amber', items: ['Ongoing Courses / Tasks', 'Student-related Responsibilities', 'Handover to Assigned Staff', 'Pending Department Duties'] },
		],
	},
	general: {
		title: 'Department Clearance Checklist',
		description: 'Verify department responsibilities, materials, records, and work handover.',
		sections: [
			{ key: 'responsibilities', title: 'Department Responsibilities', description: 'Ensure department work is completed or handed over.', icon: ShieldCheck, tone: 'blue', items: ['Pending Tasks', 'Assigned Responsibilities', 'Ongoing Work', 'Work Handover'] },
			{ key: 'documents', title: 'Department Documents', description: 'Verify department documents and records.', icon: FileText, tone: 'violet', items: ['Department Files', 'Project Documents', 'Official Documents', 'Reports and Records'] },
			{ key: 'materials', title: 'Department Materials', description: 'Check department equipment, keys, and other assigned materials.', icon: PackageCheck, tone: 'emerald', items: ['Office Materials', 'Department Equipment', 'Keys / Access Card', 'Other Assigned Materials'] },
		],
	},
};

const normalizeDepartmentName = (department) => {
	if (department && typeof department === 'object') return department.departmentName || department.name || '';
	return String(department || '');
};

const getChecklistProfile = (request, user) => {
	const department = normalizeDepartmentName(request?.department || user?.department).toLowerCase();
	const position = String(request?.position || request?.employee?.position || '').toLowerCase();
	if (/transport|fleet/.test(department) || /\b(driver|chauffeur|transport officer|transport staff)\b/.test(position)) return checklistProfiles.transport;
	if (/academic|lecturer|faculty|teaching/.test(department) || /\b(lecturer|instructor|professor|academic staff|teacher)\b/.test(position)) return checklistProfiles.academic;
	return checklistProfiles.general;
};

const freshChecklist = (profile, request) => {
	const savedChecklist = Array.isArray(request?.departmentChecklist)
		? request.departmentChecklist
		: Array.isArray(request?.departmentClearances) ? request.departmentClearances : [];
	return profile.sections.flatMap((section) => section.items.map((item) => {
		const saved = savedChecklist.find((entry) => String(entry.item || entry.name || '').toLowerCase() === item.toLowerCase());
		const savedStatus = ['Cleared', 'Pending', 'N/A'].includes(saved?.status) ? saved.status : 'Pending';
		return { section: section.key, item, status: savedStatus, note: saved?.note || saved?.comment || '' };
	}));
};

export default function DepartmentAssets() {
	const { user } = useAuth();
	const [searchParams] = useSearchParams();
	const [request, setRequest] = useState(null);
	const [checklist, setChecklist] = useState([]);
	const [comment, setComment] = useState('');
	const [returnReason, setReturnReason] = useState('');
	const [expanded, setExpanded] = useState({});
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [message, setMessage] = useState('');

	useEffect(() => {
		let cancelled = false;
		const loadRequest = async () => {
			setLoading(true);
			setError('');
			try {
				const response = await axios.get(API_URL, { ...authConfig(), params: { status: 'All Requests', page: 1, limit: 20 } });
				const requests = response.data?.requests || [];
				const requestedId = searchParams.get('requestId');
				const nextRequest = requests.find((item) => requestedId && (item.requestId === requestedId || item._id === requestedId))
					|| requests.find((item) => ['Pending', 'In Progress', 'Under Review'].includes(item.departmentStatus || item.status))
					|| requests[0];
				if (!nextRequest) {
					if (!cancelled) {
						setRequest(null);
						setError('No department clearance request is waiting for review.');
					}
					return;
				}
				if (cancelled) return;
				const profile = getChecklistProfile(nextRequest, user);
				setRequest(nextRequest);
				setComment(nextRequest.departmentComment || '');
				setReturnReason(nextRequest.departmentReturnReason || nextRequest.returnReason || '');
				setChecklist(freshChecklist(profile, nextRequest));
				setExpanded(Object.fromEntries(profile.sections.map((section) => [section.key, true])));
			} catch (loadError) {
				if (!cancelled) setError(loadError.response?.data?.message || 'Unable to load department clearance.');
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		loadRequest();
		return () => { cancelled = true; };
	}, [searchParams, user]);

	const profile = getChecklistProfile(request, user);
	const grouped = useMemo(() => Object.fromEntries(profile.sections.map((section) => [section.key, checklist.filter((item) => item.section === section.key)])), [profile, checklist]);
	const clearedCount = checklist.filter((item) => item.status === 'Cleared').length;
	const notApplicableCount = checklist.filter((item) => item.status === 'N/A').length;
	const canApprove = checklist.length > 0 && checklist.every((item) => item.status !== 'Pending');
	const canReview = Boolean(request && ['Pending', 'In Progress', 'Under Review'].includes(request.departmentStatus));

	const updateItem = (itemName, field, value) => setChecklist((current) => current.map((item) => item.item === itemName ? { ...item, [field]: value } : item));
	const saveDecision = async (status) => {
		if (!request?._id || saving) return;
		if (!canReview) {
			setError('This request is not open for Department Head review.');
			return;
		}
		if (status === 'Returned' && !returnReason.trim()) {
			setError('Add a return reason before returning this request.');
			return;
		}
		if (status === 'Approved' && !canApprove) {
			setError('Resolve every checklist item as Cleared or N/A before approving.');
			return;
		}
		setSaving(true);
		setError('');
		setMessage('');
		try {
			const response = await axios.put(UPDATE_URL(request._id), {
				status,
				remarks: comment.trim(),
				returnReason: status === 'Returned' ? returnReason.trim() : '',
				departmentDecision: {
					status,
					comment: comment.trim(),
					returnReason: status === 'Returned' ? returnReason.trim() : '',
				},
				departmentChecklist: checklist.map((item) => ({ ...item, updatedAt: new Date().toISOString() })),
			}, authConfig());
			const updatedRequest = response.data?.clearance || { ...request, departmentStatus: status };
			setRequest(updatedRequest);
			setMessage(status === 'Approved' ? 'Department clearance approved.' : 'Request returned for correction.');
		} catch (saveError) {
			setError(saveError.response?.data?.message || saveError.message || 'Unable to save department clearance.');
		} finally {
			setSaving(false);
		}
	};

	if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">Loading department clearance...</div>;

	return (
		<div className="space-y-5 text-slate-700">
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<p className="mb-2 flex items-center gap-2 text-xs text-slate-400"><span>Department Head</span><span>/</span><span className="font-semibold text-teal-700">Department Clearance</span></p>
					<h1 className="text-2xl font-bold text-slate-900">{profile.title}</h1>
					<p className="mt-1 text-sm text-slate-500">{profile.description}</p>
				</div>
				{request && <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-right shadow-sm"><p className="text-[10px] font-semibold uppercase text-slate-400">Overall Status</p><span className="mt-1 inline-flex rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{request.departmentStatus || 'Pending'}</span></div>}
			</header>

			{error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
			{message && <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}

			{request && <>
				<section className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
					<Info icon={UserRound} label="Employee" value={request.employeeName || request.employeeId || 'Employee'} />
					<Info label="Employee ID" value={request.employeeId || 'Not provided'} />
					<Info label="Department" value={normalizeDepartmentName(request.department) || user?.department || 'Not provided'} />
					<Info label="Position" value={request.position || request.employee?.position || 'Not provided'} />
				</section>

				<section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
					<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
						<div><h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><ClipboardCheck size={18} className="text-teal-700" />{profile.title}</h2><p className="mt-1 text-xs text-slate-500">Mark each applicable item based on what you have actually reviewed.</p></div>
						<div className="text-right"><p className="text-sm font-bold text-slate-800">{clearedCount} / {checklist.length} Cleared</p><p className="text-[11px] text-slate-500">{notApplicableCount} marked N/A</p></div>
					</div>
					<div className="space-y-3">
						{profile.sections.map((section, index) => <ChecklistSection
							key={section.key}
							section={section}
							index={index + 1}
							entries={grouped[section.key] || []}
							expanded={expanded[section.key]}
							onToggle={() => setExpanded((current) => ({ ...current, [section.key]: !current[section.key] }))}
							onUpdate={updateItem}
							editable={canReview}
						/>)}
					</div>
				</section>

				<section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
						{!canReview && <p className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">This request is not open for Department Head review.</p>}
					<div className="grid gap-4 lg:grid-cols-2">
						<div><p className="text-xs font-bold text-slate-900">Review Decision</p><div className={`mt-2 inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-bold ${canApprove ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><Check size={14} />{canApprove ? 'Ready for decision' : 'Checklist has pending items'}</div><p className="mt-2 text-xs text-slate-500">Reviewer: {request.departmentReviewedBy || user?.name || 'Recorded on decision'}</p><p className="mt-1 text-xs text-slate-500">Review date: {request.departmentReviewedAt ? new Date(request.departmentReviewedAt).toLocaleString() : 'Recorded on decision'}</p></div>
						<label className="text-xs font-semibold text-slate-600">Return with Reason<textarea value={returnReason} onChange={(event) => setReturnReason(event.target.value)} rows={2} placeholder="Required only when returning this request" className="mt-1 w-full resize-y rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal outline-none focus:border-teal-600" /></label>
						<label className="text-xs font-semibold text-slate-600 lg:col-span-2">Remarks<textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={2} placeholder="Optional review notes" className="mt-1 w-full resize-y rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal outline-none focus:border-teal-600" /></label>
					</div>
					<div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
						<button type="button" onClick={() => saveDecision('Returned')} disabled={saving || !canReview} className="inline-flex items-center gap-2 rounded-md border border-orange-200 bg-white px-4 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-50"><RotateCcw size={14} />Return with Reason</button>
						<button type="button" onClick={() => saveDecision('Approved')} disabled={saving || !canReview || !canApprove} className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"><Save size={14} />{saving ? 'Saving...' : 'Approve Clearance'}</button>
					</div>
				</section>
			</>}
		</div>
	);
}

function Info({ icon: Icon, label, value }) {
	return <div className="flex min-w-0 items-center gap-3 rounded-md bg-slate-50 p-3"><span className="rounded-md bg-teal-100 p-2 text-teal-800">{Icon ? <Icon size={17} /> : <FileText size={17} />}</span><span className="min-w-0"><span className="block text-[10px] font-semibold uppercase text-slate-400">{label}</span><span className="block truncate text-sm font-bold text-slate-800">{value}</span></span></div>;
}

function ChecklistSection({ section, index, entries, expanded, onToggle, onUpdate, editable }) {
	const Icon = section.icon;
	const cleared = entries.filter((entry) => entry.status === 'Cleared').length;
	const tone = { blue: 'border-blue-100 bg-blue-50', emerald: 'border-emerald-100 bg-emerald-50', violet: 'border-violet-100 bg-violet-50', amber: 'border-amber-100 bg-amber-50' }[section.tone];
	return (
		<section className={`overflow-hidden rounded-md border ${tone}`}>
			<button type="button" onClick={onToggle} aria-expanded={expanded} className="flex w-full items-center justify-between gap-3 p-3 text-left">
				<span className="flex min-w-0 items-center gap-3"><span className="rounded-md bg-white p-2 shadow-sm"><Icon size={17} /></span><span className="min-w-0"><span className="block text-sm font-bold text-slate-800">{index}. {section.title}</span><span className="block text-[10px] text-slate-500">{section.description}</span></span></span>
				<span className="flex shrink-0 items-center gap-3"><span className="hidden text-[10px] font-bold text-slate-600 sm:inline">{cleared}/{entries.length} cleared</span>{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
			</button>
			{expanded && <div className="space-y-2 border-t border-white/70 bg-white/60 p-3">{entries.map((entry) => <div key={entry.item} className="grid gap-2 rounded-md bg-white p-2.5 sm:grid-cols-[minmax(0,1fr)_120px_minmax(150px,0.8fr)] sm:items-center"><span className="text-xs font-medium text-slate-800">{entry.item}</span><select aria-label={`${entry.item} status`} value={entry.status} disabled={!editable} onChange={(event) => onUpdate(entry.item, 'status', event.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-teal-600 disabled:cursor-not-allowed disabled:bg-slate-100"><option>Pending</option><option>Cleared</option><option>N/A</option></select><input aria-label={`${entry.item} note`} value={entry.note} disabled={!editable} onChange={(event) => onUpdate(entry.item, 'note', event.target.value)} placeholder="Note (optional)" className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none focus:border-teal-600 disabled:cursor-not-allowed disabled:bg-slate-100" /></div>)}</div>}
		</section>
	);
}