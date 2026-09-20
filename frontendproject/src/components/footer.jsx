import React from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, 
  Mail, 
  Phone, 
  Globe
} from 'lucide-react';
import { FaGoogle, FaInstagram, FaYoutube } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

export default function Footer() {
  return (
    <footer className="bg-[#071328] text-slate-300 pt-12 pb-6 border-t border-slate-800 text-xs sm:text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-slate-800">
        
        {/* 1. Contact Us Section */}
        <div>
          <h4 className="font-bold text-amber-400 uppercase text-xs tracking-wider mb-3">CONTACT US</h4>
          <ul className="space-y-2.5 text-slate-300 text-xs">
            <li className="flex items-start space-x-2">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span className="text-slate-400">Bahir Dar University, Bahir Dar, Ethiopia</span>
            </li>
            <li className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-400">clearance@bdu.edu.et</span>
            </li>
            <li className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-400">+251 58 220 1010</span>
            </li>
            <li className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-400">www.bdu.edu.et</span>
            </li>
          </ul>
        </div>

        {/* 2. Quick Links */}
        <div>
          <h4 className="font-bold text-amber-400 uppercase text-xs tracking-wider mb-3">QUICK LINKS</h4>
          <ul className="space-y-2 text-slate-300 text-xs">
            <li><Link to="/" className="hover:text-white transition">Home</Link></li>
            <li><Link to="/services" className="hover:text-white transition">Services</Link></li>
            <li><Link to="/instruction" className="hover:text-white transition">Instructions</Link></li>
            <li><Link to="/about" className="hover:text-white transition">About</Link></li>
            <li><Link to="/contact" className="hover:text-white transition">Contact</Link></li>
          </ul>
        </div>

        {/* 3. Clearance */}
        <div>
          <h4 className="font-bold text-amber-400 uppercase text-xs tracking-wider mb-3">CLEARANCE</h4>
          <ul className="space-y-2 text-slate-300 text-xs">
            <li><Link to="/login" className="hover:text-white transition">Start Clearance</Link></li>
            <li><Link to="/status" className="hover:text-white transition">Check Status</Link></li>
            <li><Link to="/instruction" className="hover:text-white transition">Clearance Instructions</Link></li>
            <li><Link to="/documents" className="hover:text-white transition">Required Documents</Link></li>
            <li><Link to="/help" className="hover:text-white transition">Help & Support</Link></li>
          </ul>
        </div>

        {/* 4. Help & Support */}
        <div>
          <h4 className="font-bold text-amber-400 uppercase text-xs tracking-wider mb-3">HELP & SUPPORT</h4>
          <ul className="space-y-2 text-slate-300 text-xs">
            <li><Link to="/guide" className="hover:text-white transition">User Guide</Link></li>
            <li><Link to="/faq" className="hover:text-white transition">FAQ</Link></li>
            <li><Link to="/contact" className="hover:text-white transition">Contact Support</Link></li>
            <li><Link to="/ticket" className="hover:text-white transition">Submit a Ticket</Link></li>
          </ul>
        </div>

        {/* 5. About & Follow Us (ጽሁፉ ጠፍቶ መግለጫው እና ትክክለኛዎቹ የማህበራዊ ሚዲያ አዶዎች ያሉበት) */}
        <div className="lg:col-span-1 space-y-5">
          <p className="text-slate-400 text-xs leading-relaxed">
            Our goal is to make the clearance process transparent, efficient and employee friendly.
          </p>

          {/* Follow Us Icons */}
          <div className="border-t border-slate-800 pt-4">
            <p className="text-[11px] text-amber-400 font-semibold mb-3">FOLLOW US</p>
            <div className="flex space-x-2.5 text-slate-300">
              {/* Social links */}
              <a href="https://instagram.com" target="_blank" rel="noreferrer" title="Instagram" aria-label="Instagram" className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center hover:bg-pink-600 hover:text-white transition">
                <FaInstagram className="w-4 h-4" aria-label="Instagram" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" title="YouTube" aria-label="YouTube" className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center hover:bg-red-600 hover:text-white transition">
                <FaYoutube className="w-4 h-4" aria-label="YouTube" />
              </a>
              <a href="https://google.com" target="_blank" rel="noreferrer" title="Google" aria-label="Google" className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center hover:bg-blue-500 hover:text-white transition">
                <FaGoogle className="w-4 h-4" aria-label="Google" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" title="X" aria-label="X" className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center hover:bg-sky-500 hover:text-white transition">
                <FaXTwitter className="w-4 h-4" aria-label="X" />
              </a>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Copyright */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 text-center text-slate-500 text-[11px]">
        © 2026 Bahir Dar University — Employee Clearance System. All Rights Reserved.
      </div>
    </footer>
  );
}