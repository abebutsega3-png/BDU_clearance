import React from 'react';
import axios from 'axios';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import {
  LayoutDashboard,
  FileCheck,
  History,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';
import UniversitySeal from '../UniversitySeal';
import { useICTLanguage } from './ICTLanguageContext';

const NOTIFICATIONS_URL = 'http://localhost:3000/api/notifications/my';

const dashboardItems = [
  { to: '/ict-office', label: 'Dashboard', amharic: 'ዳሽቦርድ', icon: LayoutDashboard },
  { to: '/ict-office/requests', label: 'ICT Clearance Request', amharic: 'የአይሲቲ ክሊራንስ ጥያቄ', icon: FileCheck },
  { to: '/ict-office/assets', label: 'ICT Asset Records', amharic: 'የአይሲቲ ንብረት መዝገቦች', icon: FileCheck },
  { to: '/ict-office/history', label: 'ICT Clearance History', amharic: 'የአይሲቲ ክሊራንስ ታሪክ', icon: History },
  { to: '/ict-office/reports', label: 'ICT Reports', amharic: 'የአይሲቲ ሪፖርቶች', icon: BarChart3 },
  // { to: '/ict-office/notifications', label: 'ICT Notifications', icon: Bell },
  // { to: '/ict-office/profile', label: 'ICT Profile', icon: User },
  { to: '/ict-office/settings', label: 'ICT Settings', amharic: 'የአይሲቲ ቅንብሮች', icon: Settings },
];

export default function ICTOfficerSidebar() {
  const { logout } = useAuth();
  const { language, t } = useICTLanguage();
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    const loadUnreadCount = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(NOTIFICATIONS_URL, {
          headers: { Authorization: `Bearer ${token || ''}` },
        });
        const payload = response.data?.data ?? response.data?.notifications ?? [];
        if (active && Array.isArray(payload)) {
          setUnreadCount(payload.filter((notification) => !notification.isRead).length);
        }
      } catch (error) {
        console.error('Unable to load ICT unread notification count:', error);
      }
    };

    loadUnreadCount();
    const intervalId = window.setInterval(loadUnreadCount, 30000);
    window.addEventListener('ict-notifications-updated', loadUnreadCount);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('ict-notifications-updated', loadUnreadCount);
    };
  }, []);

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-gradient-to-b from-[#063d50] to-[#052d3b] text-slate-200 shadow-xl">
      <div className="flex h-20 items-center border-b border-slate-700 bg-slate-900 px-4">
        <UniversitySeal />
        <div className="ml-7 min-w-0">
          <h1 className="truncate text-lg font-bold leading-6 text-white">Employee Clearance</h1>
          <p className="truncate text-sm text-slate-400">{t('ICT Officer', 'የአይሲቲ ኦፊሰር')}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5" aria-label="ICT officer navigation">
        {dashboardItems.map(({ to, label, amharic, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/ict-office'}
            className={({ isActive }) =>
              `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                isActive ? 'bg-cyan-700 text-white shadow-sm' : 'text-slate-300 hover:bg-cyan-900/60 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            <span className="flex-1">{language === 'am' ? amharic : label}</span>
            {to === '/ict-office/notifications' && unreadCount > 0 && (
              <span
                aria-label={`${unreadCount} unread notifications`}
                className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-cyan-900 p-4">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-red-600 hover:text-white"
        >
          <LogOut size={18} />
          <span>{t('Logout', 'ውጣ')}</span>
        </button>
      </div>
    </aside>
  );
}
