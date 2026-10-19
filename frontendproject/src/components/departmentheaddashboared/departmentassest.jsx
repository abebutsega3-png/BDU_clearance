import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, CalendarDays, Check, CheckCircle2, ClipboardCheck, Clock3, Download, Eye, FileText, History, Paperclip, RotateCcw, Save, Trash2, Upload, UserRound } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import { freshChecklist, getChecklistProfile, normalizeDepartmentName } from './departmentChecklist';

const API_URL = 'http://localhost:3000/api/clearance-requests';
const formatDate = (value) => {
	if (!value) return 'Not provided';
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
};
const getDocuments = (request) => {
	const documents = request?.supportingDocuments || request?.documents || request?.attachments;
	if (Array.isArray(documents)) return documents;
	return typeof documents === 'string' && documents.trim() ? [documents] : [];
};
const getDocumentName = (document) => {
	if (typeof document === 'string') return document.split(/[\\/]/).pop() || document;
	return document?.originalname || document?.fileName || document?.filename || document?.name || 'Supporting document';
};
const UPDATE_URL = (id) => `http://localhost:3000/api/clearance/${id}`;
const authConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });

export default function DepartmentAssets() {
	const { user } = useAuth();
	const [searchParams] = useSearchParams();
	const [request, setRequest] = useState(null);
	const [checklist, setChecklist] = useState([]);
	const [comment, setComment] = useState('');
	const [returnReason, setReturnReason] = useState('');
	const [returnReasonError, setReturnReasonError] = useState('');
	const returnReasonRef = useRef(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [uploadingItem, setUploadingItem] = useState('');
	const [attachmentActionItem, setAttachmentActionItem] = useState('');
	const [pendingDeleteItem, setPendingDeleteItem] = useState(null);
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
	const clearedCount = checklist.filter((item) => item.status === 'Cleared').length;
	const notApplicableCount = checklist.filter((item) => item.status === 'N/A').length;
	const canApprove = checklist.length > 0 && checklist.every((item) => item.status !== 'Pending');
	const canReview = Boolean(request && ['Pending', 'In Progress', 'Under Review'].includes(request.departmentStatus));
	const documents = getDocuments(request);

	const updateItem = (itemName, field, value) => setChecklist((current) => current.map((item) => item.item === itemName ? { ...item, [field]: value } : item));
	const uploadAttachment = async (item, file) => {
		if (!file || !request?._id || uploadingItem) return;
		setUploadingItem(item.item);
		setError('');
		setMessage('');
		const formData = new FormData();
		formData.append('attachment', file);
		formData.append('itemId', item.item);
		formData.append('section', item.section);
		formData.append('category', item.category || item.section);
		formData.append('note', item.note || '');
		try {
			const response = await axios.post(`http://localhost:3000/api/clearance/${encodeURIComponent(request._id)}/department-checklist/attachment`, formData, authConfig());
			updateItem(item.item, 'attachment', response.data.attachment);
			setRequest((current) => current ? {
				...current,
				departmentChecklist: [
					...(current.departmentChecklist || []).filter((savedItem) => savedItem.item !== item.item),
					{ ...item, note: item.note || '', attachment: response.data.attachment },
				],
			} : current);
			setMessage(`${response.data.attachment.fileName} uploaded.`);
		} catch (uploadError) {
			setError(uploadError.response?.data?.message || uploadError.message || 'Unable to upload the attachment.');
		} finally {
			setUploadingItem('');
		}
	};
	const downloadAttachment = async (item) => {
		setError('');
		try {
			const response = await axios.get(
				`http://localhost:3000/api/clearance/${encodeURIComponent(request._id)}/department-checklist/${encodeURIComponent(item.item)}/attachment`,
				{ ...authConfig(), responseType: 'blob' },
			);
			const url = URL.createObjectURL(response.data);
			const link = document.createElement('a');
			link.href = url;
			link.download = item.attachment.fileName || 'department-attachment';
			document.body.appendChild(link);
			link.click();
			link.remove();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		} catch (downloadError) {
			setError(downloadError.response?.data?.message || downloadError.message || 'Unable to download the attachment.');
		}
	};
	const previewAttachment = async (item) => {
		const previewWindow = window.open('', '_blank');
		if (!previewWindow) {
			setError('Allow pop-ups to preview the attachment.');
			return;
		}
		previewWindow.opener = null;
		setAttachmentActionItem(item.item);
		setError('');
		try {
			const response = await axios.get(
				`http://localhost:3000/api/clearance/${encodeURIComponent(request._id)}/department-checklist/${encodeURIComponent(item.item)}/preview`,
				{ ...authConfig(), responseType: 'blob' },
			);
			const url = URL.createObjectURL(response.data);
			previewWindow.location.href = url;
			setTimeout(() => URL.revokeObjectURL(url), 60000);
		} catch (previewError) {
			previewWindow.close();
			setError(previewError.response?.data?.message || previewError.message || 'Unable to preview the attachment.');
		} finally {
			setAttachmentActionItem('');
		}
	};
	const deleteAttachment = async () => {
		const item = pendingDeleteItem;
		if (!item || !request?._id) return;
		setAttachmentActionItem(item.item);
		setPendingDeleteItem(null);
		setError('');
		setMessage('');
		try {
			await axios.delete(
				`http://localhost:3000/api/clearance/${encodeURIComponent(request._id)}/department-checklist/${encodeURIComponent(item.item)}/attachment`,
				authConfig(),
			);
			updateItem(item.item, 'attachment', null);
			setRequest((current) => current ? {
				...current,
				departmentChecklist: (current.departmentChecklist || []).map((savedItem) => (
					savedItem.item === item.item ? { ...savedItem, attachment: null } : savedItem
				)),
			} : current);
			setMessage('Checklist attachment deleted.');
		} catch (deleteError) {
			setError(deleteError.response?.data?.message || deleteError.message || 'Unable to delete the attachment.');
		} finally {
			setAttachmentActionItem('');
		}
	};
	const saveDecision = async (status) => {
		if (!request?._id || saving) return;
		if (!canReview) {
			setError('This request is not open for Department Head review.');
			return;
		}
		if (status === 'Returned' && !returnReason.trim()) {
			setError('');
			setReturnReasonError('Enter the reason this request is being returned for correction.');
			returnReasonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			returnReasonRef.current?.focus({ preventScroll: true });
			return;
		}
		setReturnReasonError('');
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
			setMessage(status === 'Approved'
				? 'Department clearance approved.'
				: status === 'Returned'
					? 'Request returned for correction.'
					: 'Department checklist progress saved.');
		} catch (saveError) {
			setError(saveError.response?.data?.message || saveError.message || 'Unable to save department clearance.');
		} finally {
			setSaving(false);
		}
	};

	if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">Loading department clearance...</div>;

	return (
		<div className="space-y-4 text-slate-700">
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<p className="mb-1 flex items-center gap-2 text-[11px] text-slate-400"><span>Home</span><span>/</span><span>Handover</span><span>/</span><span className="font-semibold text-blue-700">Department Clearance</span></p>
					<h1 className="text-xl font-bold text-slate-900">Department Head Checklist</h1>
					<p className="mt-1 text-[11px] text-slate-500">Review responsibilities, documents, and department assets before approving employee clearance.</p>
				</div>
				{request && <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-right shadow-sm"><p className="text-[10px] font-semibold uppercase text-slate-400">Request Status</p><span className="mt-1 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">{request.departmentStatus || 'Pending'}</span></div>}
			</header>

			{error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
			{message && <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}

			{request && <>
				<section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1.25fr_1fr_0.75fr]">
					<div className="grid gap-3 sm:grid-cols-2">
						<Info icon={UserRound} label="Full Name" value={request.employeeName || request.employeeId || 'Employee'} />
						<Info label="Employee ID" value={request.employeeId || 'Not provided'} />
						<Info label="Position" value={request.position || request.employee?.position || 'Not provided'} />
						<Info label="Department" value={normalizeDepartmentName(request.department) || normalizeDepartmentName(user?.department) || 'Not provided'} />
					</div>
					<div className="grid content-center gap-2 border-y border-slate-100 py-3 text-[11px] sm:grid-cols-2 lg:border-x lg:border-y-0 lg:px-4 lg:py-0">
						<InfoRow label="Clearance Reason" value={request.clearanceType || request.reason || 'Not provided'} />
						<InfoRow label="Last Working Date" value={formatDate(request.lastWorkingDate)} />
						<InfoRow label="Request Date" value={formatDate(request.requestDate || request.createdAt)} />
						<InfoRow label="Request ID" value={request.requestId || request._id} />
					</div>
					<div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-3 lg:flex-col lg:items-start lg:justify-center">
						<span className="text-[10px] font-semibold uppercase text-slate-500">Department Decision</span>
						<span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800">{request.departmentStatus || 'Pending'}</span>
					</div>
				</section>

				<section className="overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
					<div className="bg-gradient-to-r from-blue-950 via-blue-800 to-blue-700 px-5 py-5 text-white sm:px-7">
						<div className="flex flex-wrap items-center justify-between gap-4">
							<div className="flex items-center gap-3">
								<span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15"><ClipboardCheck size={27} /></span>
								<div>
									<h2 className="text-lg font-extrabold sm:text-xl">{profile.title}</h2>
									<p className="mt-1 text-xs text-blue-100 sm:text-sm">Before approving an employee clearance, check every item below.</p>
								</div>
							</div>
							<div className="min-w-40 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5">
								<div className="flex items-center justify-between gap-4 text-xs font-semibold"><span>Checklist progress</span><span>{clearedCount + notApplicableCount}/{checklist.length}</span></div>
								<div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-emerald-300 transition-all" style={{ width: `${checklist.length ? ((clearedCount + notApplicableCount) / checklist.length) * 100 : 0}%` }} /></div>
							</div>
						</div>
					</div>
					<div className="grid items-stretch gap-3 p-3 sm:gap-4 sm:p-4 xl:grid-cols-3">
						{profile.sections.map((section, sectionIndex) => {
							const SectionIcon = section.icon;
							const sectionItems = checklist.filter((item) => item.section === section.key);
							const sectionStyle = section.tone === 'blue'
								? { border: 'border-blue-500', header: 'bg-gradient-to-r from-blue-700 to-blue-600', body: 'bg-blue-50/70', badge: 'bg-blue-700', icon: 'text-blue-700', item: 'border-blue-100' }
								: section.tone === 'emerald'
									? { border: 'border-emerald-600', header: 'bg-gradient-to-r from-emerald-800 to-emerald-700', body: 'bg-emerald-50/70', badge: 'bg-emerald-800', icon: 'text-emerald-700', item: 'border-emerald-100' }
									: section.tone === 'violet'
										? { border: 'border-violet-500', header: 'bg-gradient-to-r from-violet-800 to-violet-700', body: 'bg-violet-50/70', badge: 'bg-violet-800', icon: 'text-violet-700', item: 'border-violet-100' }
										: { border: 'border-amber-500', header: 'bg-gradient-to-r from-amber-700 to-amber-600', body: 'bg-amber-50/70', badge: 'bg-amber-700', icon: 'text-amber-700', item: 'border-amber-100' };
							const firstItemNumber = profile.sections.slice(0, sectionIndex).reduce((total, previous) => total + previous.items.length, 1);
							return (
								<article key={section.key} className={`overflow-hidden rounded-xl border-2 ${sectionStyle.border}`}>
									<div className={`${sectionStyle.header} flex min-h-16 items-center gap-3 px-3 py-2.5 text-white`}>
										<span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-lg font-extrabold text-slate-800">{sectionIndex + 1}</span>
										<SectionIcon size={27} className="shrink-0" />
										<div className="min-w-0">
											<h3 className="text-sm font-extrabold leading-tight">{section.title}</h3>
											<p className="mt-0.5 text-[10px] text-white/85">{sectionItems.length} checklist items</p>
										</div>
									</div>
									<div className={`h-full space-y-2.5 p-2.5 ${sectionStyle.body}`}>
										{sectionItems.map((item, itemIndex) => {
											const document = item.attachment;
											const documentName = document ? getDocumentName(document) : '';
											const detailsOpen = Boolean(item.note || documentName);
											const checkboxId = `department-checklist-${section.key}-${itemIndex}`;
											return (
												<div key={`${item.section}-${item.item}`} className={`rounded-lg border bg-white/85 p-2.5 shadow-sm ${sectionStyle.item}`}>
													<div className="flex items-start gap-2.5">
														<input
															id={checkboxId}
															type="checkbox"
															aria-label={`Mark ${item.item} cleared`}
															checked={item.status === 'Cleared'}
															disabled={!canReview}
															onChange={(event) => updateItem(item.item, 'status', event.target.checked ? 'Cleared' : 'Pending')}
															className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-blue-700 disabled:cursor-not-allowed"
														/>
														<span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-extrabold text-white ${sectionStyle.badge}`}>{firstItemNumber + itemIndex}</span>
														<div className="min-w-0 flex-1">
															<label htmlFor={checkboxId} className={`cursor-pointer text-xs font-bold leading-snug text-slate-900 ${item.status === 'Cleared' ? 'text-emerald-800' : ''}`}>{item.item}</label>
															<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
																<span className={`text-[10px] font-semibold ${item.status === 'Cleared' ? 'text-emerald-700' : item.status === 'N/A' ? 'text-slate-500' : 'text-amber-700'}`}>{item.status === 'Cleared' ? 'Cleared' : item.status === 'N/A' ? 'Not applicable' : 'Pending review'}</span>
																{documentName && <span className="inline-flex max-w-full items-center gap-1 truncate text-[10px] text-blue-700" title={documentName}><Paperclip size={10} />{documentName}</span>}
															</div>
														</div>
													</div>
													<details open={detailsOpen || undefined} className="ml-7 mt-2 border-t border-slate-100 pt-2">
														<summary className={`cursor-pointer select-none text-[10px] font-semibold ${sectionStyle.icon}`}>Remarks and attachments</summary>
														<div className="mt-2 space-y-2">
															<input aria-label={`${item.item} remarks`} value={item.note} disabled={!canReview} onChange={(event) => updateItem(item.item, 'note', event.target.value)} placeholder="Add remarks" className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-[10px] outline-none focus:border-blue-500 disabled:bg-slate-50" />
															<div className="flex flex-wrap items-center gap-2">
																<select aria-label={`${item.item} status`} value={item.status} disabled={!canReview} onChange={(event) => updateItem(item.item, 'status', event.target.value)} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-700 outline-none focus:border-blue-500 disabled:opacity-60"><option>Pending</option><option>Cleared</option><option>N/A</option></select>
																<label className={`inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 ${!canReview || Boolean(uploadingItem) ? 'cursor-not-allowed opacity-50' : ''}`}>
																	<Upload size={11} />{uploadingItem === item.item ? 'Uploading...' : 'Upload file'}
																	<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" disabled={!canReview || Boolean(uploadingItem)} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; void uploadAttachment(item, file); event.target.value = ''; }} />
																</label>
																{document?.storageName && <>
																	<button type="button" onClick={() => previewAttachment(item)} disabled={Boolean(attachmentActionItem)} className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"><Eye size={11} />{attachmentActionItem === item.item ? 'Opening...' : 'View'}</button>
																	<button type="button" onClick={() => downloadAttachment(item)} disabled={Boolean(attachmentActionItem)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Download size={11} />Download</button>
																	<button type="button" onClick={() => setPendingDeleteItem(item)} disabled={!canReview || Boolean(attachmentActionItem)} className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"><Trash2 size={11} />Delete</button>
																</>}
															</div>
														</div>
													</details>
												</div>
											);
										})}
									</div>
								</article>
							);
						})}
					</div>
				</section>

				<section className="grid gap-4 xl:grid-cols-3">
					<div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
						<h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-900"><CalendarDays size={14} className="text-teal-700" />Handover Details</h3>
						<InfoRow label="Employee" value={request.employeeName || request.employeeId || 'Employee'} />
						<InfoRow label="Department" value={normalizeDepartmentName(request.department) || 'Not provided'} />
						<InfoRow label="Last Working Date" value={formatDate(request.lastWorkingDate)} />
						<InfoRow label="Handover status" value={clearedCount === checklist.length ? 'Checklist complete' : `${checklist.length - clearedCount - notApplicableCount} items pending`} />
						<InfoRow label="Request documents" value={documents.length ? documents.map(getDocumentName).join(', ') : 'No documents attached'} />
					</div>
					<div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
						<h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-900"><CheckCircle2 size={14} className="text-emerald-600" />Department Head Decision</h3>
						<div className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${canApprove ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><Check size={12} />{canApprove ? 'Ready for decision' : 'Pending checklist items'}</div>
						<label className="mb-2 block text-[10px] font-semibold text-slate-600">Comments / Remarks<textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={2} disabled={!canReview} placeholder="Add department review comments" className="mt-1 w-full resize-y rounded border border-slate-200 px-2 py-1.5 text-[10px] font-normal outline-none focus:border-teal-600 disabled:bg-slate-50" /></label>
						<label className="block text-[10px] font-semibold text-slate-600">
							Return Reason <span className="text-red-600">*</span>
							<textarea
								ref={returnReasonRef}
								value={returnReason}
								onChange={(event) => {
									setReturnReason(event.target.value);
									if (event.target.value.trim()) setReturnReasonError('');
								}}
								rows={2}
								disabled={!canReview}
								required
								aria-invalid={Boolean(returnReasonError)}
								aria-describedby={returnReasonError ? 'department-return-reason-error' : 'department-return-reason-help'}
								placeholder="Explain what the employee needs to correct"
								className={`mt-1 w-full resize-y rounded border px-2 py-1.5 text-[10px] font-normal outline-none focus:border-teal-600 disabled:bg-slate-50 ${returnReasonError ? 'border-red-400' : 'border-slate-200'}`}
							/>
							{ returnReasonError
								? <span id="department-return-reason-error" role="alert" className="mt-1 block text-[10px] font-medium text-red-600">{returnReasonError}</span>
								: <span id="department-return-reason-help" className="mt-1 block text-[9px] font-normal text-slate-500">Required when returning a request for correction.</span>}
						</label>
						{!canReview && <p className="mt-2 flex items-center gap-1 text-[10px] text-amber-700"><AlertCircle size={12} />This request is not open for Department Head review.</p>}
					</div>
					<div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
						<h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-900"><History size={14} className="text-blue-600" />Audit Information</h3>
						<AuditRow icon={CheckCircle2} label="Request submitted" value={formatDate(request.createdAt)} />
						<AuditRow icon={Clock3} label="Last updated" value={formatDate(request.updatedAt)} />
						<AuditRow icon={UserRound} label="Reviewed by" value={request.departmentReviewedBy || 'Not reviewed'} />
						<AuditRow icon={CalendarDays} label="Review date" value={formatDate(request.departmentReviewedAt)} />
					</div>
				</section>

				<div className="flex flex-wrap items-center justify-end gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
					<button type="button" onClick={() => saveDecision('In Progress')} disabled={saving || !canReview} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Save size={13} />{saving ? 'Saving...' : 'Save Progress'}</button>
					<button type="button" onClick={() => saveDecision('Returned')} disabled={saving || !canReview} className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-2 text-[10px] font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"><RotateCcw size={13} />Return for Correction</button>
					<button type="button" onClick={() => saveDecision('Approved')} disabled={saving || !canReview || !canApprove} className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-[10px] font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 size={13} />Approve &amp; Sign</button>
				</div>
			</>}
			{pendingDeleteItem && (
				<div
					className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
					onMouseDown={(event) => {
						if (event.target === event.currentTarget) setPendingDeleteItem(null);
					}}
				>
					<section role="alertdialog" aria-modal="true" aria-labelledby="delete-attachment-title" aria-describedby="delete-attachment-description" className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
						<div className="flex items-start gap-3">
							<span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-50 text-red-600"><Trash2 size={17} /></span>
							<div>
								<h2 id="delete-attachment-title" className="text-sm font-bold text-slate-900">Delete attachment?</h2>
								<p id="delete-attachment-description" className="mt-1 break-all text-xs text-slate-600">Are you sure you want to delete “{pendingDeleteItem.attachment?.fileName || 'file'}”? This cannot be undone.</p>
							</div>
						</div>
						<div className="mt-5 flex justify-end gap-2">
							<button type="button" onClick={() => setPendingDeleteItem(null)} disabled={Boolean(attachmentActionItem)} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
							<button type="button" onClick={() => void deleteAttachment()} disabled={Boolean(attachmentActionItem)} className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"><Trash2 size={13} />Delete file</button>
						</div>
					</section>
				</div>
			)}
		</div>
	);
}

function Info({ icon: Icon, label, value }) {
	return <div className="flex min-w-0 items-center gap-2 rounded-md bg-slate-50 p-2"><span className="rounded-md bg-teal-100 p-1.5 text-teal-800">{Icon ? <Icon size={15} /> : <FileText size={15} />}</span><span className="min-w-0"><span className="block text-[9px] font-semibold uppercase text-slate-400">{label}</span><span className="block truncate text-[11px] font-bold text-slate-800">{value}</span></span></div>;
}

function InfoRow({ label, value }) {
	return <div className="flex min-w-0 items-center justify-between gap-2 border-b border-slate-100 py-1.5 last:border-0"><span className="shrink-0 text-[10px] text-slate-500">{label}</span><span className="truncate text-right text-[10px] font-semibold text-slate-800">{value}</span></div>;
}

function AuditRow({ icon: Icon, label, value }) {
	return <div className="flex items-start gap-2 border-b border-slate-100 py-2 last:border-0"><Icon size={13} className="mt-0.5 shrink-0 text-blue-600" /><span className="min-w-0"><span className="block text-[9px] text-slate-500">{label}</span><span className="block truncate text-[10px] font-semibold text-slate-800">{value}</span></span></div>;
}