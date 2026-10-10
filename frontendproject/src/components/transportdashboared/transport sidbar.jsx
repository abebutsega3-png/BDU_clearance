import React, { useEffect, useState } from 'react';
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
import UniversitySeal from '../UniversitySeal';

const translations = {
	Dashboard: { en: 'Dashboard', am: 'ዳሽቦርድ' },
	'Transport Clearance Request': { en: 'Transport Clearance Request', am: 'የትራንስፖርት አፈፃፀም ጥያቄ' },
	'Assigned Vehicles Record': { en: 'Assigned Vehicles Record', am: 'የተመደቡ ተሽከርካሪዎች መዝገብ' },
	'Transport Clearance History': { en: 'Transport Clearance History', am: 'የትራንስፖርት አፈፃፀም ታሪክ' },
	Reports: { en: 'Reports', am: 'ሪፖርቶች' },
	Notifications: { en: 'Notifications', am: 'ማስታወቂያዎች' },
	'My Profile': { en: 'My Profile', am: 'ፕሮፋይል' },
	Settings: { en: 'Settings', am: 'ቅንብሮች' },
	Logout: { en: 'Logout', am: 'ውጣ' },
};

const navigationItems = [
	{ label: 'Dashboard', path: '/transport-office', icon: LayoutDashboard, end: true },
	{ label: 'Transport Clearance Request', path: '/transport-office/requests', icon: ClipboardList },
	{ label: 'Assigned Vehicles Record', path: '/transport-office/assigned-vehicles', icon: Bus },
	{ label: 'Transport Clearance History', path: '/transport-office/history', icon: History },
	{ label: 'Reports', path: '/transport-office/reports?reportType=clearance', icon: BarChart3 },
	{ label: 'Notifications', path: '/transport-office/notifications', icon: Bell },
	{ label: 'My Profile', path: '/transport-office/profile', icon: UserRound },
	{ label: 'Settings', path: '/transport-office/settings', icon: Settings },
];

export default function TransportSidebar() {
	const { logout } = useAuth();
	const [language, setLanguage] = useState(() => localStorage.getItem('transportLanguage') || 'en');

	useEffect(() => {
		const syncLanguage = () => setLanguage(localStorage.getItem('transportLanguage') || 'en');
		window.addEventListener('transport-language-change', syncLanguage);
		return () => window.removeEventListener('transport-language-change', syncLanguage);
	}, []);

	const t = (label) => translations[label]?.[language] || label;

	return (
		<aside className="fixed bottom-0 left-0 top-16 z-40 flex w-16 flex-col bg-slate-900 text-slate-200 shadow-xl md:top-0 md:w-64">
			<div className="hidden h-20 shrink-0 items-center gap-3 border-b border-slate-700 px-5 md:flex">
				<UniversitySeal className="h-9 w-9 shrink-0" />
				<div className="min-w-0">
					<p className="truncate text-base font-bold text-white">Employee System</p>
					<p className="truncate text-xs text-slate-400">Transport Officer</p>
				</div>
			</div>
			<nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4 md:px-3" aria-label="Transport officer navigation">
				{navigationItems.map(({ label, path, icon: Icon, end }) => (
					<div key={path}>
						<NavLink
							to={path}
							end={end}
							title={t(label)}
							className={({ isActive }) =>
								`flex min-h-11 items-center justify-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition md:justify-start ${
									isActive
										? 'bg-blue-600 text-white shadow-sm'
										: 'text-slate-300 hover:bg-slate-800 hover:text-white'
								}`
							}
						>
							<Icon size={18} className="shrink-0" />
							<span className="hidden md:inline">{t(label)}</span>
						</NavLink>
					</div>
				))}
			</nav>

			<div className="border-t border-slate-700 p-2 md:p-3">
				<button
					type="button"
					onClick={logout}
					title={t('Logout')}
					className="flex min-h-11 w-full items-center justify-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-red-600 hover:text-white md:justify-start"
				>
					<LogOut size={18} className="shrink-0" />
					<span className="hidden md:inline">{t('Logout')}</span>
				</button>
			</div>
		</aside>
	);
}
