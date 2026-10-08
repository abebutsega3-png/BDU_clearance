import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronDown, LayoutDashboard, LockKeyhole, LogOut, Settings, UserRound } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import UniversitySeal from '../UniversitySeal';

const FinanceOfficerNavbar = () => {
  const { user, logout } = useAuth();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const employeeName = user?.name || user?.fullName || 'Finance Officer';

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
    <header className="flex h-20 items-center justify-between gap-4 bg-teal-600 px-5 text-white shadow-sm lg:px-8">
      <span className="truncate text-xl font-normal tracking-tight sm:text-2xl">Welcome {employeeName}</span>
      <div className="flex min-w-0 items-center gap-3 sm:gap-5">
        <Link
          to="/finance-office/notifications"
          aria-label="Finance notifications"
          className="rounded-full p-2 text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <Bell size={20} />
        </Link>
        <div className="relative" ref={accountMenuRef}>
          <div className="flex min-w-0 items-center gap-1 rounded-xl border-2 border-white/90 px-2 py-1.5 transition hover:bg-white/10">
            <Link
              to="/finance-office/profile"
              onClick={closeAccountMenu}
              aria-label="View Finance Officer profile"
              title="View profile"
              className="flex min-w-0 items-center gap-2 rounded-md text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              {user?.profileImage ? (
                <img src={user.profileImage} alt="" className="h-9 w-9 shrink-0 rounded-full bg-white object-cover" />
              ) : (
                <UniversitySeal className="h-9 w-9 bg-white p-0.5" />
              )}
              <div className="hidden min-w-0 sm:block">
                <p className="max-w-48 truncate text-xs font-semibold">{employeeName}</p>
                <p className="max-w-48 truncate text-[10px] text-teal-100">{user?.email || 'Finance Officer account'}</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setAccountMenuOpen((isOpen) => !isOpen)}
              aria-label="Open Finance Officer menu"
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              className="rounded p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <ChevronDown size={15} className={`transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {accountMenuOpen && (
            <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-700 shadow-xl">
              <div className="px-4 py-4">
                <p className="truncate text-sm font-semibold text-slate-800">{employeeName}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{user?.email || 'Finance Officer account'}</p>
                <span className="mt-3 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800">Finance Officer</span>
              </div>
              <div className="border-t border-slate-200 py-1.5">
                <Link role="menuitem" to="/finance-office" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                  <LayoutDashboard size={17} className="text-slate-500" /> My Dashboard
                </Link>
                <Link role="menuitem" to="/finance-office/profile" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                  <UserRound size={17} className="text-slate-500" /> View Profile
                </Link>
                <Link role="menuitem" to="/finance-office/profile?action=change-password" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                  <LockKeyhole size={17} className="text-slate-500" /> Change Password
                </Link>
                <Link role="menuitem" to="/finance-office/dashboard-settings" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
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

export default FinanceOfficerNavbar;
