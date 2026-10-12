import React, { useState } from 'react';
import { Bell, ChevronDown, User } from 'lucide-react';

const Navbar = ({ activeRole = "Registrar Officer", onLogout }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <header className="h-16 bg-[#003366] text-white flex items-center justify-between px-6 shadow-md border-b border-blue-900 sticky top-0 z-50">
      {/* ግራ ጎን: ሎጎ እና የተቋሙ ስም */}
      <div className="flex items-center space-x-3">
        {/* የባህር ዳር ዩኒቨርሲቲ ሎጎ ቦታ */}
        <div className="w-10 h-10 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center overflow-hidden">
          <span className="text-[#003366] font-bold text-xs">BDU</span>
        </div>
        <div>
          <h1 className="text-lg font-bold leading-none tracking-wide">Bahir Dar University</h1>
          <p className="text-xs text-blue-200 mt-1 font-light">Registrar Officer</p>
        </div>
      </div>

      {/* ቀኝ ጎን: ማሳወቂያዎች እና ፕሮፋይል */}
      <div className="flex items-center space-x-6">
        {/* የማሳወቂያ ደወል (Notification Badge) */}
        <div className="relative cursor-pointer hover:opacity-80 transition">
          <Bell className="w-6 h-6 text-white" />
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
            3
          </span>
        </div>

        {/* የተጠቃሚ ፕሮፋይል እና የዳሽቦርድ መምረጫ */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-2 bg-blue-900/50 hover:bg-blue-900 px-3 py-1.5 rounded-lg transition border border-blue-700/50"
          >
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold">
              <User className="w-5 h-5" />
            </div>
            <span className="font-medium text-sm">{activeRole}</span>
            <ChevronDown className="w-4 h-4 text-blue-200" />
          </button>

          {/* Switch Role / Menu Dropdown */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white text-gray-800 rounded-lg shadow-xl py-2 z-50 border border-gray-100">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs text-gray-400 font-semibold uppercase">Current Role</p>
                <p className="text-sm font-bold text-gray-800">{activeRole}</p>
              </div>
              <button
                onClick={() => setIsDropdownOpen(false)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between text-gray-700"
              >
                Profile & Settings
              </button>
              <button
                onClick={onLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;