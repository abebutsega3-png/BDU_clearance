import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import {
	Activity,
	ArrowRight,
	BarChart3,
	Bell,
	Bus,
	CheckCircle2,
	ChevronRight,
	Clock3,
	FileCheck2,
	LoaderCircle,
	RotateCcw,
	TriangleAlert,
} from 'lucide-react';
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import TransportNavbar from '../components/transportdashboared/transportnavbar';
import TransportSidebar from '../components/transportdashboared/transport sidbar';
import TransportClearanceRequests from '../components/transportdashboared/TransportClearanceRequests';
import AssignedVehicleRecords from '../components/transportdashboared/AssignedVehicleRecords';
import TransportClearanceHistory from '../components/transportdashboared/TransportClearanceHistory';
import TransportReports from '../components/transportdashboared/TransportReports';
import TransportProfile from '../components/transportdashboared/TransportProfile';
import TransportNotifications from '../components/transportdashboared/TransportNotifications';
import TransportChangePassword from '../components/transportdashboared/TransportChangePassword';
import TransportDashboardSettings from '../components/transportdashboared/TransportDashboardSettings';

const summaryCards = [
	{ key: 'pendingRequests', label: 'Pending Requests', icon: Clock3, color: 'amber' },
	{ key: 'assignedVehicles', label: 'Assigned Vehicles', icon: Bus, color: 'sky', fleet: true },
	{ key: 'clearedRequests', label: 'Cleared Requests', icon: CheckCircle2, color: 'emerald' },
	{ key: 'returnedRequests', label: 'Returned Requests', icon: RotateCcw, color: 'orange' },
	{ key: 'totalVehicles', label: 'Total Vehicles', icon: Bus, color: 'cyan', fleet: true },
];

const cardColors = {
	amber: 'bg-amber-50 text-amber-700 ring-amber-100',
	sky: 'bg-sky-50 text-sky-700 ring-sky-100',
	emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
	orange: 'bg-orange-50 text-orange-700 ring-orange-100',
	cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
};

const statusColors = ['#f59e0b', '#10b981', '#f97316'];

const getMonthlyChartData = (monthlyRequests = []) => {
	const requestsByMonth = new Map(monthlyRequests.map((item) => [item.month, item.requests]));

	return Array.from({ length: 6 }, (_, index) => {
		const date = new Date();
		date.setDate(1);
		date.setMonth(date.getMonth() - (5 - index));
		const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
		return {
			month: date.toLocaleString('en-US', { month: 'short' }),
			requests: requestsByMonth.get(key) || 0,
		};
	});
};

const formatDate = (value) => {
	if (!value) return 'N/A';
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
};

const statusClass = (status) => {
	if (status === 'Approved') return 'bg-emerald-50 text-emerald-700';
	if (status === 'Returned') return 'bg-orange-50 text-orange-700';
	if (status === 'Under Review') return 'bg-sky-50 text-sky-700';
	return 'bg-amber-50 text-amber-700';
};

