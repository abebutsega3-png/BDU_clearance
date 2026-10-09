import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { NavLink } from 'react-router-dom';
import {
	BarChart3,
	ClipboardCheck,
	History,
	LayoutDashboard,
	LogOut,
	Settings,
} from 'lucide-react';
import { useAuth } from '../../context/authContext';
import { useLibraryLanguage } from './LibraryLanguage';
import UniversitySeal from '../UniversitySeal';

const menuItems = [
	{ label: 'Dashboard', to: '/library-office', icon: LayoutDashboard },
	{ label: 'Clearance Requests', to: '/library-office/clearance-requests', icon: ClipboardCheck },
	{ label: 'Library Record Management', to: '/library-office/library-records', icon: History },
	{ label: 'Clearance History', to: '/library-office/clearance-history', icon: History },
	{ label: 'Reports', to: '/library-office/reports', icon: BarChart3 },
	// { label: 'Notifications', to: '/library-office/notifications', icon: Bell },
	// { label: 'My Profile', to: '/library-office/profile', icon: UserCircle },
	{ label: 'Settings', to: '/library-office/settings', icon: Settings },
];

export default function LibrarySidebar() {
	const { user, logout } = useAuth();
	const { t } = useLibraryLanguage();
	const [generalSettings, setGeneralSettings] = useState(null);
	const userId = user?._id || user?.id || localStorage.getItem('userId') || '';

	const loadGeneralSettings = useCallback(async () => {
		if (!userId) return;
		try {
			const token = localStorage.getItem('token');
			const response = await axios.get(`/api/library-settings/${encodeURIComponent(userId)}`, {
				headers: token ? { Authorization: ['Bearer', token].join(' ') } : {},
			});
			setGeneralSettings(response.data?.generalSettings || null);
		} catch (error) {
			console.error('Unable to load Library details for sidebar:', error.response?.data?.message || error.message);
		}
	}, [userId]);

	useEffect(() => {
		loadGeneralSettings();
		window.addEventListener('library-officer-settings-updated', loadGeneralSettings);
		return () => window.removeEventListener('library-officer-settings-updated', loadGeneralSettings);
	}, [loadGeneralSettings]);

	return (
		<aside className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-slate-900 text-white shadow-xl">
			<div className="flex h-20 items-center border-b border-slate-700 px-6">
				<UniversitySeal />
				<div className="ml-3">
					<h1 className="max-w-48 truncate text-lg font-bold">{generalSettings?.libraryName || t('Library System')}</h1>
					<p className="max-w-48 truncate text-xs text-slate-400">{generalSettings?.officeName || t('Library Officer')}</p>
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
						<span>{t(label)}</span>
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
					<span>{t('Logout')}</span>
				</button>
			</div>
		</aside>
	);
}
