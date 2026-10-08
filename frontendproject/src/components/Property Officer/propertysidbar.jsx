import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/authContext";
import { PropertyLanguageProvider, usePropertyLanguage } from "./propertyLanguage";
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
  LockKeyhole,
} from "lucide-react";
import UniversitySeal from '../UniversitySeal';

export default function PropertyLayout() {
  return (
    <PropertyLanguageProvider>
      <PropertyLayoutContent />
    </PropertyLanguageProvider>
  );
}

function PropertyLayoutContent() {
  const [clearanceOpen, setClearanceOpen] = useState(true);
  const [assetRecordsOpen, setAssetRecordsOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = usePropertyLanguage();
  const location = useLocation();

  const isClearanceActive = location.pathname.startsWith("/property/clearance-requests");
  const isAssetRecordsActive = location.pathname.startsWith("/property/asset-records");

  useEffect(() => {
    if (!accountMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) setAccountMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setAccountMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  const closeAccountMenu = () => setAccountMenuOpen(false);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-700">
      <aside className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-slate-900 text-slate-300 shadow-xl">
        <div className="flex h-20 items-center border-b border-slate-700 px-6">
          <UniversitySeal />
          <div className="ml-3 min-w-0">
            <h1 className="truncate text-lg font-bold text-white">{t('Employee Clearance', 'የሰራተኞች ክሊራንስ')}</h1>
            <p className="text-xs text-slate-400">{t('Property / Asset Officer', 'የንብረት ኦፊሰር')}</p>
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
            <span>{t('Dashboard', 'ዳሽቦርድ')}</span>
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
            <span>{t('Clearance Requests', 'የክሊራንስ ጥያቄዎች')}</span>
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
            <span>{t('Asset Records', 'የንብረት መዝገቦች')}</span>
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
            <span>{t('Clearance History', 'የክሊራንስ ታሪክ')}</span>
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
            <span>{t('Reports', 'ሪፖርቶች')}</span>
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
            <span>{t('Settings', 'ቅንብሮች')}</span>
          </NavLink>
        </nav>

        <div className="border-t border-slate-700 p-4">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-red-600 hover:text-white"
          >
            <LogOut size={18} />
            <span>{t('Logout', 'ውጣ')}</span>
          </button>
        </div>
      </aside>

      <div className="ml-72 min-h-screen">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-teal-800 bg-teal-700 px-4 text-white shadow-sm sm:px-6">
          <p className="truncate text-sm font-semibold sm:text-base">
            {t('Welcome', 'እንኳን ደህና መጡ')} {user?.name || user?.fullName || t('Property Officer', 'የንብረት ኦፊሰር')}
          </p>
          <div className="flex items-center gap-3 sm:gap-5">
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'am' : 'en')}
              aria-label={t('Switch language to Amharic', 'ቋንቋን ወደ እንግሊዝኛ ቀይር')}
              title={t('Switch between English and Amharic', 'በእንግሊዝኛ እና በአማርኛ መካከል ይቀይሩ')}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-2 text-xs font-semibold transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <Settings size={15} />
              <span>{language === 'en' ? 'EN/አማ' : 'አማ/EN'}</span>
            </button>

            <Link
              to="/property/notifications"
              aria-label={t('Notifications', 'ማሳወቂያዎች')}
              title={t('Notifications', 'ማሳወቂያዎች')}
              className="rounded-full p-2 text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <Bell size={21} />
            </Link>

            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen((isOpen) => !isOpen)}
                aria-label="Open Property Officer account menu"
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen}
                className="flex max-w-[min(21rem,60vw)] items-center gap-2 rounded-xl border-2 border-white/90 px-2 py-1.5 text-left transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                {user?.profileImage ? (
                  <img src={user.profileImage} alt="" className="h-9 w-9 shrink-0 rounded-full bg-white object-cover" />
                ) : (
                  <UniversitySeal className="h-9 w-9 shrink-0 bg-white p-0.5" />
                )}
                <span className="hidden min-w-0 sm:block">
                  <span className="block max-w-44 truncate text-xs font-semibold">{user?.name || user?.fullName || t('Property Officer', 'የንብረት ኦፊሰር')}</span>
                  {user?.email && <span className="block max-w-44 truncate text-[10px] text-white/80">{user.email}</span>}
                </span>
                <ChevronDown size={15} className={`hidden shrink-0 transition-transform sm:block ${accountMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {accountMenuOpen && (
                <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-700 shadow-xl">
                  <div className="px-4 py-4">
                    <p className="truncate text-sm font-semibold text-slate-800">{user?.name || user?.fullName || t('Property Officer', 'የንብረት ኦፊሰር')}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{user?.email || t('Property Officer account', 'የንብረት ኦፊሰር መለያ')}</p>
                    <span className="mt-3 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800">{t('Property / Asset Officer', 'የንብረት ኦፊሰር')}</span>
                  </div>
                  <div className="border-t border-slate-200 py-1.5">
                    <Link role="menuitem" to="/property/dashboard" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                      <LayoutDashboard size={17} className="text-slate-500" /> {t('My Dashboard', 'ዳሽቦርዴ')}
                    </Link>
                    <Link role="menuitem" to="/property/profile" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                      <User size={17} className="text-slate-500" /> {t('View Profile', 'ፕሮፋይል ይመልከቱ')}
                    </Link>
                    <Link role="menuitem" to="/property/profile#security" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                      <LockKeyhole size={17} className="text-slate-500" /> {t('Change Password', 'የይለፍ ቃል ቀይር')}
                    </Link>
                    <Link role="menuitem" to="/property/settings" onClick={closeAccountMenu} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50">
                      <Settings size={17} className="text-slate-500" /> {t('Property / Asset Settings', 'የንብረት ቅንብሮች')}
                    </Link>
                  </div>
                  <div className="border-t border-slate-200 py-1.5">
                    <button role="menuitem" type="button" onClick={() => { closeAccountMenu(); logout(); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50">
                      <LogOut size={17} /> {t('Sign Out', 'ውጣ')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] bg-slate-50 p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}