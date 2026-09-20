import React from 'react';
import { NavLink } from 'react-router-dom';
import {
	BarChart3,
	Bell,
	ClipboardCheck,
	History,
	LayoutDashboard,
	LogOut,
	Settings,
	UserCircle,
} from 'lucide-react';
import { useAuth } from '../../context/authContext';
import UniversitySeal from '../UniversitySeal';

const menuItems = [
	{ label: 'Dashboard', to: '/library-office', icon: LayoutDashboard },
	{ label: 'Clearance Requests', to: '/library-office/clearance-requests', icon: ClipboardCheck },
	{ label: 'Library Records', to: '/library-office/library-records', icon: ClipboardCheck },
	{ label: 'Clearance History', to: '/library-office/clearance-history', icon: History },
	{ label: 'Reports', to: '/library-office/reports', icon: BarChart3 },
	{ label: 'Notifications', to: '/library-office/notifications', icon: Bell },
	{ label: 'My Profile', to: '/library-office/profile', icon: UserCircle },
	{ label: 'Settings', to: '/library-office/settings', icon: Settings },
];

export default function LibrarySidebar() {
	const { logout } = useAuth();

	return (
		<aside className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-slate-900 text-white shadow-xl">
			<div className="flex h-20 items-center border-b border-slate-700 px-6">
				<UniversitySeal />
				<div className="ml-3">
					<h1 className="text-lg font-bold">Library System</h1>
					<p className="text-xs text-slate-400">Library Officer</p>
				</div>
			</div>

			<nav className="flex-1 overflow-y-auto px-4 py-5">
				{menuItems.map(({ label, to, icon: Icon }) => (
					<NavLink
						key={label}
						to={to}
						end={label === 'Dashboard'}
						className={({ isActive }) => `mb-1 flex w-full items-center gap-3 rounded-lg px-4 py-3 transition ${isActive ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
					>
						<Icon size={20} />
						<span>{label}</span>
					</NavLink>
				))}
			</nav>

			<div className="border-t border-slate-700 p-4">
				<button
					type="button"
					onClick={logout}
					className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-slate-300 transition hover:bg-red-600 hover:text-white"
				>
					<LogOut size={20} />
					<span>Logout</span>
				</button>
			</div>
		</aside>
	);
}
