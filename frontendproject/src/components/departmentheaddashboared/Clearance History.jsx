import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Calendar, Eye, Filter, RotateCcw, Search, X } from 'lucide-react';

const API_URL = 'http://localhost:3000/api/clearance-requests';
const HISTORY_STATUSES = ['All', 'Approved', 'Returned'];

const getDepartmentDecision = (request) => request.departmentClearance
	|| (Array.isArray(request.departmentClearances) ? request.departmentClearances[request.departmentClearances.length - 1] : null)
	|| (Array.isArray(request.workflow) ? [...request.workflow].reverse().find((step) => /department/i.test(step.office || step.name || '') && ['Approved', 'Returned'].includes(step.status)) : null)
	|| (request.departmentStatus ? {
		status: request.departmentStatus,
		reviewedBy: request.departmentReviewedBy,
		reviewedAt: request.departmentReviewedAt,
		returnReason: request.departmentReturnReason,
		comment: request.departmentComment,
	} : null);

export default function ClearanceHistory() {
	const [requests, setRequests] = useState([]);
	const [selectedRequest, setSelectedRequest] = useState(null);
	const [search, setSearch] = useState('');
	const [status, setStatus] = useState('All');
	const [clearanceType, setClearanceType] = useState('All');
	const [fromDate, setFromDate] = useState('');
	const [toDate, setToDate] = useState('');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const fetchHistory = async (filterOverrides = {}) => {
		setLoading(true);
		setError('');
		try {
			const response = await axios.get(API_URL, {
				headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
				params: {
					status: filterOverrides.status ?? status,
					history: 'true',
					  search: filterOverrides.search ?? search,
					  clearanceType: filterOverrides.clearanceType ?? clearanceType,
					  fromDate: filterOverrides.fromDate ?? fromDate,
					  toDate: filterOverrides.toDate ?? toDate,
					page: 1,
					limit: 100
				}
			});
			setRequests((response.data.requests || []).filter((request) => {
				const decision = getDepartmentDecision(request);
				return ['Approved', 'Returned'].includes(decision?.status);
			}));
		} catch (requestError) {
			setError(requestError.response?.data?.message || 'Unable to load clearance history.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { fetchHistory(); }, []);

	const resetFilters = () => {
		setSearch('');
		setStatus('All');
		setClearanceType('All');
		setFromDate('');
		setToDate('');
		fetchHistory({ status: 'All', search: '', clearanceType: 'All', fromDate: '', toDate: '' });
	};

	const formatDate = (value, withTime = false) => {
		if (!value) return '—';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return value;
		return date.toLocaleDateString('en-US', withTime
			? { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }
			: { month: 'short', day: 'numeric', year: 'numeric' });
	};

	return (
		<div className="min-h-screen bg-slate-50 p-5 text-sm text-slate-700 md:p-7">
			<div className="mb-6 flex flex-wrap items-end justify-between gap-3">
				<div>
					<p className="mb-1 text-xs font-semibold uppercase tracking-widest text-teal-700">Department Head</p>
					<h1 className="text-2xl font-bold text-slate-900">Clearance History</h1>
					<p className="mt-1 text-xs text-slate-500">Track completed requests and every recorded action.</p>
				</div>
				<p className="text-xs text-slate-400">Home / Clearance History</p>
			</div>

			<section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
				<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
					<label className="relative lg:col-span-2">
						<span className="sr-only">Search employee name or ID</span>
						<Search size={16} className="absolute left-3 top-3 text-slate-400" />
						<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Employee Name or ID..." className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-teal-600" />
					</label>
					<select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-teal-600">
						{HISTORY_STATUSES.map((item) => <option key={item} value={item}>{item === 'All' ? 'All Statuses' : item}</option>)}
					</select>
					<select value={clearanceType} onChange={(event) => setClearanceType(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-teal-600">
						<option value="All">All Clearance Types</option>
						<option value="Separation">Separation</option>
						<option value="Transfer">Transfer</option>
						<option value="Resignation">Resignation</option>
					</select>
					<div className="flex gap-2 lg:col-span-5">
						<label className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><Calendar size={14} className="text-slate-400" /><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="min-w-0 bg-transparent text-xs outline-none" aria-label="From date" /></label>
						<label className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><Calendar size={14} className="text-slate-400" /><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="min-w-0 bg-transparent text-xs outline-none" aria-label="To date" /></label>
						<button type="button" onClick={fetchHistory} className="flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800"><Filter size={15} />Search</button>
						<button type="button" onClick={resetFilters} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 hover:bg-slate-50"><RotateCcw size={15} />Reset</button>
					</div>
				</div>
			</section>

			<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
				<div className="flex items-center justify-between border-b border-slate-200 px-4 py-4"><h2 className="font-bold text-slate-900">Clearance History Table</h2><span className="text-xs text-slate-400">{requests.length} records</span></div>
				{error && <p className="p-5 text-center text-sm text-red-600">{error}</p>}
				<div className="overflow-x-auto">
					<table className="w-full min-w-[850px] text-left text-xs">
						<thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Request ID</th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Clearance Type</th><th className="px-4 py-3">Submitted Date</th><th className="px-4 py-3">Review Date</th><th className="px-4 py-3">Department Decision</th><th className="px-4 py-3 text-center">Action</th></tr></thead>
						<tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan="7" className="py-10 text-center text-slate-400">Loading history...</td></tr> : requests.length === 0 ? <tr><td colSpan="7" className="py-10 text-center text-slate-400">No clearance history found.</td></tr> : requests.map((request) => { const decision = getDepartmentDecision(request); return <tr key={request._id || request.requestId} className="hover:bg-slate-50"><td className="px-4 py-4 font-bold text-slate-800">{request.requestId || request._id}</td><td className="px-4 py-4"><p className="font-semibold text-slate-800">{request.employeeName || '—'}</p><p className="text-[11px] text-slate-400">{request.employeeId || '—'}</p></td><td className="px-4 py-4">{request.clearanceType || '—'}</td><td className="px-4 py-4">{formatDate(request.requestDate || request.createdAt)}</td><td className="px-4 py-4">{formatDate(decision?.reviewedAt || decision?.updatedAt)}</td><td className="px-4 py-4"><StatusBadge status={decision?.status} /></td><td className="px-4 py-4 text-center"><button type="button" onClick={() => setSelectedRequest(request)} className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 font-semibold text-teal-700 hover:bg-teal-100"><Eye size={14} />View</button></td></tr>; })}</tbody>
					</table>
				</div>
			</section>

			{selectedRequest && <HistoryModal request={selectedRequest} formatDate={formatDate} onClose={() => setSelectedRequest(null)} />}
		</div>
	);
}

function StatusBadge({ status }) {
	const styles = status === 'Returned' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700';
	return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${styles}`}>{status || 'Unknown'}</span>;
}

function HistoryModal({ request, formatDate, onClose }) {
	const decision = getDepartmentDecision(request);
	const events = [
		{ action: 'Employee submitted clearance request', by: request.employeeName || 'Employee', date: request.requestDate || request.createdAt, status: 'Submitted', remarks: request.reason || 'Request submitted for review.' },
		{ action: 'Department Head reviewed clearance items', by: decision?.reviewedBy || 'Department Head', date: decision?.reviewedAt || decision?.updatedAt, status: decision?.status, remarks: decision?.returnReason || decision?.comment || 'No remarks recorded.' },
	];

	return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={onClose}><section role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}><header className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-bold text-slate-900">Clearance Request History</h2><p className="mt-1 text-xs text-slate-500">{request.requestId || request._id}</p></div><button type="button" aria-label="Close history" onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><X size={17} /></button></header><div className="grid gap-3 border-b border-slate-200 p-5 sm:grid-cols-2"><Info label="Employee ID" value={request.employeeId} /><Info label="Employee Name" value={request.employeeName} /><Info label="Department" value={request.department?.name || request.department} /><Info label="Position" value={request.position} /><Info label="Request ID" value={request.requestId || request._id} /><Info label="Clearance Type" value={request.clearanceType} /><Info label="Submitted Date" value={formatDate(request.requestDate || request.createdAt, true)} /><Info label="Final Status" value={<StatusBadge status={request.status} />} /></div><div className="p-5"><h3 className="mb-4 font-bold text-slate-900">Activity / Action History</h3><div className="space-y-5">{events.map((event, index) => <div key={`${event.action}-${index}`} className="relative pl-8"><span className="absolute left-0 top-1 h-3 w-3 rounded-full bg-teal-600 ring-4 ring-teal-50" />{index < events.length - 1 && <span className="absolute left-[5px] top-4 h-full w-0.5 bg-slate-200" />}<p className="text-sm font-semibold text-slate-800">{event.action}</p><p className="mt-1 text-xs text-slate-500">{formatDate(event.date, true)}</p><div className="mt-2 grid gap-2 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-2"><p><b>Performed By:</b> {event.by}</p><p><b>Status:</b> {event.status}</p><p className="sm:col-span-2"><b>Remarks:</b> {event.remarks}</p></div></div>)}</div></div></section></div>;
}

function Info({ label, value }) { return <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xs font-semibold text-slate-800">{value || 'Not provided'}</p></div>; }