export default function TransportOfficerDashboard() {
	const location = useLocation();
	const navigate = useNavigate();
	const isRequestsPage = location.pathname === '/transport-office/requests';
	const isAssignedVehiclesPage = location.pathname === '/transport-office/assigned-vehicles';
	const isHistoryPage = location.pathname === '/transport-office/history';
	const isReportsPage = location.pathname === '/transport-office/reports';
	const isNotificationsPage = location.pathname === '/transport-office/notifications';
	const isProfilePage = location.pathname === '/transport-office/profile';
	const isChangePasswordPage = location.pathname === '/transport-office/change-password';
	const isSettingsPage = location.pathname === '/transport-office/settings';
	const [dashboardData, setDashboardData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [retryCount, setRetryCount] = useState(0);

	useEffect(() => {
		const controller = new AbortController();
		if (isRequestsPage || isAssignedVehiclesPage || isHistoryPage || isReportsPage || isNotificationsPage || isProfilePage || isChangePasswordPage || isSettingsPage) return () => controller.abort();

		const fetchDashboard = async () => {
			setLoading(true);
			setError('');

			try {
				const token = localStorage.getItem('token');
				const response = await axios.get('http://localhost:3000/api/transport/dashboard', {
					headers: { Authorization: `Bearer ${token || ''}` },
					signal: controller.signal,
				});
				setDashboardData(response.data);
			} catch (requestError) {
				if (!controller.signal.aborted) {
					setError(requestError.response?.data?.message || 'Unable to load transport dashboard data.');
				}
			} finally {
				if (!controller.signal.aborted) setLoading(false);
			}
		};

		fetchDashboard();
		return () => controller.abort();
	}, [retryCount, isRequestsPage, isAssignedVehiclesPage, isHistoryPage, isReportsPage, isNotificationsPage, isProfilePage, isChangePasswordPage, isSettingsPage]);

	const summary = dashboardData?.summary || {};
	const fleet = dashboardData?.fleet || {};
	const requests = dashboardData?.requests || [];
	const recentActivities = dashboardData?.recentActivities || [];
	const monthlyChartData = getMonthlyChartData(dashboardData?.monthlyRequests);
	const statusChartData = [
		{ name: 'Pending', value: summary.pendingRequests || 0 },
		{ name: 'Cleared', value: summary.clearedRequests || 0 },
		{ name: 'Returned', value: summary.returnedRequests || 0 },
	];
	const hasStatusData = statusChartData.some((item) => item.value > 0);

	return (
		<div className="min-h-screen bg-slate-100 text-slate-800">
			<TransportNavbar />
			<TransportSidebar />
			<main className="min-h-[calc(100vh-4rem)] px-4 py-5 pl-20 sm:px-6 sm:pl-24 md:ml-64 md:px-8 md:pl-8">
				<div className="mx-auto w-full max-w-7xl space-y-5">
					{isRequestsPage ? <TransportClearanceRequests /> : isAssignedVehiclesPage ? <AssignedVehicleRecords /> : isHistoryPage ? <TransportClearanceHistory /> : isReportsPage ? <TransportReports /> : isNotificationsPage ? <TransportNotifications /> : isProfilePage ? <TransportProfile /> : isChangePasswordPage ? <TransportChangePassword /> : isSettingsPage ? <TransportDashboardSettings /> : <>
					{error && (
						<div className="flex flex-col gap-3 rounded-md border border-rose-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-start gap-2 text-sm text-rose-700">
								<TriangleAlert size={17} className="mt-0.5 shrink-0" />
								<p>{error}</p>
							</div>
							<button
								type="button"
								onClick={() => setRetryCount((count) => count + 1)}
								className="rounded-md bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800"
							>
								Try again
							</button>
						</div>
					)}

					<section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5" aria-label="Transport summary">
						{summaryCards.map(({ key, label, icon: Icon, color, fleet: isFleetMetric }) => {
							const value = isFleetMetric
								? (fleet.available ? fleet[key] : null)
								: (summary[key] || 0);

							return (
								<article key={key} className="min-w-0 rounded-md border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
									<div className="flex items-start justify-between gap-2">
										<p className="text-xs font-semibold leading-5 text-slate-600">{label}</p>
										<span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ring-1 ${cardColors[color]}`}>
											<Icon size={16} />
										</span>
									</div>
									<p className="mt-3 text-2xl font-bold text-slate-900">
										{loading ? <span className="text-slate-300">...</span> : value ?? '—'}
									</p>
									<p className="mt-1 truncate text-[10px] text-slate-500">
										{isFleetMetric && !fleet.available ? 'Fleet data not connected' : 'Live from clearance records'}
									</p>
								</article>
							);
						})}
					</section>

					<section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
						<div className="space-y-5 xl:col-span-2">
							<article className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
								<div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
									<div>
										<h2 className="text-sm font-bold text-slate-900">Pending Transport Clearance Requests</h2>
										<p className="mt-0.5 text-[11px] text-slate-500">Requests routed to the Transport office</p>
									</div>
									<button
										type="button"
										onClick={() => navigate('/transport-office/requests')}
										className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900"
									>
										View all <ChevronRight size={14} />
									</button>
								</div>
								<div className="overflow-x-auto">
									<table className="w-full min-w-[650px] text-left text-xs">
										<thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
											<tr>
												<th className="px-4 py-3 font-semibold">Request ID</th>
												<th className="px-4 py-3 font-semibold">Employee</th>
												<th className="px-4 py-3 font-semibold">Department</th>
												<th className="px-4 py-3 font-semibold">Request date</th>
												<th className="px-4 py-3 font-semibold">Status</th>
												<th className="px-4 py-3 text-right font-semibold">Action</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-slate-100">
											{loading ? (
												<tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500"><LoaderCircle className="mr-2 inline animate-spin" size={16} />Loading requests</td></tr>
											) : requests.length === 0 ? (
												<tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">No transport requests found.</td></tr>
											) : requests.map((request) => (
												<tr key={request._id || request.requestId} className="hover:bg-slate-50">
													<td className="whitespace-nowrap px-4 py-3 font-semibold text-teal-800">{request.requestId}</td>
													<td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">{request.employeeName}<span className="mt-0.5 block text-[10px] font-normal text-slate-500">{request.employeeId || 'No employee ID'}</span></td>
													<td className="whitespace-nowrap px-4 py-3 text-slate-600">{request.department}</td>
													<td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(request.date)}</td>
													<td className="px-4 py-3"><span className={`whitespace-nowrap rounded px-2 py-1 text-[10px] font-semibold ${statusClass(request.status)}`}>{request.status}</span></td>
													<td className="px-4 py-3 text-right">
														<button type="button" onClick={() => navigate('/transport-office/requests')} className="rounded bg-teal-700 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-teal-800">Review</button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</article>

							<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
								<div className="mb-3 flex items-center justify-between">
									<div>
										<h2 className="text-sm font-bold text-slate-900">Monthly Clearance Requests</h2>
										<p className="mt-0.5 text-[11px] text-slate-500">Transport requests created over the last six months</p>
									</div>
									<BarChart3 size={17} className="text-teal-700" />
								</div>
								<div className="h-48 w-full">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart data={monthlyChartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
											<CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
											<XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
											<YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
											<Tooltip />
											<Bar dataKey="requests" name="Requests" fill="#0f9a8a" radius={[4, 4, 0, 0]} maxBarSize={36} />
										</BarChart>
									</ResponsiveContainer>
								</div>
							</article>
						</div>

						<div className="space-y-5">
							<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
								<h2 className="text-sm font-bold text-slate-900">Quick Actions</h2>
								<div className="mt-3 divide-y divide-slate-100">
									{[
										{ label: 'View pending requests', path: '/transport-office/requests', icon: Clock3 },
										{ label: 'Manage assigned vehicles', path: '/transport-office/vehicles', icon: Bus },
										{ label: 'Review clearance history', path: '/transport-office/history', icon: FileCheck2 },
										{ label: 'Open transport reports', path: '/transport-office/reports', icon: BarChart3 },
									].map(({ label, path, icon: Icon }) => (
										<button key={path} type="button" onClick={() => navigate(path)} className="flex w-full items-center gap-3 py-3 text-left text-xs font-medium text-slate-700 hover:text-teal-800">
											<span className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-teal-700"><Icon size={15} /></span>
											<span className="flex-1">{label}</span>
											<ArrowRight size={14} className="text-slate-400" />
										</button>
									))}
								</div>
							</article>

							<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
								<div className="flex items-center justify-between border-b border-slate-100 pb-3">
									<div>
										<h2 className="text-sm font-bold text-slate-900">Clearance Status Overview</h2>
										<p className="mt-0.5 text-[11px] text-slate-500">Current transport request status</p>
									</div>
									<Activity size={17} className="text-teal-700" />
								</div>
								<div className="relative h-44">
									<ResponsiveContainer width="100%" height="100%">
										<PieChart>
											<Pie data={hasStatusData ? statusChartData : [{ name: 'No requests', value: 1 }]} dataKey="value" nameKey="name" innerRadius={48} outerRadius={68} paddingAngle={3}>
												{(hasStatusData ? statusChartData : [{ name: 'No requests', value: 1 }]).map((entry, index) => (
													<Cell key={entry.name} fill={hasStatusData ? statusColors[index] : '#cbd5e1'} />
												))}
											</Pie>
											<Tooltip />
										</PieChart>
									</ResponsiveContainer>
									<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-1">
										<span className="text-xl font-bold text-slate-900">{loading ? '—' : summary.totalRequests || 0}</span>
										<span className="text-[10px] text-slate-500">total requests</span>
									</div>
								</div>
								<div className="grid grid-cols-3 gap-2 text-[10px] text-slate-600">
									{['Pending', 'Cleared', 'Returned'].map((label, index) => (
										<div key={label} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColors[index] }} />{label}</div>
									))}
								</div>
							</article>

							<article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
								<div className="mb-3 flex items-center justify-between">
									<h2 className="text-sm font-bold text-slate-900">Recent Activities</h2>
									<Bell size={16} className="text-teal-700" />
								</div>
								{recentActivities.length ? (
									<ul className="space-y-3">
										{recentActivities.map((activity, index) => (
											<li key={`${activity.createdAt}-${index}`} className="flex gap-2.5 text-xs">
												<span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700"><Activity size={12} /></span>
												<div className="min-w-0 flex-1">
													<p className="line-clamp-2 text-slate-700">{activity.action}</p>
													<p className="mt-1 text-[10px] text-slate-400">{formatDate(activity.createdAt)}</p>
												</div>
											</li>
										))}
									</ul>
								) : (
									<p className="py-3 text-xs text-slate-500">No transport activity recorded yet.</p>
								)}
							</article>

							{!fleet.available && (
								<p className="flex items-start gap-2 rounded-md border border-cyan-100 bg-cyan-50 px-3 py-2.5 text-[11px] leading-5 text-cyan-900">
									<Bus size={15} className="mt-0.5 shrink-0" />
									Vehicle totals will appear after a transport fleet registry is connected.
								</p>
							)}
						</div>
					</section>
					</>}
				</div>
			</main>
		</div>
	);
}
