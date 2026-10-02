import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, LayoutDashboard, LockKeyhole, LogOut, Settings, UserRound } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import AdminNotificationBell from './AdminNotificationBell';
import UniversitySeal from '../UniversitySeal';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

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

  return (
    <header className="flex min-h-[72px] items-center justify-between gap-4 bg-teal-700 px-4 text-white shadow-sm sm:px-6">
      <p className="truncate text-sm font-medium sm:text-base">Welcome, {user?.name || 'Admin'}</p>
      <div className="flex min-w-0 items-center gap-3 sm:gap-5">
        <div className="rounded-full border border-white/20 p-1 text-white [&_button:hover]:bg-white/10 [&_button]:text-white">
          <AdminNotificationBell />
        </div>
        <div className="relative" ref={accountMenuRef}>
          <button
            type="button"
            onClick={() => setAccountMenuOpen((isOpen) => !isOpen)}
            aria-label="Open System Administrator menu"
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
              <p className="max-w-48 truncate text-xs font-semibold">System Administrator</p>
              <p className="max-w-48 truncate text-[10px] text-teal-100">{user?.email || user?.name || 'Admin account'}</p>
            </div>
            <ChevronDown size={15} className={`hidden transition-transform sm:block ${accountMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {accountMenuOpen && (
            <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-700 shadow-xl">
              <div className="px-4 py-4">
                <p className="truncate text-sm font-semibold text-slate-800">System Administrator</p>
                <p className="mt-1 truncate text-xs text-slate-500">{user?.email || user?.name || 'Admin account'}</p>
                <span className="mt-3 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800">System Administrator</span>
              </div>
              <div className="border-t border-slate-200 py-1.5">
                <Link role="menuitem" to="/admin" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                  <LayoutDashboard size={17} className="text-slate-500" /> My Dashboard
                </Link>
                <Link role="menuitem" to="/admin/profile" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                  <UserRound size={17} className="text-slate-500" /> View Profile
                </Link>
                <Link role="menuitem" to="/admin/change-password" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                  <LockKeyhole size={17} className="text-slate-500" /> Change Password
                </Link>
                <Link role="menuitem" to="/admin/system-settings" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                  <Settings size={17} className="text-slate-500" /> Dashboard Settings
                </Link>
              </div>
              <div className="border-t border-slate-200 py-1.5">
                <button role="menuitem" type="button" onClick={() => { closeAccountMenu(); logout(); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50">
                  <LogOut size={17} /> Sign Out
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