import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, ChevronDown, Globe2, LayoutDashboard, LockKeyhole, LogOut, Settings, UserRound } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import { fetchUnreadNotificationCount } from '../../until/NotificationHelper';
import UniversitySeal from '../UniversitySeal';
import { useHRLanguage } from './HRLanguage';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useHRLanguage();
  const location = useLocation();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const accountMenuRef = useRef(null);

  const handleLanguageChange = (event) => {
    setLanguage(event.target.value);
  };

  useEffect(() => {
    if (!accountMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) setAccountMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setAccountMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [accountMenuOpen]);

  const closeAccountMenu = () => setAccountMenuOpen(false);

  useEffect(() => {
    let active = true;
    const loadUnreadCount = async () => {
      try {
        const count = await fetchUnreadNotificationCount();
        if (active) setUnreadCount(count);
      } catch (error) {
        console.error('Failed to load HR unread notification count:', error);
      }
    };

    loadUnreadCount();
    const intervalId = window.setInterval(loadUnreadCount, 30000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [location.pathname, user?._id, user?.id]);

  return (
    <header className="flex min-h-[72px] items-center justify-end gap-2 bg-teal-700 px-3 text-white shadow-sm sm:gap-4 sm:px-6">
      <label className="inline-flex h-12 items-center gap-3 rounded-full border-2 border-white/90 px-5 text-base font-semibold text-white transition hover:bg-white/10 focus-within:outline focus-within:outline-2 focus-within:outline-white">
        <Globe2 size={22} aria-hidden="true" />
        <select
          aria-label="Language"
          value={language}
          onChange={handleLanguageChange}
          className="cursor-pointer appearance-none bg-transparent text-base font-semibold text-white outline-none"
        >
          <option value="en" className="text-slate-900">{t('English', 'English')}</option>
          <option value="am" className="text-slate-900">{t('Amharic', 'አማርኛ')}</option>
        </select>
        <ChevronDown size={18} aria-hidden="true" />
      </label>
      <Link
        to="/hr-office/notifications"
        aria-label="HR notifications"
        title="Notifications"
        className="relative rounded-full border border-white/20 p-3 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            aria-label={`${unreadCount} unread notifications`}
            className="absolute -right-1 -top-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-teal-700 bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>
      <div className="relative" ref={accountMenuRef}>
        <button
          type="button"
          onClick={() => setAccountMenuOpen((isOpen) => !isOpen)}
          aria-label="Open HR Officer menu"
          aria-haspopup="menu"
          aria-expanded={accountMenuOpen}
          className="flex min-w-0 items-center gap-2 rounded-xl border-2 border-white/90 px-2 py-1.5 text-left transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          {user?.profileImage ? (
            <img src={user.profileImage} alt="HR Officer profile" className="h-9 w-9 shrink-0 rounded-full bg-white object-cover" />
          ) : (
            <UniversitySeal className="h-9 w-9 bg-white p-0.5" />
          )}
          <div className="hidden min-w-0 sm:block">
            <p className="max-w-40 truncate text-xs font-semibold">{user?.email || user?.name || 'HR account'}</p>
          </div>
          <ChevronDown size={15} className={`hidden transition-transform sm:block ${accountMenuOpen ? 'rotate-180' : ''}`} />
        </button>
        {accountMenuOpen && (
          <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-700 shadow-xl">
            <div className="px-4 py-4">
              <p className="truncate text-sm font-semibold text-slate-800">{user?.name || 'HR Officer'}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{user?.email || 'HR account'}</p>
              <span className="mt-3 inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-800">{t('HR Officer')}</span>
            </div>
            <div className="border-t border-slate-200 py-1.5">
              <Link role="menuitem" to="/hr-office" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                <LayoutDashboard size={17} className="text-slate-500" /> {t('My Dashboard')}
              </Link>
              <Link role="menuitem" to="/hr-office/profile" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                <UserRound size={17} className="text-slate-500" /> {t('View Profile')}
              </Link>
              <Link role="menuitem" to="/hr-office/profile?tab=password" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                <LockKeyhole size={17} className="text-slate-500" /> {t('Change Password')}
              </Link>
              <Link role="menuitem" to="/hr-office/dashboard-settings" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                <Settings size={17} className="text-slate-500" /> {t('Dashboard Settings')}
              </Link>
            </div>
            <div className="border-t border-slate-200 py-1.5">
              <button role="menuitem" type="button" onClick={() => { closeAccountMenu(); logout(); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50">
                <LogOut size={17} /> {t('Sign Out')}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;