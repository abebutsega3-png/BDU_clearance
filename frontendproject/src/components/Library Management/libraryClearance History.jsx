import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CalendarDays, CheckCircle2, Eye, FileClock, RotateCcw, Search, X, XCircle } from 'lucide-react';

const apiUrl = 'http://localhost:3000/api/clearance';
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
const decisionLabel = { Completed: 'Approved', Rejected: 'Returned' };

const statusOf = (request) => request.libraryStatus || request.status;
const formatDate = (value, withTime = false) => {
	if (!value) return '-';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '-';
	return date.toLocaleDateString('en-US', withTime ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function LibraryClearanceHistory() {
	const [requests, setRequests] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [search, setSearch] = useState('');
	const [status, setStatus] = useState('');
	const [fromDate, setFromDate] = useState('');
	const [toDate, setToDate] = useState('');
	const [selected, setSelected] = useState(null);

	const loadHistory = async () => {
		try {
			setLoading(true);
			const { data } = await axios.get(apiUrl, { headers: headers() });
			setRequests((data.clearances || []).filter((request) => ['Completed', 'Rejected'].includes(statusOf(request))));
		} catch (requestError) {
			setError(requestError.response?.data?.message || 'Unable to load clearance history.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { loadHistory(); }, []);

	const visibleRequests = requests.filter((request) => {
		const requestStatus = statusOf(request);
		const dateValue = new Date(request.libraryDecisionDate || request.updatedAt || request.createdAt);
		const query = [request.requestId, request.employeeId, request.employeeName, request.employee?.fullName].filter(Boolean).join(' ').toLowerCase();
		return (!search.trim() || query.includes(search.trim().toLowerCase()))
			&& (!status || requestStatus === status)
			&& (!fromDate || dateValue >= new Date(`${fromDate}T00:00:00`))
			&& (!toDate || dateValue <= new Date(`${toDate}T23:59:59`));
	});

	const reset = () => { setSearch(''); setStatus(''); setFromDate(''); setToDate(''); };
	const approvedCount = requests.filter((request) => statusOf(request) === 'Completed').length;
	const returnedCount = requests.filter((request) => statusOf(request) === 'Rejected').length;

	return (
		<main className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-6">
			<div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Library Officer</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Clearance History</h1><p className="mt-1 text-sm text-slate-500">Review previous library clearance decisions and officer actions.</p></div>
			<div className="mb-5 grid gap-3 sm:grid-cols-3">
				<SummaryCard label="Total Decisions" value={requests.length} icon={FileClock} tone="text-slate-700 bg-slate-100" />
				<SummaryCard label="Approved" value={approvedCount} icon={CheckCircle2} tone="text-emerald-700 bg-emerald-50" />
				<SummaryCard label="Returned" value={returnedCount} icon={RotateCcw} tone="text-rose-700 bg-rose-50" />
			</div>
			<section className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_auto]">
					<label className="relative block"><Search size={15} className="absolute left-3 top-2.5 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee, employee ID, or request ID" className="w-full rounded-md border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-teal-600" /></label>
					<select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal-600"><option value="">All decisions</option><option value="Completed">Approved</option><option value="Rejected">Returned</option></select>
					<label className="flex items-center gap-2 rounded-md border border-slate-200 px-3"><CalendarDays size={14} className="text-slate-400" /><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="From decision date" className="min-w-0 py-2 text-xs outline-none" /></label>
					<label className="flex items-center gap-2 rounded-md border border-slate-200 px-3"><CalendarDays size={14} className="text-slate-400" /><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} aria-label="To decision date" className="min-w-0 py-2 text-xs outline-none" /></label>
					<button type="button" onClick={reset} className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><X size={14} /> Reset</button>
				</div>
			</section>
			<section className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
				{loading ? <p className="p-10 text-center text-sm text-slate-400">Loading clearance history...</p> : error ? <p className="p-10 text-center text-sm text-rose-600">{error}</p> : <table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Request ID</th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Employee ID</th><th className="px-4 py-3">Decision Date</th><th className="px-4 py-3">Decision</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleRequests.length === 0 ? <tr><td colSpan="6" className="p-10 text-center text-slate-400">No library decisions found.</td></tr> : visibleRequests.map((request) => { const requestStatus = statusOf(request); return <tr key={request._id} className="hover:bg-slate-50"><td className="px-4 py-3 font-semibold">{request.requestId || '-'}</td><td className="px-4 py-3">{request.employeeName || request.employee?.fullName || 'Unknown employee'}</td><td className="px-4 py-3">{request.employeeId || '-'}</td><td className="px-4 py-3">{formatDate(request.libraryDecisionDate || request.updatedAt || request.createdAt)}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 font-semibold ${requestStatus === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{decisionLabel[requestStatus] || requestStatus}</span></td><td className="px-4 py-3 text-right"><button type="button" onClick={() => setSelected(request)} className="inline-flex items-center gap-1 rounded border border-teal-200 px-2 py-1 font-semibold text-teal-700 hover:bg-teal-50"><Eye size={13} /> View</button></td></tr>; })}</tbody></table>}
			</section>
			{selected && <HistoryDetails request={selected} onClose={() => setSelected(null)} />}
		</main>
	);
}

function SummaryCard({ label, value, icon: Icon, tone }) {
	return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-md ${tone}`}><Icon size={17} /></div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p></div>;
}

function HistoryDetails({ request, onClose }) {
	const approved = statusOf(request) === 'Completed';
	const submitted = request.submittedDate || request.requestDate || request.createdAt;
	const decisionDate = request.libraryDecisionDate || request.updatedAt || request.createdAt;
	const events = [{ date: submitted, action: 'Request Submitted', by: 'Employee' }, { date: request.libraryReviewDate || (approved || request.libraryStatus ? request.updatedAt : null), action: 'Review Started', by: 'Library Officer' }, { date: decisionDate, action: approved ? 'Clearance Approved' : 'Request Returned', by: 'Library Officer' }].filter((event, index, list) => event.date && (index !== 1 || new Date(event.date).getTime() !== new Date(list[0].date).getTime()));
	return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 p-4"><div className="mx-auto my-8 max-w-2xl rounded-xl bg-white shadow-xl"><div className="flex items-start justify-between border-b border-slate-200 p-5"><div><h2 className="text-lg font-bold text-slate-900">Clearance History Details</h2><p className="mt-1 text-xs text-slate-500">{request.requestId || '-'} · {request.employeeName || request.employee?.fullName || 'Unknown employee'} · {request.employeeId || '-'}</p></div><button type="button" onClick={onClose} aria-label="Close history details" className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><X size={17} /></button></div><div className="p-5"><div className={`flex items-center gap-2 rounded-lg border p-4 ${approved ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>{approved ? <CheckCircle2 className="text-emerald-600" size={20} /> : <XCircle className="text-rose-600" size={20} />}<div><p className="text-[10px] font-semibold uppercase text-slate-500">Final Library Decision</p><p className={`text-base font-bold ${approved ? 'text-emerald-700' : 'text-rose-700'}`}>{approved ? 'APPROVED' : 'RETURNED'}</p></div></div><div className="mt-5"><h3 className="mb-3 text-sm font-bold text-slate-900">Actions</h3><div className="space-y-3 border-l-2 border-slate-200 pl-4">{events.map((event) => <div key={`${event.action}-${event.date}`} className="relative"><span className="absolute -left-[25px] top-1 h-3 w-3 rounded-full bg-teal-600 ring-4 ring-white" /><p className="text-xs font-semibold text-slate-800">{event.action}</p><p className="text-[11px] text-slate-500">{formatDate(event.date, true)} · {event.by}</p></div>)}</div></div><div className="mt-5 rounded-lg bg-slate-50 p-4 text-xs"><p className="font-semibold text-slate-700">Officer Comment</p><p className="mt-1 text-slate-600">{approved ? (request.libraryComment || request.comment || 'No outstanding library obligation.') : (request.libraryReturnReason || request.returnReason || request.remarks || 'No return reason recorded.')}</p></div></div></div></div>;
}
