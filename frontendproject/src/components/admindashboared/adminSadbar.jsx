import React from 'react';
import { NavLink } from 'react-router-dom';
import UniversitySeal from '../UniversitySeal';
import { 
  FaTachometerAlt, 
  FaUsers, 
  FaUserShield,
  FaBuilding, 
  FaListOl,
  FaTasks,
  FaLaptop, 
  FaCertificate, 
  FaChartBar, 
  FaHistory,
  FaCogs,
  FaUser,
  FaSignOutAlt 
} from 'react-icons/fa';

const AdminSidebar = () => {
  const navigationItems = [
    { label: 'Dashboard', path: '/admin', icon: FaTachometerAlt, end: true },
    { label: 'Users', path: '/admin/users', icon: FaUsers },
    { label: 'Roles & Permissions', path: '/admin/roles-permissions', icon: FaUserShield },
    { label: 'Departments', path: '/admin/departments', icon: FaBuilding },
    { label: 'Positions', path: '/admin/positions', icon: FaBuilding },
    { label: 'Reports', path: '/admin/reports', icon: FaChartBar },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: FaHistory },
    { label: 'My Profile', path: '/admin/profile', icon: FaUser },
    { label: 'System Settings', path: '/admin/system-settings', icon: FaCogs },
  ];

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col overflow-hidden bg-[#0b192c] text-slate-300 shadow-lg shadow-slate-950/30">
      {/* Brand Header */}
      <div className="flex items-center gap-3 border-b border-slate-800 px-3 pb-3 pt-4 text-sm font-bold tracking-wider text-white">
        <UniversitySeal className="h-10 w-10" />
        <div>
          BAHIR DAR UNIVERSITY
        <span className="mt-1 block text-[10px] font-normal text-slate-400">
          EMPLOYEE CLEARANCE MANAGEMENT
        </span>
        </div>
      </div>

      {/* NAVIGATION LINKS */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-slate-700">
        {navigationItems.map(({ label, path, icon: Icon, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) => `${isActive ? 'bg-teal-600 text-white' : 'hover:bg-slate-800 hover:text-white'} flex items-center space-x-3 rounded-md px-3 py-2.5 transition duration-150`}
          >
            <Icon className="text-base" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 px-4 py-3">
        <button
          onClick={() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }}
          className="flex w-full items-center space-x-3 rounded-md px-3 py-2.5 text-left text-slate-300 transition duration-150 hover:bg-red-600/20 hover:text-red-400"
        >
          <FaSignOutAlt className="text-base" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;