import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  BarChart3,
  Bell,
  UserCircle,
  LogOut,
  ChevronDown,
  Clock,
  CheckCircle,
  XCircle,
  Settings,
} from "lucide-react";
import UniversitySeal from '../UniversitySeal';

const HRSidebar = () => {
  const [openMenu, setOpenMenu] = useState(null);

  const toggleMenu = (menu) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-slate-900 text-white shadow-xl">

      {/* Logo */}
      <div className="flex h-20 items-center border-b border-slate-700 px-6">
        <UniversitySeal />

        <div className="ml-3">
          <h1 className="text-lg font-bold">Employee System</h1>
          <p className="text-xs text-slate-400">HR Officer</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-5">

        {/* Dashboard */}
        <SidebarItem
          to="/hr-office"
          icon={<LayoutDashboard size={20} />}
          label="Dashboard"
        />

        {/* Employees - አሁን ንዑስ ማኑ የለውም፣ በቀጥታ ወደ Employee List ይወስዳል */}
        <SidebarItem
          to="/hr-office/employees"
          icon={<Users size={20} />}
          label="Employees"
        />
<SidebarItem
          to="/hr-office/clearance-requests"
          icon={<ClipboardCheck size={20} />}
          label="Clearance Requests"
        />
        <SidebarItem
          to="/hr-office/final-hr-clearance"
          icon={<ClipboardCheck size={20} />}
          label="Final HR Clearance"
        />
         <SidebarItem
          to="/hr-office/certificates"
          icon={<ClipboardCheck size={20} />}
          label="Certificates"
        />
        {/* Reports */}
        <SidebarItem
          to="/hr-office/reports"
          icon={<BarChart3 size={20} />}
          label="Reports"
        />

        {/* Notifications */}
        <SidebarItem
          to="/hr-office/notifications"
          icon={<Bell size={20} />}
          label="Notifications"
        />

        {/* Settings */}
        <SidebarItem
          to="/hr-office/settings"
          icon={<Settings size={20} />}
          label="Settings"
        />

        {/* Profile */}
        <SidebarItem
          to="/hr-office/profile"
          icon={<UserCircle size={20} />}
          label="My Profile"
        />

      </nav>

      {/* Logout */}
      <div className="border-t border-slate-700 p-4">
        <button
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

const SidebarItem = ({ icon, label, to }) => {
  return (
    <Link
      to={to || "/hr-office"}
      className="mb-1 flex w-full items-center gap-3 rounded-lg px-4 py-3
                 text-slate-300 transition hover:bg-slate-800 hover:text-white"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
};

const MenuButton = ({ icon, label, open, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="mb-1 flex w-full items-center justify-between rounded-lg
                 px-4 py-3 text-slate-300 transition
                 hover:bg-slate-800 hover:text-white"
    >
      <div className="flex items-center gap-3">
        {icon}
        <span>{label}</span>
      </div>

      <ChevronDown
        size={18}
        className={`transition-transform ${
          open ? "rotate-180" : ""
        }`}
      />
    </button>
  );
};

const SubMenu = ({ children }) => {
  return (
    <div className="mb-2 ml-5 border-l border-slate-700 pl-3">
      {children}
    </div>
  );
};

const SubItem = ({ icon, label, to }) => {
  return (
    <Link
      to={to || "/hr-office"}
      className="mb-1 flex w-full items-center gap-3 rounded-md
                 px-3 py-2 text-sm text-slate-400 transition
                 hover:bg-slate-800 hover:text-white"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
};

export default HRSidebar;