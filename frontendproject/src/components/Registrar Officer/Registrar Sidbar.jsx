import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  GraduationCap, 
  FileCheck, 
  Settings, 
  BarChart3, 
  User, 
  LogOut 
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, onLogout }) => {
  // በምስሉ ላይ የሚታዩት የ Sidebar ዝርዝሮች
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clearance', label: 'Clearance Requests', icon: FileText },
    { id: 'academic', label: 'Academic Records', icon: GraduationCap },
    { id: 'verification', label: 'Document Verification', icon: FileCheck },
    { id: 'settings', label: 'Registrar Officer Settings', icon: Settings },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <aside className="w-64 bg-[#0a2540] text-gray-300 min-h-[calc(100vh-4rem)] flex flex-col justify-between shadow-xl">
      {/* የሜኑ ዝርዝር */}
      <div className="py-4 px-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                  : 'hover:bg-blue-950/60 hover:text-white text-gray-300'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ከታች ያለው የ Logout አዝራር */}
      <div className="p-4 border-t border-blue-900/40">
        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-300 hover:bg-red-600/20 hover:text-red-400 transition"
        >
          <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-400" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;