import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import {
	Bell,
	ChevronDown,
	Globe2,
	LayoutDashboard,
	LogOut,
	Settings,
	UserRound,
	KeyRound,
	Users,
} from 'lucide-react';
import { useAuth } from '../../context/authContext';
import { canonicalizeRole, getActiveRole, getDashboardPath, getUserRoles } from '../../until/authRoles';
import UniversitySeal from '../UniversitySeal';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000')
	.replace(/\/api\/clearance\/?$/i, '')
	.replace(/\/api\/?$/i, '')
	.replace(/\/+$/, '');
const NOTIFICATIONS_URL = `${API_BASE}/api/transport/notifications`;

const roleDetails = {
	employee: {
		title: 'Employee Dashboard',
		description: 'My Clearance · My Profile · My Assets',
		icon: UserRound,
	},
	'transport officer': {
		title: 'Transport Officer Dashboard',
		description: 'Approvals · Vehicle Requests · Dashboard',
		icon: LayoutDashboard,
	},
};

const formatRoleName = (role) => role
	.split(' ')
	.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
	.join(' ');

const TransportNavbar = () => {
	const { user, switchActiveRole, logout } = useAuth();
	const [menuOpen, setMenuOpen] = useState(false);
	const [unreadCount, setUnreadCount] = useState(0);
	const [language, setLanguage] = useState(() => localStorage.getItem('transportLanguage') || 'en');
	const t = (english, amharic) => (language === 'am' ? (amharic || english) : english);
	const menuRef = useRef(null);
	const navigate = useNavigate();
	const displayName = user?.name || user?.fullName || 'Transport Officer';
	const roles = getUserRoles(user);
	const activeRole = getActiveRole(user) || 'transport officer';
	const availableDashboards = roles
		.map((role) => ({ role, path: getDashboardPath(role), ...(roleDetails[role] || {}) }))
		.filter((item) => item.path);

	const switchRole = (role, path) => {
		switchActiveRole(role);
		setMenuOpen(false);
		navigate(path);
	};

	useEffect(() => {
		localStorage.setItem('transportLanguage', language);
		document.documentElement.lang = language === 'am' ? 'am' : 'en';
		window.dispatchEvent(new Event('transport-language-change'));
	}, [language]);

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
		<header className="sticky top-0 z-50 flex h-20 w-full items-center border-b border-teal-800 bg-teal-700 px-3 text-white shadow-sm sm:px-6 md:ml-64 md:w-[calc(100%-16rem)]">
			<div className="flex min-w-0 flex-1 items-center">
				<p className="truncate text-lg font-normal tracking-tight sm:text-xl">{t('Welcome', 'እንኳን ደህና መጡ')} {displayName}</p>
			</div>

			<div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-4">
				<label className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/35 px-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-within:outline focus-within:outline-2 focus-within:outline-white sm:h-12 sm:gap-3 sm:px-5">
					<Globe2 size={20} aria-hidden="true" />
					<select
						aria-label="Language"
						value={language}
						onChange={(event) => setLanguage(event.target.value)}
						className="cursor-pointer appearance-none bg-transparent pr-1 text-sm font-semibold text-white outline-none"
					>
						<option value="en" className="text-slate-900">English</option>
						<option value="am" className="text-slate-900">አማርኛ</option>
					</select>
					<ChevronDown size={15} aria-hidden="true" className="text-white/80" />
				</label>

				<Link
					to="/transport-office/notifications"
					aria-label={unreadCount > 0 ? `${unreadCount} ${t('unread Transport notifications', 'ያልተነበቡ የትራንስፖርት ማስታወቂያዎች')}` : t('Transport notifications', 'የትራንስፖርት ማስታወቂያዎች')}
					title={unreadCount > 0 ? `${unreadCount} ${t('unread notifications', 'ያልተነበቡ ማስታወቂያዎች')}` : t('Notifications', 'ማስታወቂያዎች')}
					className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:h-12 sm:w-12"
				>
					<Bell size={24} aria-hidden="true" />
					{unreadCount > 0 && (
						<span
							aria-hidden="true"
							className="absolute -right-1 -top-1 z-10 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-teal-700 bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow"
						>
							{unreadCount > 99 ? '99+' : unreadCount}
						</span>
					)}
				</Link>

				<div className="relative" ref={menuRef}>
					<button
						type="button"
						onClick={() => setMenuOpen((open) => !open)}
						className="flex max-w-[min(21rem,55vw)] items-center gap-2 rounded-xl border-2 border-white/90 px-2 py-1.5 text-left transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:gap-3"
						aria-expanded={menuOpen}
						aria-haspopup="true"
						aria-label={t('Open Transport Officer account menu', 'የትራንስፖርት ኦፊሰር መለያ ምናሌ ክፈት')}
					>
						{user?.profileImage
							? <img src={user.profileImage} alt="" className="h-9 w-9 shrink-0 rounded-full bg-white object-cover sm:h-11 sm:w-11" />
							: <UniversitySeal className="h-9 w-9 rounded-full bg-white p-0.5 sm:h-11 sm:w-11" />}
						<span className="hidden min-w-0 text-left sm:block">
							<span className="block max-w-44 truncate text-xs font-semibold">{t('Transport Officer', 'ትራንስፖርት ኦፊሰር')}</span>
							<span className="block max-w-44 truncate text-[10px] text-teal-100">{user?.email || user?.name || displayName}</span>
						</span>
						<ChevronDown size={17} className={`hidden shrink-0 transition-transform sm:block ${menuOpen ? 'rotate-180' : ''}`} />
					</button>

					{menuOpen && (
						<div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-xl" role="menu">
							<div className="px-5 py-4">
								<p className="truncate text-lg font-semibold text-slate-900">{user?.name || t('Transport Officer', 'ትራንስፖርት ኦፊሰር')}</p>
								<p className="mt-1 truncate text-sm text-slate-500">{user?.email || ''}</p>
								<span className="mt-3 inline-block rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">{formatRoleName(activeRole)}</span>
							</div>
							{availableDashboards.length > 0 && (
								<div className="border-t border-slate-100 px-3 py-3">
									<p className="mb-2 text-xs font-semibold text-slate-500">{t('Current Role', 'የአሁኑ ሚና')}</p>
									<div className="mb-3 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
										<span>{formatRoleName(activeRole)}</span>
										<ChevronDown size={15} />
									</div>

									{availableDashboards.length > 1 && (
										<div className="space-y-2">
											<div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
												<LayoutDashboard size={16} />
												<span>{t('Switch Role', 'ሚና ቀይር')}</span>
											</div>
											<p className="mb-2 text-[11px] text-slate-500">{t('Choose your preferred dashboard', 'የሚመርጡትን ዳሽቦርድ ይምረጡ')}</p>
											{availableDashboards.map((dashboard) => {
												const { role, path, title, description } = dashboard;
												const Icon = dashboard.icon || LayoutDashboard;
												const isActive = canonicalizeRole(activeRole) === role;
												return (
													<button
														type="button"
														key={role}
														onClick={() => switchRole(role, path)}
														className={`flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition ${
															isActive ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'
														}`}
													>
														<span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
															isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
														}`}>
															<Icon size={16} />
														</span>
														<span className="min-w-0 flex-1">
															<span className="block text-xs font-semibold text-slate-700">{title || `${formatRoleName(role)} Dashboard`}</span>
															<span className="mt-0.5 block truncate text-[10px] text-slate-500">{description || `Open ${formatRoleName(role)} workspace`}</span>
														</span>
														<span className={`h-3 w-3 shrink-0 rounded-full border ${
															isActive ? 'border-emerald-600 bg-emerald-600 ring-2 ring-emerald-100' : 'border-slate-400'
														}`} />
													</button>
												);
												})}
										</div>
									)}
								</div>
							)}
							<div className="border-t border-slate-100" />
							<nav className="space-y-1 px-3 py-3">
								<Link to="/transport-office" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50">
									<LayoutDashboard size={17} className="text-slate-500" />{t('My Dashboard', 'የእኔ ዳሽቦርድ')}
								</Link>
								<Link to="/transport-office/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50">
									<UserRound size={17} className="text-slate-500" />{t('View Profile', 'ፕሮፋይል እይ')}
								</Link>
								<Link to="/transport-office/change-password" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50">
									<KeyRound size={17} className="text-slate-500" />{t('Change Password', 'የይለፍ ቃል ቀይር')}
								</Link>
								<Link to="/transport-office/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50">
									<Settings size={17} className="text-slate-500" />{t('Dashboard Settings', 'የዳሽቦርድ ቅንብሮች')}
								</Link>
							</nav>
							<div className="border-t border-slate-100" />
							<div className="px-3 py-2">
								<button
									type="button"
									onClick={() => { setMenuOpen(false); logout(); }}
									className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-rose-600 hover:bg-slate-50"
								>
									<LogOut size={17} />{t('Sign Out', 'ውጣ')}
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
