import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
	Bell,
	ChevronDown,
	Globe2,
	LayoutDashboard,
	LogOut,
	Settings,
	UserRound,
	KeyRound,
} from 'lucide-react';
import { useAuth } from '../../context/authContext';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000')
	.replace(/\/api\/clearance\/?$/i, '')
	.replace(/\/api\/?$/i, '')
	.replace(/\/+$/, '');
const NOTIFICATIONS_URL = `${API_BASE}/api/transport/notifications`;

const TransportNavbar = () => {
	const { user, logout } = useAuth();
	const [menuOpen, setMenuOpen] = useState(false);
	const [unreadCount, setUnreadCount] = useState(0);
	const menuRef = useRef(null);
	const initials = (user?.name || 'Transport Officer')
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0])
		.join('')
		.toUpperCase();

	useEffect(() => {
		const handleOutsideClick = (event) => {
			if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
		};
		window.addEventListener('mousedown', handleOutsideClick);
		return () => window.removeEventListener('mousedown', handleOutsideClick);
	}, []);

	useEffect(() => {
		let active = true;
		const loadUnreadCount = async () => {
			try {
				const token = localStorage.getItem('token');
				const response = await axios.get(NOTIFICATIONS_URL, {
					headers: token ? { Authorization: `Bearer ${token}` } : {},
				});
				if (active) setUnreadCount(Number(response.data?.unreadCount) || 0);
			} catch (error) {
				console.error('Unable to load Transport unread notification count:', error);
			}
		};

		loadUnreadCount();
		const intervalId = window.setInterval(loadUnreadCount, 30000);
		window.addEventListener('transport-notifications-updated', loadUnreadCount);
		window.addEventListener('focus', loadUnreadCount);
		return () => {
			active = false;
			window.clearInterval(intervalId);
			window.removeEventListener('transport-notifications-updated', loadUnreadCount);
			window.removeEventListener('focus', loadUnreadCount);
		};
	}, []);

	return (
		<header className="sticky top-0 z-50 flex h-20 w-full items-center border-b border-teal-800 bg-teal-700 px-3 text-white shadow-sm sm:px-6">
			<div className="flex min-w-0 flex-1 items-center">
				<div className="hidden min-w-0 sm:block">
					<p className="truncate text-sm font-bold">Employee Clearance</p>
					<p className="mt-0.5 truncate text-xs text-green-100">Transport Officer</p>
				</div>
			</div>

			<div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-4">
				<span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2.5 text-sm font-semibold text-white">
					<Globe2 size={20} aria-hidden="true" />
					<span>EN</span>
				</span>

				<Link
					to="/transport-office/notifications"
					aria-label={unreadCount > 0 ? `${unreadCount} unread Transport notifications` : 'Transport notifications'}
					title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
					className="relative shrink-0 rounded-lg p-2.5 text-white transition hover:bg-white/10"
				>
					<Bell size={24} aria-hidden="true" />
					{unreadCount > 0 && (
						<span
							aria-hidden="true"
							className="absolute -right-0.5 -top-0.5 z-10 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-teal-700 bg-rose-600 px-1 text-[10px] font-bold leading-none text-white shadow"
						>
							{unreadCount > 99 ? '99+' : unreadCount}
						</span>
					)}
				</Link>

				<div className="relative" ref={menuRef}>
					<button
						type="button"
						onClick={() => setMenuOpen((open) => !open)}
						className="flex max-w-[min(21rem,55vw)] items-center gap-2 rounded-lg border-2 border-transparent px-2 py-1.5 transition hover:border-white/70 hover:bg-white/10 sm:gap-3 sm:px-3"
						aria-expanded={menuOpen}
						aria-haspopup="true"
						aria-label="Open Transport Officer account menu"
					>
						<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-bold text-[#06485d] sm:h-11 sm:w-11">
							{initials}
						</span>
						<span className="hidden min-w-0 text-left sm:block">
							<span className="block max-w-44 truncate text-sm font-semibold">{user?.email || user?.name || 'Transport Officer'}</span>
							<span className="block text-xs text-green-100">Transport Officer</span>
						</span>
						<ChevronDown size={17} className={`hidden shrink-0 transition-transform sm:block ${menuOpen ? 'rotate-180' : ''}`} />
					</button>

					{menuOpen && (
						<div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-xl" role="menu">
							<div className="px-5 py-4">
								<p className="truncate text-lg font-semibold text-slate-900">{user?.name || 'Transport Officer'}</p>
								<p className="mt-1 truncate text-sm text-slate-500">{user?.email || ''}</p>
								<span className="mt-3 inline-block rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">Transport Officer</span>
							</div>
							<div className="border-t border-slate-100" />
							<nav className="space-y-1 px-3 py-3">
								<Link to="/transport-office" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50">
									<LayoutDashboard size={17} className="text-slate-500" />My Dashboard
								</Link>
								<Link to="/transport-office/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50">
									<UserRound size={17} className="text-slate-500" />View Profile
								</Link>
								<Link to="/transport-office/change-password" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50">
									<KeyRound size={17} className="text-slate-500" />Change Password
								</Link>
								<Link to="/transport-office/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50">
									<Settings size={17} className="text-slate-500" />Dashboard Settings
								</Link>
							</nav>
							<div className="border-t border-slate-100" />
							<div className="px-3 py-2">
								<button
									type="button"
									onClick={() => { setMenuOpen(false); logout(); }}
									className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-rose-600 hover:bg-slate-50"
								>
									<LogOut size={17} />Sign Out
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</header>
	);
};

export default TransportNavbar;
