import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Bell, ChevronDown, Globe2, LayoutDashboard, LockKeyhole, LogOut, Settings, UserRound } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import { useLibraryLanguage } from './LibraryLanguage';
import UniversitySeal from '../UniversitySeal';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLibraryLanguage();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const accountMenuRef = useRef(null);
  const languageMenuRef = useRef(null);

  useEffect(() => {
    let active = true;
    const fetchUnreadCount = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        if (active) setUnreadCount(0);
        return;
      }
      try {
        const response = await axios.get('/api/library-notifications/unread-count', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (active) setUnreadCount(Math.max(0, Number(response.data?.unreadCount) || 0));
      } catch (error) {
        if (active) console.error('Unable to load unread library notification count:', error);
      }
    };
    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') fetchUnreadCount();
    };

    fetchUnreadCount();
    const intervalId = window.setInterval(fetchUnreadCount, 30000);
    window.addEventListener('focus', fetchUnreadCount);
    window.addEventListener('library-notifications-updated', fetchUnreadCount);
    document.addEventListener('visibilitychange', refreshOnVisible);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', fetchUnreadCount);
      window.removeEventListener('library-notifications-updated', fetchUnreadCount);
      document.removeEventListener('visibilitychange', refreshOnVisible);
    };
  }, []);

  useEffect(() => {
    if (!accountMenuOpen && !languageMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) setAccountMenuOpen(false);
      if (!languageMenuRef.current?.contains(event.target)) setLanguageMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false);
        setLanguageMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [accountMenuOpen, languageMenuOpen]);

  const closeAccountMenu = () => setAccountMenuOpen(false);

  return (
    <header className="flex min-h-[56px] items-center justify-between gap-4 bg-teal-600 px-5 text-white shadow-sm">
      <p className="truncate text-sm font-medium">{t('Welcome')} {user?.name || t('Librarian')}</p>
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <div className="relative" ref={languageMenuRef}>
          <button
            type="button"
            onClick={() => setLanguageMenuOpen((isOpen) => !isOpen)}
            aria-label="Select language"
            aria-haspopup="menu"
            aria-expanded={languageMenuOpen}
            className="flex items-center gap-1.5 rounded-full border border-white/30 px-2.5 py-1.5 text-xs font-semibold transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            <Globe2 size={16} />
            {language === 'en' ? 'EN' : 'አማ'}
            <ChevronDown size={13} className={`transition-transform ${languageMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {languageMenuOpen && (
            <div role="menu" aria-label="Language" className="absolute left-0 top-full z-[60] mt-2 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-slate-700 shadow-xl">
              {[
                { value: 'en', label: 'English' },
                { value: 'am', label: 'አማርኛ' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={language === option.value}
                  onClick={() => {
                    setLanguage(option.value);
                    setLanguageMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition hover:bg-teal-50 ${language === option.value ? 'font-semibold text-teal-700' : ''}`}
                >
                  {option.label}
                  {language === option.value && <span aria-hidden="true">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <Link
          to="/library-office/notifications"
          aria-label={unreadCount ? `${t('Library notifications')}, ${unreadCount} unread` : t('Library notifications')}
          title={t('Notifications')}
          className="relative rounded-full p-2 text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-teal-600">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
        <div className="relative" ref={accountMenuRef}>
        <button
          type="button"
          onClick={() => setAccountMenuOpen((isOpen) => !isOpen)}
          aria-label={t('Open Library Officer menu')}
          aria-haspopup="menu"
          aria-expanded={accountMenuOpen}
          className="flex max-w-64 items-center gap-2 rounded-xl border-2 border-white/90 px-2 py-1 text-left transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          {user?.profileImage ? (
            <img src={user.profileImage} alt="Library Officer profile" className="h-8 w-8 shrink-0 rounded-full bg-white object-cover" />
          ) : (
            <UniversitySeal className="h-8 w-8 bg-white p-0.5" />
          )}
          <span className="hidden min-w-0 sm:block">
            <span className="block max-w-40 truncate text-xs font-semibold">{user?.name || t('Library Officer')}</span>
            <span className="block max-w-40 truncate text-[10px] text-teal-100">{user?.email || t('Library Officer account')}</span>
          </span>
          <ChevronDown size={15} className={`shrink-0 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
        </button>
        {accountMenuOpen && (
          <div role="menu" className="absolute right-0 top-full z-[60] mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-700 shadow-xl">
            <div className="px-4 py-4">
              <p className="truncate text-sm font-semibold text-slate-800">{user?.name || t('Library Officer')}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{user?.email || t('Library Officer account')}</p>
              <span className="mt-3 inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-800">{t('Library Officer')}</span>
            </div>
            <div className="border-t border-slate-200 py-1.5">
              <Link role="menuitem" to="/library-office" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                <LayoutDashboard size={17} className="text-slate-500" /> {t('My Dashboard')}
              </Link>
              <Link role="menuitem" to="/library-office/profile" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                <UserRound size={17} className="text-slate-500" /> {t('View Profile')}
              </Link>
              <Link role="menuitem" to="/library-office/profile#security" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                <LockKeyhole size={17} className="text-slate-500" /> {t('Change Password')}
              </Link>
              <Link role="menuitem" to="/library-office/dashboard-settings" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
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
      </div>
    </header>
  );
};

export default Navbar;