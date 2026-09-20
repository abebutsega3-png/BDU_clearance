import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import {
  LayoutDashboard,
  FileCheck,
  Landmark,
  BarChart3,
  Bell,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import UniversitySeal from '../UniversitySeal';

export default function FinanceOfficerSidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-slate-900 text-slate-300 shadow-xl">
      <div className="flex h-20 items-center border-b border-slate-700 px-6">
        <UniversitySeal />
        <div className="ml-3 min-w-0">
          <h1 className="truncate text-lg font-bold text-white">Employee Clearance</h1>
          <p className="text-xs text-slate-400">Finance Officer</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5" aria-label="Finance officer navigation">
        <NavLink
          to="/finance-office"
          end
          className={({ isActive }) =>
            `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
              isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/finance-office/requests"
          className={({ isActive }) =>
            `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
              isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <FileCheck size={18} />
          <span>Financial Clearance Requests</span>
        </NavLink>
 <NavLink
          to="/finance-office/records"
          className={({ isActive }) =>
            `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
              isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <FileCheck size={18} />
          <span>Financial Records</span>
        </NavLink>
        <NavLink
          to="/finance-office/reports"
          className={({ isActive }) =>
            `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
              isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <BarChart3 size={18} />
          <span>Financial Reports</span>
        </NavLink>

        <NavLink
          to="/finance-office/notifications"
          className={({ isActive }) =>
            `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
              isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <Bell size={18} />
          <span> Financial Notifications</span>
        </NavLink>

        <NavLink
          to="/finance-office/profile"
          className={({ isActive }) =>
            `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
              isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <User size={18} />
          <span>Financial Profile</span>
        </NavLink>

        <NavLink
          to="/finance-office/settings"
          className={({ isActive }) =>
            `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
              isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <Settings size={18} />
          <span>Financial Settings</span>
        </NavLink>
      </nav>

      <div className="border-t border-slate-700 p-4">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-red-600 hover:text-white"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
