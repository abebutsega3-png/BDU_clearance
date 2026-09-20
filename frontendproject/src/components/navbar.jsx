import React from 'react';
import { Link } from 'react-router-dom';
import TopHeader from './header';

export default function Navbar() {
  return (
    <header className="border-b border-white/10 px-6 py-4 lg:px-12 bg-[#0b1b3d] shadow-md w-full">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        
        {/* Embedded Top Header Brand */}
        <TopHeader />

        {/* Navigation Links */}
        <nav className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2 text-sm">
          <Link to="/home" className="flex items-center gap-2 text-white font-medium transition-colors hover:text-green-400">
            Home
          </Link>

          <Link to="/services" className="flex items-center gap-2 text-white font-medium transition-colors hover:text-green-400">
            Services
          </Link>

          <Link to="/instruction" className="flex items-center gap-2 text-white font-medium transition-colors hover:text-green-400">
            Instructions
          </Link>
          
          <Link to="/about" className="flex items-center gap-2 text-white font-medium transition-colors hover:text-green-400">
            About
          </Link>
          
          <Link to="/contact" className="flex items-center gap-2 text-white font-medium transition-colors hover:text-green-400">
            Contact
          </Link>
        </nav>

        {/* Login Button */}
        <div>
          <Link
            to="/login"
            className="flex items-center gap-2 rounded-full border border-white/20 bg-transparent px-5 py-2 text-sm font-medium text-white transition-all hover:bg-white hover:text-slate-900 shadow-sm"
          >
            Login
          </Link>
        </div>

      </div>
    </header>
  );
}