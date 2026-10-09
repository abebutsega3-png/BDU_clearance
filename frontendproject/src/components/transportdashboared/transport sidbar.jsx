import React from 'react';
import { NavLink } from 'react-router-dom';
import {
	BarChart3,
	Bell,
	Bus,
	ClipboardList,
	History,
	LayoutDashboard,
	LogOut,
	Settings,
	UserRound,
} from 'lucide-react';
import { useAuth } from '../../context/authContext';

const navigationItems = [
	{ label: 'Dashboard', path: '/transport-office', icon: LayoutDashboard, end: true },
	{ label: 'Transport Clearance Request', path: '/transport-office/requests', icon: ClipboardList },
	{ label: 'Assigned Vehicles Record', path: '/transport-office/assigned-vehicles', icon: Bus },
	{ label: 'Transport Clearance History', path: '/transport-office/history', icon: History },
	{ label: 'Reports', path: '/transport-office/reports', icon: BarChart3 },
	{ label: 'Notifications', path: '/transport-office/notifications', icon: Bell },
	{ label: 'My Profile', path: '/transport-office/profile', icon: UserRound },
	{ label: 'Settings', path: '/transport-office/settings', icon: Settings },
];

export default function TransportSidebar() {
	const { logout } = useAuth();

	return (
		<aside className="fixed bottom-0 left-0 top-16 z-40 flex w-16 flex-col bg-[#102744] text-slate-200 shadow-xl md:w-64">
			<nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4 md:px-3" aria-label="Transport officer navigation">
				{navigationItems.map(({ label, path, icon: Icon, end }) => (
					<div key={path}>
						<NavLink
							to={label === 'Reports' ? `${path}?reportType=summary` : path}
							end={end}
							title={label}
							className={({ isActive }) =>
								`flex min-h-11 items-center justify-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition md:justify-start ${
									isActive
										? 'bg-teal-600 text-white shadow-sm'
										: 'text-slate-300 hover:bg-white/10 hover:text-white'
								}`
							}
						>
							<Icon size={18} className="shrink-0" />
							<span className="hidden md:inline">{label}</span>
						</NavLink>
					</div>
				))}
			</nav>

			<div className="border-t border-white/10 p-2 md:p-3">
				<button
					type="button"
					onClick={logout}
					title="Logout"
					className="flex min-h-11 w-full items-center justify-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-red-600 hover:text-white md:justify-start"
				>
					<LogOut size={18} className="shrink-0" />
					<span className="hidden md:inline">Logout</span>
				</button>
			</div>
		</aside>
	);
}
