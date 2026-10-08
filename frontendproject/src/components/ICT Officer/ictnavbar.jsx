import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, Settings } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import { useICTLanguage } from './ICTLanguageContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useICTLanguage();
  const firstName = (user?.name || 'ICT Officer').trim().split(/\s+/)[0];
  const initials = (user?.name || 'ICT')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <header className="flex h-16 items-center justify-between gap-3 bg-gradient-to-r from-emerald-800 to-green-700 px-4 text-white shadow sm:px-6">
      <div className="text-base font-medium sm:text-lg">
        {t(`Welcome ${firstName}`, `እንኳን ደህና መጡ ${firstName}`)}
      </div>

      <div className="ml-auto flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setLanguage(language === 'en' ? 'am' : 'en')}
          aria-label={language === 'en' ? 'Switch to Amharic' : 'Switch to English'}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          <Settings size={18} aria-hidden="true" />
          <span>{language === 'en' ? 'EN/አማ' : 'አማ/EN'}</span>
        </button>
        <Link
          to="/ict-office/notifications"
          aria-label="ICT notifications"
          className="relative rounded-lg p-2 text-cyan-50 transition hover:bg-white/10"
        >
          <Bell size={19} />
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-white/10"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-[#06485d]">{initials}</span>
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-40 truncate text-xs font-semibold text-white">{user?.name || 'ICT Officer'}</span>
              <span className="block text-[10px] text-cyan-100">{t('ICT Officer', 'የአይሲቲ ኦፊሰር')}</span>
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 z-50 mt-2 w-60 rounded-lg border border-slate-200 bg-white text-slate-800 shadow-lg" role="menu">
              <div className="px-4 py-3">
                <div className="font-medium text-slate-900">{user?.name || 'ICT Officer'}</div>
                <div className="mt-1 text-xs text-slate-500 truncate">{user?.email || ''}</div>
                <div className="mt-2 inline-block rounded-full bg-sky-100 px-2 py-1 text-[11px] text-sky-700">{t('ICT Officer', 'የአይሲቲ ኦፊሰር')}</div>
              </div>

              <div className="border-t border-slate-100" />

              <nav className="px-2 py-2">
                <Link to="/ict-office" className="block rounded px-3 py-2 text-sm hover:bg-slate-50">{t('My Dashboard', 'ዳሽቦርዴ')}</Link>
                <Link to="/ict-office/profile" className="block rounded px-3 py-2 text-sm hover:bg-slate-50">{t('View Profile', 'መገለጫን ይመልከቱ')}</Link>
                <Link to="/ict-office/change-password" onClick={() => setMenuOpen(false)} className="block rounded px-3 py-2 text-sm hover:bg-slate-50">{t('Change Password', 'የይለፍ ቃል ይቀይሩ')}</Link>
                <Link to="/ict-office/dashboard-settings" className="block rounded px-3 py-2 text-sm hover:bg-slate-50">{t('Dashboard Settings', 'የዳሽቦርድ ቅንብሮች')}</Link>
              </nav>

              <div className="border-t border-slate-100" />

              <div className="px-3 py-2">
                <button type="button" onClick={() => { setMenuOpen(false); logout(); }} className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-rose-600 hover:bg-slate-50">{t('Sign Out', 'ውጣ')}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
