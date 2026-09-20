import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import {
  LayoutDashboard,
  FileCheck,
  History,
  BarChart3,
  Bell,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import UniversitySeal from '../UniversitySeal';

const dashboardItems = [
  { to: '/ict-office', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/ict-office/requests', label: 'ICT Clearance Request', icon: FileCheck },
  { to: '/ict-office/assets', label: 'ICT Asset Records', icon: FileCheck },
  { to: '/ict-office/history', label: 'ICT Clearance History', icon: History },
  { to: '/ict-office/reports', label: 'ICT Reports', icon: BarChart3 },
  { to: '/ict-office/notifications', label: 'ICT Notifications', icon: Bell },
  { to: '/ict-office/profile', label: 'ICT Profile', icon: User },
  { to: '/ict-office/settings', label: 'ICT Settings', icon: Settings },
];

export default function ICTOfficerSidebar() {
  const { logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-slate-900 text-slate-300 shadow-xl">
      <div className="flex h-20 items-center border-b border-slate-700 px-6">
        <UniversitySeal />
        <div className="ml-3 min-w-0">
          <h1 className="truncate text-lg font-bold text-white">Employee Clearance</h1>
          <p className="text-xs text-slate-400">ICT Officer</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5" aria-label="ICT officer navigation">
        {dashboardItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/ict-office'}
            className={({ isActive }) =>
              `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
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
