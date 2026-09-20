import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bell, CheckCheck, Clock, Eye, Filter, RotateCcw, Trash2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000')
	.replace(/\/api\/clearance\/?$/, '')
	.replace(/\/api\/?$/, '');
const API_URL = `${API_BASE_URL}/api/notifications`;
const DEPARTMENT_TYPES = new Set([
	'NEW_CLEARANCE_REQUEST',
	'REQUEST_ASSIGNED',
	'CLEARANCE_RESUBMITTED',
	'PENDING_CLEARANCE_REMINDER',
	'CLEARANCE_UPDATED',
	'CLEARANCE_REQUEST_RETURNED',
	'CLEARANCE_APPROVED',
	'CLEARANCE_READY_FOR_REVIEW',
	'REVIEW_REMINDER',
	'EMPLOYEE_UPDATED_REQUEST_DEPARTMENT',
	'CLEARANCE_RETURNED',
	'ALL_DEPARTMENT_TASKS_COMPLETED',
	'FINAL_HR_CLEARANCE_UPDATE',
]);

const authConfig = () => ({
	headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
});

const normalize = (item) => ({
	...item,
	eventType: String(item.type || item.title || '').toUpperCase().replace(/\s+/g, '_'),
	requestId: item.relatedRequestId || item.clearanceRequestId || '',
});

const iconFor = (type) => {
	if (type.includes('RESUBMITTED')) return <RotateCcw size={19} className="text-amber-600" />;
	if (type.includes('PENDING')) return <Clock size={19} className="text-orange-600" />;
	if (type.includes('ASSIGNED')) return <Users size={19} className="text-teal-700" />;
	return <Bell size={19} className="text-blue-600" />;
};

export default function DepartmentNotifications() {
	const navigate = useNavigate();
	const [notifications, setNotifications] = useState([]);
	const [filter, setFilter] = useState('All');
	const [loading, setLoading] = useState(true);

	const loadNotifications = async () => {
		try {
			const response = await axios.get(`${API_URL}/my`, authConfig());
			const payload = response.data?.data || response.data?.notifications || [];
			setNotifications(Array.isArray(payload) ? payload.map(normalize).filter((item) => DEPARTMENT_TYPES.has(item.eventType)) : []);
		} catch (error) {
			console.error('Unable to load department notifications:', error);
			setNotifications([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadNotifications();
		const interval = window.setInterval(loadNotifications, 15000);
		return () => window.clearInterval(interval);
	}, []);

	const markAsRead = async (notification) => {
		if (notification.isRead) return;
		try {
			await axios.patch(`${API_URL}/${notification._id}`, {}, authConfig());
			setNotifications((current) => current.map((item) => item._id === notification._id ? { ...item, isRead: true } : item));
		} catch (error) {
			console.error('Unable to mark department notification as read:', error);
		}
	};

	const deleteNotification = async (notification) => {
		try {
			await axios.delete(`${API_URL}/${notification._id}`, authConfig());
			setNotifications((current) => current.filter((item) => item._id !== notification._id));
		} catch (error) {
			console.error('Unable to delete department notification:', error);
		}
	};

	const openRequest = async (notification) => {
		await markAsRead(notification);
		const link = notification.requestId
			? `/department-head/clearance-requests?requestId=${encodeURIComponent(notification.requestId)}`
			: notification.actionLink;
		navigate(link && link !== '#' ? link : '/department-head/clearance-requests');
	};

	const visible = notifications.filter((item) => filter === 'All' || (filter === 'Unread' && !item.isRead) || (filter === 'Read' && item.isRead));
	const unreadCount = notifications.filter((item) => !item.isRead).length;

	return (
		<section className="min-h-screen bg-slate-50 p-5 text-slate-800 md:p-7">
			<div className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center">
				<div className="flex items-center gap-3">
					<div className="rounded-xl bg-teal-700 p-3 text-white"><Bell size={22} /></div>
					<div><h1 className="text-2xl font-bold text-slate-900">Notifications</h1><p className="text-sm text-slate-500">Department clearance activity</p></div>
					{unreadCount > 0 && <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white">{unreadCount} unread</span>}
				</div>
				<div className="flex items-center gap-1 rounded-lg bg-slate-200 p-1">
					<Filter size={15} className="ml-2 text-slate-500" />
					{['All', 'Unread', 'Read'].map((tab) => <button key={tab} type="button" onClick={() => setFilter(tab)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${filter === tab ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600'}`}>{tab}{tab === 'Unread' ? ` (${unreadCount})` : ''}</button>)}
				</div>
			</div>

			{loading ? <div className="rounded-xl border bg-white p-10 text-center text-sm text-slate-500">Loading notifications...</div> : visible.length === 0 ? <div className="rounded-xl border bg-white p-10 text-center text-sm text-slate-500">No department notifications found.</div> : <div className="space-y-3">
				{visible.map((item) => <article key={item._id} className={`flex flex-col justify-between gap-4 rounded-xl border p-4 md:flex-row md:items-center ${item.isRead ? 'border-slate-200 bg-white' : 'border-teal-200 bg-teal-50/50'}`}>
					<div className="flex items-start gap-3"><div className="relative rounded-lg border bg-white p-2.5">{iconFor(item.eventType)}{!item.isRead && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-blue-600" />}</div><div><h2 className="font-bold text-slate-900">{item.title}</h2><p className="mt-1 text-sm text-slate-600">{item.message}</p><div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400"><span>{item.requestId || 'Clearance request'}</span><span>{item.createdAt ? new Date(item.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}</span></div></div></div>
					<div className="flex items-center justify-end gap-2"><button type="button" onClick={() => openRequest(item)} className="flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800"><Eye size={15} />{item.actionText || 'View Request'}</button><button type="button" onClick={() => deleteNotification(item)} title="Delete notification" aria-label="Delete notification" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={17} /></button></div>
				</article>)}
			</div>}
			{unreadCount > 0 && <button type="button" onClick={async () => { await axios.patch(`${API_URL}/mark-all-read`, {}, authConfig()); loadNotifications(); }} className="mt-5 flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-teal-700"><CheckCheck size={16} /> Mark all as read</button>}
		</section>
	);
}
