import React from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Bell, Settings } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import { useICTLanguage } from './ICTLanguageContext';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000')
  .replace(/\/api\/clearance\/?$/i, '')
  .replace(/\/api\/?$/i, '')
  .replace(/\/+$/, '');
const NOTIFICATIONS_URL = `${API_BASE}/api/notifications/my`;

const Navbar = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useICTLanguage();
  const [unreadCount, setUnreadCount] = React.useState(0);
  const initials = (user?.name || 'ICT')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, []);

  React.useEffect(() => {
    let active = true;
    const loadUnreadCount = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(NOTIFICATIONS_URL, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const payload = response.data?.data ?? response.data?.notifications;
        const nextCount = Array.isArray(payload)
          ? payload.filter((notification) => notification.isRead === false).length
          : Number(response.data?.unreadCount) || 0;
        if (active) setUnreadCount(nextCount);
      } catch (error) {
        console.error('Unable to load ICT unread notification count:', error);
      }
    };

    loadUnreadCount();
    const intervalId = window.setInterval(loadUnreadCount, 30000);
    window.addEventListener('ict-notifications-updated', loadUnreadCount);
    window.addEventListener('focus', loadUnreadCount);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('ict-notifications-updated', loadUnreadCount);
      window.removeEventListener('focus', loadUnreadCount);
    };
  }, []);

  return (
    <header className="flex h-20 items-center justify-end bg-gradient-to-r from-emerald-800 to-green-700 px-3 text-white shadow sm:px-6">
      <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-4">
        <button
          type="button"
          onClick={() => setLanguage(language === 'en' ? 'am' : 'en')}
          aria-label={language === 'en' ? 'Switch to Amharic' : 'Switch to English'}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/25 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          <Settings size={22} aria-hidden="true" />
          <span>{language === 'en' ? 'EN/አማ' : 'አማ/EN'}</span>
        </button>
        <Link
          to="/ict-office/notifications"
          aria-label={unreadCount > 0 ? `${unreadCount} unread ICT notifications` : 'ICT notifications'}
          title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
          className="relative shrink-0 rounded-lg p-2.5 text-cyan-50 transition hover:bg-white/10"
        >
          <Bell size={24} aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
                className="absolute -right-0.5 -top-0.5 z-10 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-emerald-800 bg-rose-600 px-1 text-[10px] font-bold leading-none text-white shadow"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex min-w-0 items-center gap-2 rounded-lg p-1.5 transition hover:bg-white/10 sm:gap-3 sm:p-2"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            aria-label="Open ICT Officer account menu"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-bold text-[#06485d] sm:h-14 sm:w-14 sm:text-base">{initials}</span>
            <span className="block min-w-0">
              <span className="block max-w-28 truncate text-sm font-semibold text-white sm:max-w-40">{user?.name || 'ICT Officer'}</span>
              <span className="block text-xs text-cyan-100">{t('ICT Officer', 'የአይሲቲ ኦፊሰር')}</span>
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-1rem)] rounded-xl border border-slate-200 bg-white text-slate-800 shadow-lg" role="menu">
              <div className="px-5 py-4">
                <div className="text-lg font-medium text-slate-900">{user?.name || 'ICT Officer'}</div>
                <div className="mt-1 text-xs text-slate-500 truncate">{user?.email || ''}</div>
                <div className="mt-3 inline-block rounded-full bg-sky-100 px-3 py-2 text-xs text-sky-700">{t('ICT Officer', 'የአይሲቲ ኦፊሰር')}</div>
              </div>

              <div className="border-t border-slate-100" />

              <nav className="space-y-1 px-3 py-3">
                <Link to="/ict-office" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-base hover:bg-slate-50">{t('My Dashboard', 'ዳሽቦርዴ')}</Link>
                <Link to="/ict-office/profile" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-base hover:bg-slate-50">{t('View Profile', 'መገለጫን ይመልከቱ')}</Link>
                <Link to="/ict-office/change-password" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-base hover:bg-slate-50">{t('Change Password', 'የይለፍ ቃል ይቀይሩ')}</Link>
                <Link to="/ict-office/dashboard-settings" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-base hover:bg-slate-50">{t('Dashboard Settings', 'የዳሽቦርድ ቅንብሮች')}</Link>
              </nav>

              <div className="border-t border-slate-100" />

              <div className="px-3 py-2">
                <button type="button" onClick={() => { setMenuOpen(false); logout(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-base text-rose-600 hover:bg-slate-50">{t('Sign Out', 'ውጣ')}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
