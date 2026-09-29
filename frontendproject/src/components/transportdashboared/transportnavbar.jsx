import React from 'react';
import { useAuth } from '../../context/authContext';
import UniversitySeal from '../UniversitySeal';

const TransportNavbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full text-white shadow-sm">
      <div className="flex w-16 shrink-0 items-center justify-center gap-3 bg-[#0b192c] px-3 md:w-64 md:justify-start md:px-4">
        <UniversitySeal className="h-9 w-9" />
        <div className="hidden min-w-0 md:block">
          <p className="whitespace-nowrap text-sm font-bold">Employee System</p>
          <p className="mt-0.5 whitespace-nowrap text-xs text-slate-400">Transport Officer</p>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-between bg-[#009688] px-4 sm:px-6">
        <p className="truncate text-base font-medium sm:text-lg">
          Welcome {user?.name || 'Transport Officer'}
        </p>
        <button
          type="button"
          onClick={logout}
          className="ml-4 shrink-0 rounded-md bg-[#00796b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#00695c]"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default TransportNavbar;