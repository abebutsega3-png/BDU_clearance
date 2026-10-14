import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, CheckCircle2, ChevronDown, Globe2, LayoutDashboard, LockKeyhole, LogOut, Settings, UserRound, X } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import { fetchUnreadNotificationCount } from '../../until/NotificationHelper';
import UniversitySeal from '../UniversitySeal';
import { useHRLanguage } from './useHRLanguage';
import { subscribeToNotifications } from '../../until/notificationSocket';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useHRLanguage();
  const location = useLocation();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [languageDialogOpen, setLanguageDialogOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [unreadCount, setUnreadCount] = useState(0);
  const accountMenuRef = useRef(null);

  const openLanguageDialog = () => {
    setSelectedLanguage(language);
    setLanguageDialogOpen(true);
  };

  useEffect(() => {
    if (!languageDialogOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setLanguageDialogOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [languageDialogOpen]);

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
  const saveLanguage = () => {
    setLanguage(selectedLanguage);
    setLanguageDialogOpen(false);
  };

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
    window.addEventListener('notifications-updated', loadUnreadCount);
    const unsubscribeFromNotifications = subscribeToNotifications((notification) => {
      if (String(notification.recipientId || '') === String(user?._id || user?.id || '')) {
        window.dispatchEvent(new Event('notifications-updated'));
      }
    });
    const intervalId = window.setInterval(loadUnreadCount, 30000);
    return () => {
      active = false;
      window.removeEventListener('notifications-updated', loadUnreadCount);
      unsubscribeFromNotifications();
      window.clearInterval(intervalId);
    };
  }, [location.pathname, user?._id, user?.id]);

  return (
    <header className="sticky top-0 z-30 flex min-h-[72px] items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 text-slate-700 shadow-sm sm:gap-4 sm:px-6">
      <div className="hidden min-w-0 sm:block">
        <p className="truncate text-sm font-bold text-[#10254b]">Employee Clearance System</p>
        <p className="truncate text-[11px] text-slate-500">Bahir Dar University | HR Portal</p>
      </div>
      <div className="ml-auto flex items-center gap-2 sm:gap-4">
      <button
        type="button"
        onClick={openLanguageDialog}
        aria-label="Choose language"
        aria-haspopup="dialog"
        className="inline-flex h-10 items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 text-sm font-semibold text-[#174a83] transition hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#174a83] sm:h-11 sm:gap-3 sm:px-4"
      >
        <Globe2 size={19} aria-hidden="true" />
        {language === 'am' ? 'አማርኛ' : 'English'}
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <Link
        to="/hr-office/notifications"
        aria-label="HR notifications"
        title="Notifications"
        className="relative rounded-full p-2.5 text-[#174a83] transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#174a83]"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            aria-label={`${unreadCount} unread notifications`}
            className="absolute -right-1 -top-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
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
          className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#174a83]"
        >
          {user?.profileImage ? (
            <img src={user.profileImage} alt="HR Officer profile" className="h-9 w-9 shrink-0 rounded-full bg-white object-cover" />
          ) : (
            <UniversitySeal className="h-9 w-9 bg-white p-0.5" />
          )}
          <div className="hidden min-w-0 sm:block">
            <p className="max-w-40 truncate text-xs font-semibold">{user?.email || user?.name || 'HR account'}</p>
          </div>
          <ChevronDown size={15} className={`hidden text-[#174a83] transition-transform sm:block ${accountMenuOpen ? 'rotate-180' : ''}`} />
        </button>
        {accountMenuOpen && (
          <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-700 shadow-xl">
            <div className="px-4 py-4">
              <p className="truncate text-sm font-semibold text-slate-800">{user?.name || 'HR Officer'}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{user?.email || 'HR account'}</p>
              <span className="mt-3 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">{t('HR Officer')}</span>
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
      </div>
      {languageDialogOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setLanguageDialogOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="hr-language-dialog-title"
            className="relative w-full max-w-md rounded-2xl bg-white px-6 pb-6 pt-11 shadow-2xl sm:px-16 sm:pb-7"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLanguageDialogOpen(false)}
              aria-label="Close language selection"
              className="absolute right-3 top-3 rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <X size={23} />
            </button>
            <h2 id="hr-language-dialog-title" className="mb-8 text-center text-sm font-bold text-slate-700">
              Which language do you prefer?
            </h2>
            <div role="radiogroup" aria-labelledby="hr-language-dialog-title" className="space-y-4">
              {[
                { value: 'en', name: 'English', nativeName: 'English' },
                { value: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
              ].map((option) => {
                const isSelected = selectedLanguage === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedLanguage(option.value)}
                    className={`flex min-h-[76px] w-full items-center justify-between rounded-md border px-4 py-3 text-left transition ${
                      isSelected
                        ? 'border-[#174a83] text-[#174a83]'
                        : 'border-slate-200 text-slate-500 hover:border-blue-300'
                    }`}
                  >
                    <span>
                      <span className="block text-sm">{option.name}</span>
                      <span className="block text-sm">{option.nativeName}</span>
                    </span>
                    {isSelected && <CheckCircle2 size={19} className="fill-[#174a83] text-white" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={saveLanguage}
              className="mt-5 h-11 w-full rounded-md bg-[#174a83] text-sm font-bold text-white transition hover:bg-[#123b69] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#174a83]"
            >
              Save
            </button>
          </section>
        </div>
      )}
    </header>
  );
};

export default Navbar;