import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, ClipboardCheck, Globe2, LayoutDashboard, LockKeyhole, LogOut, Settings, UserRound } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import { canonicalizeRole, getActiveRole, getDashboardPath, getUserRoles } from '../../until/authRoles';
import UniversitySeal from '../UniversitySeal';
import { useDepartmentLanguage } from './DepartmentLanguage';

const DepartmentNavbar = () => {
  const { user, updateUser, logout } = useAuth();
  const { language, setLanguage, t } = useDepartmentLanguage();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const navigate = useNavigate();

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
  const displayName = user?.name || 'Department Head';
  const email = user?.email || displayName;
  const activeRole = getActiveRole(user) || 'department head';
  const dashboardRoles = getUserRoles(user)
    .map((role) => ({ role, path: getDashboardPath(role) }))
    .filter((item) => item.path);

  const switchRole = (role, path) => {
    updateUser({ role, activeRole: role });
    closeAccountMenu();
    navigate(path);
  };

  return (
    <header className="flex min-h-[72px] items-center justify-end bg-[#0d7c74] px-4 py-3 text-white shadow-sm sm:px-6">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <label className="inline-flex h-12 items-center gap-3 rounded-full border-2 border-white/90 bg-[#0d7c74] px-4 text-base font-semibold text-white shadow-sm transition hover:bg-[#0b6e68] focus-within:outline focus-within:outline-2 focus-within:outline-white sm:px-5">
          <Globe2 size={22} aria-hidden="true" />
          <span className="sr-only">Language</span>
          <select
            aria-label="Language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="max-w-24 cursor-pointer appearance-none bg-transparent text-base font-semibold text-white outline-none"
          >
            <option value="en" className="text-slate-900">English</option>
            <option value="am" className="text-slate-900">Amharic</option>
          </select>
          <ChevronDown size={18} aria-hidden="true" />
        </label>

        <button
          type="button"
          onClick={() => navigate('/department-head/notifications')}
          className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/90 bg-[#0d7c74] text-white transition hover:bg-[#0b6e68]"
          aria-label={t('Open department notifications')}
          title={t('Notifications')}
        >
          <Bell size={20} />
        </button>

        <div className="relative" ref={accountMenuRef}>
          <button
            type="button"
            onClick={() => setAccountMenuOpen((isOpen) => !isOpen)}
            aria-label={t('Open Department Head menu')}
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
            className="flex min-w-0 items-center gap-2 rounded-full border-2 border-white/90 bg-[#0d7c74] px-2 py-1.5 text-left transition hover:bg-[#0b6e68] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            {user?.profileImage ? (
              <img src={user.profileImage} alt="Department Head profile" className="h-10 w-10 shrink-0 rounded-full bg-white object-cover ring-2 ring-white/80" />
            ) : (
              <UniversitySeal className="h-10 w-10 rounded-full bg-white p-0.5 ring-2 ring-white/80" />
            )}
            <div className="hidden min-w-0 sm:block">
              <p className="max-w-48 truncate text-xs font-semibold text-white">{displayName}</p>
              <p className="max-w-48 truncate text-[10px] text-teal-50">{email}</p>
            </div>
            <ChevronDown size={15} className={`hidden transition-transform sm:block ${accountMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {accountMenuOpen && (
            <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-700 shadow-xl">
              <div className="px-4 py-4">
                <div className="flex items-center gap-3">
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt="Department Head profile" className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-200" />
                  ) : (
                    <UniversitySeal className="h-10 w-10 rounded-full bg-slate-100 p-1" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{displayName}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{email}</p>
                  </div>
                </div>
                <span className="mt-3 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800">{activeRole.split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
              </div>
              {dashboardRoles.length > 1 && (
                <div className="border-t border-slate-200 px-3 py-3">
                  <p className="mb-2 text-xs font-semibold text-slate-500">{t('Switch Role')}</p>
                  <div className="space-y-1.5">
                    {dashboardRoles.map(({ role, path }) => (
                      <button
                        key={role}
                        type="button"
                        role="menuitemradio"
                        aria-checked={canonicalizeRole(activeRole) === role}
                        onClick={() => switchRole(role, path)}
                        className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition ${
                          canonicalizeRole(activeRole) === role ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`h-3 w-3 rounded-full border ${
                          canonicalizeRole(activeRole) === role ? 'border-blue-600 bg-blue-600 ring-2 ring-blue-100' : 'border-slate-400'
                        }`} />
                        <span className="font-medium">{role.split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Dashboard</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="border-t border-slate-200 py-1.5">
                <Link role="menuitem" to="/department-head" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                  <LayoutDashboard size={17} className="text-slate-500" /> {t('My Dashboard')}
                </Link>
                <Link role="menuitem" to="/department-head/my-clearance" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                  <ClipboardCheck size={17} className="text-slate-500" /> {t('My Clearance')}
                </Link>
                <Link role="menuitem" to="/department-head/profile" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                  <UserRound size={17} className="text-slate-500" /> {t('View Profile')}
                </Link>
                <Link role="menuitem" to="/department-head/change-password" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                  <LockKeyhole size={17} className="text-slate-500" /> {t('Change Password')}
                </Link>
                <Link role="menuitem" to="/department-head/settings" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                  <Settings size={17} className="text-slate-500" /> {t('Settings')}
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

export default DepartmentNavbar;
