import React from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  LogOut,
  Settings,
  BarChart3,
} from "lucide-react";
import { useAuth } from "../../context/authContext";
import UniversitySeal from '../UniversitySeal';
import { useHRLanguage } from './HRLanguage';

const HRSidebar = () => {
  const { logout } = useAuth();
  const { t } = useHRLanguage();

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-slate-900 text-white shadow-xl">
      <div className="flex h-20 items-center border-b border-slate-700 px-6">
        <UniversitySeal />

        <div className="ml-3">
          <h1 className="text-lg font-bold">{t('Employee System')}</h1>
          <p className="text-xs text-slate-400">{t('HR Officer')}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <SidebarItem
          to="/hr-office"
          icon={<LayoutDashboard size={20} />}
          label={t('Dashboard')}
        />

        <SidebarItem
          to="/hr-office/employees"
          icon={<Users size={20} />}
          label={t('Employees')}
        />
        <SidebarItem
          to="/hr-office/separationType"
          icon={<ClipboardCheck size={20} />}
          label={t('HR Separation Types')}
        />
      
        <SidebarItem
          to="/hr-office/clearance-requests"
          icon={<ClipboardCheck size={20} />}
          label={t('Clearance Requests')}
        />
      
        <SidebarItem
          to="/hr-office/hr-assessment"
          icon={<ClipboardCheck size={20} />}
          label={t('HR Assessment')}
        />
         <SidebarItem
          to="/hr-office/hr-workflow"
          icon={<ClipboardCheck size={20} />}
          label={t('HR Workflow')}
        />
        <SidebarItem
          to="/hr-office/final-hr-clearance"
          icon={<ClipboardCheck size={20} />}
          label={t('Final HR Clearance')}
        />
        <SidebarItem
          to="/hr-office/certificates"
          icon={<ClipboardCheck size={20} />}
          label={t('Certificates')}
        />
        <SidebarItem
          to="/hr-office/reports"
          icon={<BarChart3 size={20} />}
          label={t('HR Report')}
        />
        {/* Notifications
        <SidebarItem
          to="/hr-office/notifications"
          icon={<ClipboardCheck size={20} />}
          label={t('Notifications')}
        /> */}

        <SidebarItem
          to="/hr-office/settings"
          icon={<Settings size={20} />}
          label={t('Settings')}
        />
      </nav>

      <div className="border-t border-slate-700 p-4">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-slate-300 transition hover:bg-red-600 hover:text-white"
        >
          <LogOut size={20} />
          <span>{t('Logout')}</span>
        </button>
      </div>
    </aside>
  );
};

const SidebarItem = ({ icon, label, to }) => (
  <Link
    to={to || "/hr-office"}
    className="mb-1 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-slate-300 transition hover:bg-slate-800 hover:text-white"
  >
    {icon}
    <span>{label}</span>
  </Link>
);

export default HRSidebar;
