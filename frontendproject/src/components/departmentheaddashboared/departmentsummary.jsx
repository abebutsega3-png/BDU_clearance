import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bell, ClipboardList, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const emptyData = {
	department: 'Department', departmentHead: 'Department Head', employees: { total: 0, active: 0 },
	stats: { pending: 0, underReview: 0, approved: 0, returned: 0, completed: 0 }, recentRequests: [], notifications: []
};

const cards = [
	['Total Employees', 'employees.total', 'text-teal-700'], ['Pending', 'stats.pending', 'text-amber-600'],
	['Under Review', 'stats.underReview', 'text-blue-600'], ['Approved', 'stats.approved', 'text-emerald-600'],
	['Returned', 'stats.returned', 'text-red-600'], ['Completed', 'stats.completed', 'text-slate-600']
];

const valueAt = (data, path) => path.split('.').reduce((value, key) => value?.[key], data) || 0;

export default function DepartmentSummary() {
	const [data, setData] = useState(emptyData);
	const [selectedRequest, setSelectedRequest] = useState(null);
	const [error, setError] = useState('');

	useEffect(() => {
		axios.get('http://localhost:3000/api/clearance-requests/summary', {
			headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
		}).then((response) => setData({ ...emptyData, ...response.data }))
			.catch(() => setError('Dashboard data could not be loaded.'));
	}, []);

	const requestTotal = Object.values(data.stats).reduce((sum, count) => sum + count, 0);
	return (
		<div className="space-y-5 text-slate-700">
			<header><p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Department Head Portal</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Dashboard</h1><p className="mt-1 text-sm text-slate-500">Overview and monitoring for your department.</p></header>
			{error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{cards.map(([label, path, color]) => <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium text-slate-500">{label}</p><p className={`mt-2 text-2xl font-bold ${color}`}>{valueAt(data, path)}</p></div>)}
			</div>

			<div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
				<section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-slate-900">My Department Overview</h2><div className="mt-4 space-y-3 text-sm"><Info label="Department" value={data.department} /><Info label="Department Head" value={data.departmentHead} /><Info label="Total Employees" value={data.employees.total} /><Info label="Active Employees" value={data.employees.active} /></div></section>
				<section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-base font-bold text-slate-900">Clearance Requests</h2><ClipboardList className="text-teal-600" size={18} /></div><div className="mt-4 space-y-3">{[['Pending', 'pending', 'bg-amber-500'], ['Under Review', 'underReview', 'bg-blue-500'], ['Approved', 'approved', 'bg-emerald-500'], ['Returned', 'returned', 'bg-red-500'], ['Completed', 'completed', 'bg-slate-500']].map(([label, key, color]) => <div key={key} className="flex items-center gap-3 text-sm"><span className={`h-2.5 w-2.5 rounded-full ${color}`} /><span className="w-28">{label}</span><div className="h-2 flex-1 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${color}`} style={{ width: `${requestTotal ? (data.stats[key] / requestTotal) * 100 : 0}%` }} /></div><strong className="w-7 text-right">{data.stats[key]}</strong></div>)}</div></section>
			</div>

			<div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]"><section className="rounded-lg border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 p-5"><h2 className="text-base font-bold text-slate-900">Recent Clearance Requests</h2><Link to="/department-head/clearance-requests" className="text-xs font-semibold text-teal-700">View all <ArrowRight className="inline" size={13} /></Link></div><div className="divide-y divide-slate-100">{data.recentRequests.length ? data.recentRequests.map((request) => <div key={request._id} className="flex items-center justify-between gap-3 p-4 text-sm"><div><p className="font-semibold text-slate-900">{request.employeeName || request.employeeId}</p><p className="text-xs text-slate-500">{request.clearanceType} · {request.requestDate || 'Date not provided'}</p></div><div className="flex items-center gap-3"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs">{request.status === 'In Progress' ? 'Under Review' : request.status}</span><button type="button" onClick={() => setSelectedRequest(request)} className="text-xs font-semibold text-teal-700 hover:text-teal-900">View</button></div></div>) : <p className="p-5 text-sm text-slate-500">No recent requests.</p>}</div></section><section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Bell className="text-teal-600" size={18} /><h2 className="text-base font-bold text-slate-900">Recent Notifications</h2></div><div className="mt-4 space-y-4">{data.notifications.length ? data.notifications.map((notification) => <div key={notification._id}><p className="text-sm font-semibold text-slate-800">{notification.title}</p><p className="mt-1 text-xs text-slate-500">{notification.message}</p></div>) : <p className="text-sm text-slate-500">No recent notifications.</p>}</div></section></div>
			<section className="rounded-lg border border-amber-200 bg-amber-50 p-5"><div className="flex items-center gap-3"><Users className="text-amber-700" size={20} /><div><h2 className="font-bold text-amber-900">Pending Requests</h2><p className="mt-1 text-sm text-amber-800">{data.stats.pending} requests are waiting for your review.</p></div><Link to="/department-head/clearance-requests?status=Pending" className="ml-auto rounded-md bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800">View All Requests</Link></div></section>
			{selectedRequest && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={() => setSelectedRequest(null)}><section role="dialog" aria-modal="true" className="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h2 className="text-base font-bold text-slate-900">Clearance Request Details</h2><button type="button" onClick={() => setSelectedRequest(null)} className="text-sm text-slate-500">Close</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{[['Employee', selectedRequest.employeeName], ['Employee ID', selectedRequest.employeeId], ['Department', selectedRequest.department], ['Type', selectedRequest.clearanceType], ['Request Date', selectedRequest.requestDate], ['Status', selectedRequest.status]].map(([label, value]) => <Info key={label} label={label} value={value} />)}</div></section></div>}
		</div>
	);
}

function Info({ label, value }) { return <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">{label}</span><strong className="text-right text-slate-800">{value || 'Not provided'}</strong></div>; }
