import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Globe2, LayoutDashboard, LockKeyhole, Menu, Settings, UserRound, Users } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import { canonicalizeRole, getActiveRole, getDashboardPath, getUserRoles } from '../../until/authRoles';
import { fetchUnreadNotificationCount } from '../../until/NotificationHelper';
import { useEmployeeLanguage } from './EmployeeLanguage';
import UniversitySeal from '../UniversitySeal';

const roleDetails = {
  employee: {
    title: 'Employee Dashboard',
    description: 'My Clearance · My Profile · My Assets',
    icon: UserRound,
  },
  'department head': {
    title: 'Department Head Dashboard',
    description: 'Review Requests · Approvals · Reports',
    icon: Users,
  },
};

const formatRoleName = (role) => role
  .split(' ')
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');

const EmployeeNavbar = ({ onMenuClick }) => {
  const { user, updateUser, logout } = useAuth();
  const { language, setLanguage, t } = useEmployeeLanguage();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const accountMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const employeeName = user?.name || user?.fullName || 'Employee';
  const roles = getUserRoles(user);
  const activeRole = getActiveRole(user) || 'employee';
  const availableDashboards = roles
    .map((role) => ({ role, path: getDashboardPath(role), ...(roleDetails[role] || {}) }))
    .filter((item) => item.path);
  const displayRole = t(formatRoleName(activeRole));

  useEffect(() => {
    let active = true;
    const loadUnreadCount = async () => {
      try {
        const count = await fetchUnreadNotificationCount();
        if (active) setUnreadCount(count);
      } catch (error) {
        console.error('Failed to load employee unread notification count:', error);
      }
    };

    loadUnreadCount();
    window.addEventListener('notifications-updated', loadUnreadCount);
    const intervalId = window.setInterval(loadUnreadCount, 30000);
    return () => {
      active = false;
      window.removeEventListener('notifications-updated', loadUnreadCount);
      window.clearInterval(intervalId);
    };
  }, [location.pathname, user?._id, user?.id]);

  useEffect(() => {
    if (!accountMenuOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) setAccountMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setAccountMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [accountMenuOpen]);

  const switchRole = (role, path) => {
    updateUser({ role, activeRole: role });
    setAccountMenuOpen(false);
    navigate(path);
  };

  return (
    <header className="relative z-30 flex min-h-20 items-center justify-between gap-3 bg-teal-700 px-3 py-3 text-white shadow-sm sm:px-6 lg:ml-72 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" className="text-teal-100 hover:text-white lg:hidden" aria-label={t('Open menu')} onClick={onMenuClick}>
          <Menu size={21} />
        </button>
        <span className="hidden truncate text-xl font-normal tracking-tight md:inline sm:text-2xl">{t('Welcome')} {employeeName}</span>
      </div>

      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <label className="inline-flex h-10 items-center gap-2 rounded-full border border-white/35 px-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-within:outline focus-within:outline-2 focus-within:outline-white sm:h-12 sm:gap-3 sm:px-5 sm:text-base">
          <Globe2 size={20} aria-hidden="true" />
          <select
            aria-label={t('Language')}
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="max-w-20 cursor-pointer appearance-none bg-transparent text-sm font-semibold text-white outline-none sm:max-w-none sm:text-base"
          >
            <option value="en" className="text-slate-900">English</option>
            <option value="am" className="text-slate-900">አማርኛ</option>
          </select>
          <ChevronDown size={16} aria-hidden="true" />
        </label>

        <Link
          to="/employee/notifications"
          aria-label={unreadCount ? `${unreadCount} ${t('unread notifications')}` : t('Notifications')}
          title={t('Notifications')}
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/25 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:h-12 sm:w-12"
        >
          <Bell size={21} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-teal-700 bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

      <div className="relative shrink-0" ref={accountMenuRef}>
        <button
          type="button"
          onClick={() => setAccountMenuOpen((isOpen) => !isOpen)}
          aria-label={t('Open account menu')}
          aria-haspopup="menu"
          aria-expanded={accountMenuOpen}
          className="flex min-w-0 items-center gap-2 rounded-xl border-2 border-white/90 px-2 py-1.5 text-left transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:gap-3"
        >
          {user?.profileImage
            ? <img src={user.profileImage} alt="" className="h-9 w-9 shrink-0 rounded-full bg-white object-cover sm:h-11 sm:w-11" />
            : <UniversitySeal className="h-9 w-9 bg-white p-0.5 sm:h-11 sm:w-11" />}
          <div className="hidden min-w-0 sm:block">
            <p className="max-w-40 truncate text-xs font-semibold">{displayRole}</p>
            <p className="max-w-40 truncate text-[10px] text-teal-100">{user?.email || user?.username || employeeName}</p>
          </div>
          <ChevronDown size={15} className={`hidden shrink-0 transition-transform sm:block ${accountMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {accountMenuOpen && (
          <div role="menu" className="absolute right-0 top-full mt-2 w-[min(19rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white text-left text-slate-700 shadow-xl">
            <div className="flex items-center gap-3 p-4">
              {user?.profileImage
                ? <img src={user.profileImage} alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-slate-200" />
                : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600"><UserRound size={22} /></span>}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{employeeName}</p>
                <p className="truncate text-xs text-slate-500">{user?.email || user?.username || ''}</p>
                {user?.status && <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">{user.status}</span>}
              </div>
            </div>

            {availableDashboards.length > 0 && (
              <div className="border-t border-slate-200 px-3 py-3">
                <p className="mb-2 text-xs font-semibold text-slate-500">{t('Current Role')}</p>
                <div className="mb-3 flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800">
                  <span>{t(formatRoleName(activeRole))}</span>
                  <ChevronDown size={15} />
                </div>

                {availableDashboards.length > 1 && (
                  <div className="space-y-2">
                    <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <LayoutDashboard size={16} />
                      <span>{t('Switch Role')}</span>
                    </div>
                    <p className="mb-2 text-[11px] text-slate-500">{t('Choose your preferred dashboard')}</p>
                    {availableDashboards.map((dashboard) => {
                      const { role, path, title, description } = dashboard;
                      const Icon = dashboard.icon || LayoutDashboard;
                      const isActive = canonicalizeRole(activeRole) === role;
                      return (
                        <button
                          key={role}
                          type="button"
                          role="menuitemradio"
                          aria-checked={isActive}
                          onClick={() => switchRole(role, path)}
                          className={`flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition ${
                            isActive ? 'border-blue-200 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <Icon size={16} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-semibold text-slate-700">{t(title || `${formatRoleName(role)} Dashboard`)}</span>
                            <span className="mt-0.5 block truncate text-[10px] text-slate-500">{t(description || `Open ${formatRoleName(role)} workspace`)}</span>
                          </span>
                          <span className={`h-3 w-3 shrink-0 rounded-full border ${
                            isActive ? 'border-blue-600 bg-blue-600 ring-2 ring-blue-100' : 'border-slate-400'
                          }`} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-slate-200 py-1.5">
              <button type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); navigate('/employee/profile'); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-slate-50">
                <UserRound size={16} className="text-slate-500" /> {t('My Profile')}
              </button>
              <button type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); navigate('/employee/profile?tab=password'); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-slate-50">
                <LockKeyhole size={16} className="text-slate-500" /> {t('Change Password')}
              </button>
              <button type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); navigate('/employee/settings'); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-slate-50">
                <Settings size={16} className="text-slate-500" /> {t('Dashboard Settings')}
              </button>
              <button type="button" role="menuitem" onClick={logout} className="flex w-full items-center gap-3 border-t border-slate-200 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50">
                <span aria-hidden="true">↪</span> {t('Logout')}
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </header>
  );
};

export default EmployeeNavbar;
