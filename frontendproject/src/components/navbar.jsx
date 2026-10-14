import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, Phone, UserRound } from 'lucide-react';
import { FaFacebookF, FaTwitter } from 'react-icons/fa';
import universitySeal from '../assets/image-transparent.png';

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <div className="w-full bg-white shadow-sm sticky top-0 z-50">
      {/* 1. Top Light Blue Utility Bar (በሁሉም ገጽ ላይ አንድ አይነት) */}
      <div className="bg-[#29b6f6] text-white">
        <div className="mx-auto flex min-h-[26px] max-w-6xl items-center justify-between px-4 text-xs sm:px-6">
          <div className="flex items-center gap-5">
            <a href="tel:+251583209653" className="flex items-center gap-1.5 hover:underline">
              <Phone size={12} />
              <span>+251 583 20 9653</span>
            </a>
            <a href="mailto:bduinfo@bdu.edu.et" className="hidden items-center gap-1.5 sm:flex hover:underline">
              <Mail size={13} />
              <span>bduinfo@bdu.edu.et</span>
            </a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="flex items-center gap-1 hover:underline">
              <UserRound size={12} />
              Login
            </Link>
            <a 
              href="https://www.facebook.com/BahirDarUniversity" 
              target="_blank" 
              rel="noreferrer"
              aria-label="Facebook" 
              className="hover:text-blue-100 transition-colors"
            >
              <FaFacebookF size={12} />
            </a>
            <a 
              href="https://twitter.com/BahirDarU" 
              target="_blank" 
              rel="noreferrer"
              aria-label="Twitter" 
              className="hover:text-blue-100 transition-colors"
            >
              <FaTwitter size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* 2. Main White BDU Header (በሁሉም ገጽ ላይ አንድ አይነት) */}
      <header className="bg-white border-b border-gray-100">
        <div className="mx-auto flex min-h-[80px] max-w-6xl items-center justify-between gap-5 px-4 sm:px-6">
          {/* Logo & Brand Name */}
          <Link to="/home" className="flex shrink-0 items-center gap-3">
            <img src={universitySeal} alt="Bahir Dar University seal" className="h-12 w-12 object-contain" />
            <span className="leading-tight">
              <span className="block text-lg font-bold text-[#174a83]">Bahir Dar University</span>
              <span className="block text-[11px] font-medium italic text-[#0088cc]">
                Wisdom at the Source of the Blue Nile
              </span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav aria-label="Main navigation" className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 text-sm font-semibold text-slate-700">
            <Link 
              to="/home" 
              className={`transition-colors hover:text-blue-600 ${pathname === '/home' ? 'text-blue-600 font-bold' : ''}`}
            >
              Home
            </Link>
            <Link 
              to="/about" 
              className={`transition-colors hover:text-blue-600 ${pathname === '/about' ? 'text-blue-600 font-bold' : ''}`}
            >
              About Us ▾
            </Link>
            <Link 
              to="/instruction" 
              className={`transition-colors hover:text-blue-600 ${pathname === '/instruction' ? 'text-blue-600 font-bold' : ''}`}
            >
              Instruction ▾
            </Link>
            <Link 
              to="/services" 
              className={`transition-colors hover:text-blue-600 ${pathname === '/services' ? 'text-blue-600 font-bold' : ''}`}
            >
              Services ▾
            </Link>
            <Link 
              to="/contact" 
              className={`transition-colors hover:text-blue-600 ${pathname === '/contact' ? 'text-blue-600 font-bold' : ''}`}
            >
              contact Us
            </Link>
          </nav>
        </div>
      </header>
    </div>
  );
}