import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  LogOut,
  Settings,
  BarChart3,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../../context/authContext";
import UniversitySeal from '../UniversitySeal';
import { useHRLanguage } from './useHRLanguage';

const HRSidebar = () => {
  const { logout } = useAuth();
  const { t } = useHRLanguage();
  const { pathname } = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-dvh w-72 flex-col bg-[#0b1b3d] text-white shadow-xl">
      <div className="flex h-[76px] shrink-0 items-center border-b border-white/10 px-5">
        <UniversitySeal className="h-14 w-14 rounded-full border border-amber-300/50 bg-white p-1 shadow-sm" />

        <div className="ml-3">
          <h1 className="text-sm font-bold tracking-wide text-white">{t('Bahir Dar University')}</h1>
          <p className="text-[10px] text-slate-400">{t('Employee Clearance')} | {t('HR Officer')}</p>
        </div>
      </div>

      <nav className="hr-sidebar-nav flex-1 overflow-y-auto px-3 py-3">
        <SidebarItem
          to="/hr-office"
          icon={<LayoutDashboard size={20} />}
          label={t('Dashboard')}
          active={pathname === '/hr-office'}
        />

        <SidebarItem
          to="/hr-office/employees"
          icon={<Users size={20} />}
          label={t('Employees')}
          active={pathname.startsWith('/hr-office/employees')}
        />
        <SidebarItem
          to="/hr-office/separationType"
          icon={<ClipboardCheck size={20} />}
          label={t('HR Separation Types')}
          active={pathname.startsWith('/hr-office/separationType')}
        />
      
        <SidebarItem
          to="/hr-office/clearance-requests"
          icon={<ClipboardCheck size={20} />}
          label={t('Clearance Requests')}
          active={pathname.startsWith('/hr-office/clearance-requests')}
        />
      
        <SidebarItem
          to="/hr-office/hr-assessment"
          icon={<ClipboardCheck size={20} />}
          label={t('HR Assessment')}
          active={pathname.startsWith('/hr-office/hr-assessment')}
        />
         <SidebarItem
          to="/hr-office/hr-workflow"
          icon={<ClipboardCheck size={20} />}
          label={t('HR Workflow')}
          active={pathname.startsWith('/hr-office/hr-workflow')}
        />
        <SidebarItem
          to="/hr-office/final-hr-clearance"
          icon={<ClipboardCheck size={20} />}
          label={t('Final HR Clearance')}
          active={pathname.startsWith('/hr-office/final-hr-clearance')}
        />
        <SidebarItem
          to="/hr-office/certificates"
          icon={<ClipboardCheck size={20} />}
          label={t('Certificates')}
          active={pathname.startsWith('/hr-office/certificates')}
        />
        <SidebarItem
          to="/hr-office/reports"
          icon={<BarChart3 size={20} />}
          label={t('HR Report')}
          active={pathname.startsWith('/hr-office/reports')}
        />
        <SidebarItem
          to="/hr-office/contact-messages"
          icon={<MessageSquare size={20} />}
          label={t('Contact Messages')}
          active={pathname.startsWith('/hr-office/contact-messages')}
        />

        <SidebarItem
          to="/hr-office/settings"
          icon={<Settings size={20} />}
          label={t('Settings')}
          active={pathname.startsWith('/hr-office/settings') || pathname.startsWith('/hr-office/dashboard-settings')}
        />
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition hover:bg-red-600/90 hover:text-white"
        >
          <LogOut size={20} />
          <span>{t('Logout')}</span>
        </button>
      </div>
    </aside>
  );
};

const SidebarItem = ({ icon, label, to, active }) => (
  <Link
    to={to || "/hr-office"}
    aria-current={active ? 'page' : undefined}
    className={`mb-0.5 flex min-h-9 w-full items-center gap-3 rounded-lg border-l-[3px] px-3 py-1.5 text-[13px] transition-colors ${
      active
        ? 'border-amber-400 bg-[#173b70] font-semibold text-white'
        : 'border-transparent text-slate-300 hover:bg-white/10 hover:text-white'
    }`}
  >
    {icon}
    <span>{label}</span>
  </Link>
);

export default HRSidebar;
