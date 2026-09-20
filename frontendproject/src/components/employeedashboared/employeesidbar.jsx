import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from '../../context/authContext';
import {
  LayoutDashboard,
  BarChart3,
  Bell,
  UserCircle,
  Settings,
  LogOut,
} from "lucide-react";
import UniversitySeal from '../UniversitySeal';

const EmployeeSidebar = ({ onNavigate }) => {
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const currentPath = decodeURIComponent(pathname || '').replace(/\/+$/, '').toLowerCase();
  const normalizedCurrentPath = currentPath.replace(/_/g, '-');
  const isMyClearanceRoute = [
    '/employee/my clearance',
    '/employee/my-clearance',
    '/employee/my_clearance',
    '/employee/my%20clearance',
    '/employee/my clearance/',
    '/employee/my-clearance/',
    '/employee/my_clearance/'
  ].includes(currentPath) || normalizedCurrentPath.startsWith('/employee/my') && normalizedCurrentPath.includes('clearance');

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-slate-900 text-white shadow-xl">

      {/* Logo */}
      <div className="flex h-20 items-center border-b border-slate-700 px-6">
        <UniversitySeal />

        <div className="ml-3">
          <h1 className="text-lg font-bold">Employee System</h1>
          <p className="text-xs text-slate-400">Employee</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-5">

        {/* Dashboard */}
        <SidebarItem
          to="/employee-dashboard"
          icon={<LayoutDashboard size={20} />}
          label="Dashboard"
          active={pathname === '/employee-dashboard'}
          onNavigate={onNavigate}
        />

    
        {/* My Clearance */}
        <SidebarItem
          to="/employee/my-clearance"
          icon={<Bell size={20} />}
          label="My Clearance"
          active={pathname === '/employee/my-clearance' }
          onNavigate={onNavigate}
        />

        {/* Notifications */}
        <SidebarItem
          to="/employee/notifications"
          icon={<Bell size={20} />}
          label="Notifications"
          active={pathname === '/employee/notifications'}
          onNavigate={onNavigate}
        />

        {/* Profile */}
        <SidebarItem
          to="/employee/documents"
          icon={<UserCircle size={20} />}
          label="Documents"
          active={pathname === '/employee/documents'}
          onNavigate={onNavigate}
        />
         <SidebarItem
          to="/employee/my-certificates"
          icon={<UserCircle size={20} />}
          label="My Certificates"
          active={pathname === '/employee/my-certificates'}
          onNavigate={onNavigate}
        />
        {/* Profile */}
        <SidebarItem
          to="/employee/profile"
          icon={<UserCircle size={20} />}
          label="My Profile"
          active={pathname === '/employee/profile'}
          onNavigate={onNavigate}
        />
        <SidebarItem
          to="/employee/settings"
          icon={<Settings size={20} />}
          label="Settings"
          active={pathname === '/employee/settings'}
          onNavigate={onNavigate}
        />

      </nav>

      {/* Logout */}
      <div className="border-t border-slate-700 p-4">
        <button
          onClick={logout}
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3
                     text-slate-300 transition hover:bg-red-600 hover:text-white"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

/* =========================
   Reusable Components
========================= */

const SidebarItem = ({ icon, label, to, active, onNavigate }) => {
  return (
    <Link
      to={to || "/employee-dashboard"}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`mb-1 flex w-full items-center gap-3 rounded-lg px-4 py-3 transition ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
};

export default EmployeeSidebar;