import React from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, ClipboardCheck, FileText, History, LayoutDashboard, LogOut, UserCircle, Users } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import UniversitySeal from '../UniversitySeal';

const navigation = [
	{ label: 'Dashboard', to: '/department-head', icon: LayoutDashboard },
	{ label: 'Clearance Requests', to: '/department-head/clearance-requests', icon: FileText },
	{ label: 'Department Assets', to: '/department-head/department-assets', icon: FileText },
	{ label: 'My Department', to: '/department-head/my-department', icon: Users },
	{ label: 'Clearance History', to: '/department-head/clearance-history', icon: History },
	{ label: 'Notifications', to: '/department-head/notifications', icon: ClipboardCheck },
	{ label: 'Reports', to: '/department-head/reports', icon: BarChart3 },
	{ label: 'Settings', to: '/department-head/settings', icon: BarChart3 },
];

const DepartmentSidebar = ({ onNavigate }) => {
	const { user, logout } = useAuth();

	return (
		<aside className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-slate-900 text-white shadow-xl">
			<div className="flex h-20 items-center border-b border-slate-700 px-6">
				<UniversitySeal />
				<div className="ml-3 min-w-0">
					<h1 className="truncate text-lg font-bold">Clearance System</h1>
					<p className="text-xs text-slate-400">Department Head</p>
				</div>
			</div>

			<nav className="flex-1 overflow-y-auto px-4 py-5" aria-label="Department head navigation">
				{navigation.map(({ label, to, icon: Icon }) => (
					<NavLink
						key={to}
						to={to}
						end={to === '/department-head'}
						onClick={onNavigate}
						className={({ isActive }) => `mb-1 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm transition ${isActive ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
					>
						<Icon size={19} />
						<span>{label}</span>
					</NavLink>
				))}

				<NavLink
					to="/department-head/profile"
					onClick={onNavigate}
					className={({ isActive }) => `mb-1 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm transition ${isActive ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
				>
					<UserCircle size={19} />
					<span>Profile</span>
				</NavLink>
			</nav>

			<div className="border-t border-slate-700 p-4">
				<div className="mb-3 truncate px-4 text-xs text-slate-400">{user?.name || 'Department Head'}</div>
				<button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-slate-300 transition hover:bg-red-600 hover:text-white">
					<LogOut size={19} />
					<span>Logout</span>
				</button>
			</div>
		</aside>
	);
};

export default DepartmentSidebar;
