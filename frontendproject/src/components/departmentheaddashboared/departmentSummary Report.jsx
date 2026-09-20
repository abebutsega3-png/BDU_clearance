import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart3, Download, FileSpreadsheet, Filter, Printer, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/authContext';

const emptyStats = { total: 0, pending: 0, underReview: 0, approved: 0, returned: 0, completed: 0 };
const statusLabel = (status) => ({ 'In Progress': 'Under Review', Rejected: 'Returned' }[status] || status || 'Pending');

export default function DepartmentSummaryReport() {
	const { user } = useAuth();
	const [filters, setFilters] = useState({ fromDate: '', toDate: '', status: 'All', employee: 'All' });
	const [requests, setRequests] = useState([]);
	const [stats, setStats] = useState(emptyStats);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [submitMessage, setSubmitMessage] = useState('');
	const [submitting, setSubmitting] = useState(false);

	const loadReport = async () => {
		setLoading(true);
		setError('');
		try {
			const response = await axios.get('http://localhost:3000/api/clearance-requests', {
				headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
				params: {
					status: filters.status === 'All' ? 'All Requests' : filters.status,
					search: filters.employee === 'All' ? '' : filters.employee,
					fromDate: filters.fromDate,
					toDate: filters.toDate,
					page: 1,
					limit: 1000,
				}
			});
			const data = response.data || {};
			setRequests(data.requests || []);
			setStats({ total: data.stats?.all || 0, pending: data.stats?.pending || 0, underReview: data.stats?.underReview || 0, approved: data.stats?.approved || 0, returned: data.stats?.returned || 0, completed: data.stats?.completed || 0 });
		} catch {
			setError('Report data could not be loaded. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { loadReport(); }, []);

	const employees = [...new Map(requests.map((request) => [request.employeeId || request.employeeName, request.employeeName || request.employeeId])).entries()];
	const returned = requests.filter((request) => statusLabel(request.status) === 'Returned');
	const activities = requests.flatMap((request) => (request.departmentClearances || []).map((activity) => ({ request, activity }))).slice(0, 20);
	const setFilter = (name, value) => setFilters((current) => ({ ...current, [name]: value }));
	const submitToHr = async () => {
		setSubmitting(true);
		setSubmitMessage('');
		try {
			await axios.post('http://localhost:3000/api/reports/department-submissions', {
				period: `${filters.fromDate || 'All dates'} - ${filters.toDate || new Date().toLocaleDateString()}`,
				summary: stats,
				rows: requests,
			}, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
			setSubmitMessage('Report submitted to HR successfully.');
		} catch (submitError) {
			setSubmitMessage(submitError.response?.data?.message || 'Report could not be submitted to HR.');
		} finally {
			setSubmitting(false);
		}
	};

	const exportReport = (format) => {
		if (format === 'pdf' || format === 'print') {
			window.print();
			return;
		}
		const columns = ['Employee ID', 'Employee Name', 'Position', 'Clearance Type', 'Request Date', 'Status', 'Completion Date'];
		const rows = requests.map((request) => [request.employeeId, request.employeeName, request.position || request.employee?.position, request.clearanceType, request.requestDate, statusLabel(request.status), request.completionDate || request.relievingDate]);
		const csv = [columns, ...rows].map((row) => row.map((value) => `"${String(value || '').replaceAll('"', '""')}"`).join(',')).join('\n');
		const link = document.createElement('a');
		link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
		link.download = 'department-clearance-report.csv';
		link.click();
		URL.revokeObjectURL(link.href);
	};

	return <div className="space-y-5 text-slate-700 print:bg-white" id="department-report">
		<header className="flex flex-wrap items-end justify-between gap-3">
			<div><p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Department Head Portal</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Clearance Reports</h1><p className="mt-1 text-sm text-slate-500">Clearance status, activity, returns, and completion for {user?.department || 'your department'}.</p></div>
			<button type="button" onClick={loadReport} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-teal-500"><RefreshCw size={14} /> Refresh</button>
		</header>
		{error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
		<section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
			<div className="mb-4 flex items-center gap-2"><Filter size={17} className="text-teal-600" /><h2 className="text-base font-bold text-slate-900">Report Filter</h2></div>
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<Field label="From Date"><input type="date" value={filters.fromDate} onChange={(event) => setFilter('fromDate', event.target.value)} /></Field>
				<Field label="To Date"><input type="date" value={filters.toDate} onChange={(event) => setFilter('toDate', event.target.value)} /></Field>
				<Field label="Status"><select value={filters.status} onChange={(event) => setFilter('status', event.target.value)}><option>All</option><option>Pending</option><option>Under Review</option><option>Approved</option><option>Returned</option><option>Completed</option></select></Field>
				<Field label="Employee"><select value={filters.employee} onChange={(event) => setFilter('employee', event.target.value)}><option value="All">All</option>{employees.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></Field>
			</div>
			<button type="button" onClick={loadReport} className="mt-4 inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"><BarChart3 size={14} /> Generate Report</button>
		</section>
		<div className="flex flex-wrap items-center justify-end gap-2"><button type="button" onClick={() => exportReport('pdf')} className="action-button"><Download size={14} /> Export PDF</button><button type="button" onClick={() => exportReport('excel')} className="action-button"><FileSpreadsheet size={14} /> Export Excel</button><button type="button" onClick={() => exportReport('print')} className="action-button"><Printer size={14} /> Print</button><button type="button" onClick={submitToHr} disabled={submitting || loading} className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"><FileSpreadsheet size={14} /> {submitting ? 'Submitting...' : 'Submit Report to HR'}</button>{submitMessage && <span className={`text-xs font-medium ${submitMessage.includes('successfully') ? 'text-emerald-600' : 'text-red-600'}`}>{submitMessage}</span>}</div>
		<ReportTable title="Employee Clearance Report" columns={['Employee ID', 'Employee Name', 'Position', 'Clearance Type', 'Request Date', 'Status', 'Completion Date']} rows={requests.map((request) => [request.employeeId, request.employeeName, request.position || request.employee?.position || 'Not provided', request.clearanceType, request.requestDate, statusLabel(request.status), request.completionDate || request.relievingDate || '—'])} empty="No clearance records match the selected filters." />
		<ReportTable title="Returned Clearance Report" columns={['Employee', 'Request ID', 'Returned Date', 'Return Reason', 'Current Status']} rows={returned.map((request) => [request.employeeName || request.employeeId, request.requestId || request._id, request.updatedAt ? new Date(request.updatedAt).toLocaleDateString() : request.requestDate, request.remarks || request.reason || 'No reason provided', statusLabel(request.status)])} empty="No returned clearances in this report." />
		<ReportTable title="Clearance Activity Report" columns={['Employee', 'Action', 'Performed By', 'Date & Time', 'Remarks']} rows={activities.map(({ request, activity }) => [request.employeeName || request.employeeId, activity.action || activity.status || 'Updated', activity.performedBy || activity.departmentHead || 'Department Head', activity.date || activity.updatedAt || request.updatedAt, activity.remarks || activity.remark || '—'])} empty="No clearance activity is available." />
	</div>;
}

function Field({ label, children }) { return <label className="block text-xs font-semibold text-slate-500">{label}<span className="mt-1 block">{React.cloneElement(children, { className: 'w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-teal-600' })}</span></label>; }

function ReportTable({ title, columns, rows, empty }) { return <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-slate-100 p-5"><FileSpreadsheet size={17} className="text-teal-600" /><h2 className="text-base font-bold text-slate-900">{title}</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map((column) => <th key={column} className="whitespace-nowrap px-4 py-3 font-semibold">{column}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.length ? rows.map((row, index) => <tr key={`${title}-${index}`} className="hover:bg-slate-50">{row.map((value, valueIndex) => <td key={`${index}-${valueIndex}`} className="whitespace-nowrap px-4 py-3 text-slate-700">{value || '—'}</td>)}</tr>) : <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-500">{empty}</td></tr>}</tbody></table></div></section>; }
