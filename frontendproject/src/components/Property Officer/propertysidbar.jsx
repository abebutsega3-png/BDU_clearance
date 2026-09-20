import React, { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/authContext";
import {
  LayoutDashboard,
  FileCheck,
  PackageCheck,
  History,
  BarChart3,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Boxes,
  Clock,
  CheckCircle2,
  RotateCcw,
  ListCheck,
} from "lucide-react";
import UniversitySeal from '../UniversitySeal';

export default function PropertyLayout() {
  const [clearanceOpen, setClearanceOpen] = useState(true);
  const [assetRecordsOpen, setAssetRecordsOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const isClearanceActive = location.pathname.startsWith("/property/clearance-requests");
  const isAssetRecordsActive = location.pathname.startsWith("/property/asset-records");

  return (
    <div className="min-h-screen bg-slate-100 text-slate-700">
      <aside className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-slate-900 text-slate-300 shadow-xl">
        <div className="flex h-20 items-center border-b border-slate-700 px-6">
          <UniversitySeal />
          <div className="ml-3 min-w-0">
            <h1 className="truncate text-lg font-bold text-white">Employee Clearance</h1>
            <p className="text-xs text-slate-400">Property / Asset Officer</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5" aria-label="Property officer navigation">
          <NavLink
            to="/property/dashboard"
            end
            className={({ isActive }) =>
              `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/property/clearance-requests"
            className={({ isActive }) =>
              `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <History size={18} />
            <span>Clearance Requests</span>
          </NavLink>

          <NavLink
            to="/property/asset-records"
            className={({ isActive }) =>
              `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <PackageCheck size={18} />
            <span>Asset Records</span>
          </NavLink>
            

          <NavLink
            to="/property/clearance-history"
            className={({ isActive }) =>
              `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <History size={18} />
            <span>Clearance History</span>
          </NavLink>

          <NavLink
            to="/property/reports"
            className={({ isActive }) =>
              `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <BarChart3 size={18} />
            <span>Reports</span>
          </NavLink>

          <NavLink
            to="/property/notifications"
            className={({ isActive }) =>
              `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <Bell size={18} />
            <span>Notifications</span>
          </NavLink>

          <NavLink
            to="/property/profile"
            className={({ isActive }) =>
              `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <User size={18} />
            <span>Profile</span>
          </NavLink>

          <NavLink
            to="/property/settings"
            className={({ isActive }) =>
              `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <Settings size={18} />
            <span>Settings</span>
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

      <div className="ml-72 min-h-screen">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-teal-700 bg-teal-600 px-6 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
            <p className="text-sm font-medium">Welcome, {user?.name || "Property Officer"}</p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800"
          >
            Logout
          </button>
        </header>

        <main className="min-h-[calc(100vh-4rem)] bg-slate-50 p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}