import React from 'react';
import { useAuth } from '../../context/authContext';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-teal-700 bg-teal-600 px-6 text-white shadow-sm">
      <div className="flex items-center gap-3">
        <span className="hidden h-2.5 w-2.5 rounded-full bg-emerald-300 sm:block" />
        <p className="text-sm font-medium">
          Welcome, <span className="font-semibold">{user?.name || 'Property Officer'}</span>
        </p>
      </div>

      <button
        type="button"
        onClick={logout}
        className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800"
      >
        Logout
      </button>
    </header>
  );
};

export default Navbar;