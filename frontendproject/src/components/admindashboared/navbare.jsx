import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronDown, Globe2, LayoutDashboard, LockKeyhole, LogOut, Settings, UserRound, X } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import AdminNotificationBell from './AdminNotificationBell';
import UniversitySeal from '../UniversitySeal';
import { useAdminLanguage } from './AdminLanguage';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useAdminLanguage();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [languageDialogOpen, setLanguageDialogOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
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

  return (
    <header className="flex min-h-[72px] items-center justify-between gap-4 bg-teal-700 px-4 text-white shadow-sm sm:px-6">
      <p className="truncate text-sm font-medium sm:text-base">{t('Welcome,', 'እንኳን ደህና መጡ፣')} {user?.name || t('Admin', 'አስተዳዳሪ')}</p>
      <div className="flex min-w-0 items-center gap-3 sm:gap-5">
        <button
          type="button"
          onClick={openLanguageDialog}
          aria-label={t('Choose language', 'ቋንቋ ይምረጡ')}
          aria-haspopup="dialog"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/30 px-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <Globe2 size={18} aria-hidden="true" />
          {language === 'am' ? 'አማርኛ' : 'English'}
          <ChevronDown size={14} aria-hidden="true" />
        </button>
        <div className="rounded-full border border-white/20 p-1 text-white [&_button:hover]:bg-white/10 [&_button]:text-white">
          <AdminNotificationBell />
        </div>
        <div className="relative" ref={accountMenuRef}>
          <button
            type="button"
            onClick={() => setAccountMenuOpen((isOpen) => !isOpen)}
            aria-label={t('Open System Administrator menu', 'የስርዓት አስተዳዳሪ ምናሌን ክፈት')}
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
            className="flex min-w-0 items-center gap-2 rounded-xl border-2 border-white/90 px-2 py-1.5 text-left transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            {user?.profileImage ? (
              <img src={user.profileImage} alt="Admin profile" className="h-9 w-9 shrink-0 rounded-full bg-white object-cover" />
            ) : (
              <UniversitySeal className="h-9 w-9 bg-white p-0.5" />
            )}
            <div className="hidden min-w-0 sm:block">
              <p className="max-w-48 truncate text-xs font-semibold">{t('System Administrator', 'የስርዓት አስተዳዳሪ')}</p>
              <p className="max-w-48 truncate text-[10px] text-teal-100">{user?.email || user?.name || t('Admin account', 'የአስተዳዳሪ መለያ')}</p>
            </div>
            <ChevronDown size={15} className={`hidden transition-transform sm:block ${accountMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {accountMenuOpen && (
            <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-700 shadow-xl">
              <div className="px-4 py-4">
                <p className="truncate text-sm font-semibold text-slate-800">{t('System Administrator', 'የስርዓት አስተዳዳሪ')}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{user?.email || user?.name || t('Admin account', 'የአስተዳዳሪ መለያ')}</p>
                <span className="mt-3 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800">{t('System Administrator', 'የስርዓት አስተዳዳሪ')}</span>
              </div>
              <div className="border-t border-slate-200 py-1.5">
                <Link role="menuitem" to="/admin" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                  <LayoutDashboard size={17} className="text-slate-500" /> {t('My Dashboard', 'ዳሽቦርዴ')}
                </Link>
                <Link role="menuitem" to="/admin/profile" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                  <UserRound size={17} className="text-slate-500" /> {t('View Profile', 'መገለጫን ይመልከቱ')}
                </Link>
                <Link role="menuitem" to="/admin/change-password" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                  <LockKeyhole size={17} className="text-slate-500" /> {t('Change Password', 'የይለፍ ቃል ይቀይሩ')}
                </Link>
                <Link role="menuitem" to="/admin/dashboard-settings" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                  <Settings size={17} className="text-slate-500" /> {t('Dashboard Settings', 'የዳሽቦርድ ቅንብሮች')}
                </Link>
              </div>
              <div className="border-t border-slate-200 py-1.5">
                <button role="menuitem" type="button" onClick={() => { closeAccountMenu(); logout(); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50">
                  <LogOut size={17} /> {t('Sign Out', 'ውጣ')}
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
            aria-labelledby="admin-language-dialog-title"
            className="relative w-full max-w-md rounded-2xl bg-white px-6 pb-6 pt-11 shadow-2xl sm:px-16 sm:pb-7"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLanguageDialogOpen(false)}
              aria-label={t('Close language selection', 'Хэл сонгох цонхыг хаах')}
              className="absolute right-3 top-3 rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <X size={23} />
            </button>
            <h2 id="admin-language-dialog-title" className="mb-8 text-center text-sm font-bold text-slate-700">
              {t('Which language do you prefer?', 'Та аль хэлийг сонгох вэ?')}
            </h2>
            <div role="radiogroup" aria-labelledby="admin-language-dialog-title" className="space-y-4">
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
                        ? 'border-emerald-500 text-emerald-600'
                        : 'border-slate-200 text-slate-500 hover:border-emerald-300'
                    }`}
                  >
                    <span>
                      <span className="block text-sm">{option.name}</span>
                      <span className="block text-sm">{option.nativeName}</span>
                    </span>
                    {isSelected && <CheckCircle2 size={19} className="fill-emerald-500 text-white" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={saveLanguage}
              className="mt-5 h-11 w-full rounded-md bg-emerald-500 text-sm font-bold text-white transition hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              {t('Save', 'Хадгалах')}
            </button>
          </section>
        </div>
      )}
    </header>
  );
};

export default Navbar;