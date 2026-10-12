import React, { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronDown, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import RegistrarDashboard from '../components/Registrar Officer/RegistrarDashboard';
import RegistrarRequests from '../components/Registrar Officer/RegistrarRequests';
import RegisterAcademicRecords from '../components/Registrar Officer/RegisterarAcademicRecords';
import RegistrarSidebar from '../components/Registrar Officer/Registrar Sidbar';

const tabRouteMap = {
  dashboard: '/registrar-office',
  clearance: '/registrar-office/clearance-requests',
  academic: '/registrar-office/academic-records',
  verification: '/registrar-office/document-verification',
  settings: '/registrar-office/settings',
  reports: '/registrar-office/reports',
  profile: '/registrar-office/profile',
};

const resolveTabFromPath = (pathname) => {
  const current = pathname || '/registrar-office';
  if (current.includes('/clearance-requests')) return 'clearance';
  if (current.includes('/academic-records')) return 'academic';
  if (current.includes('/document-verification')) return 'verification';
  if (current.includes('/settings')) return 'settings';
  if (current.includes('/reports')) return 'reports';
  if (current.includes('/profile')) return 'profile';
  return 'dashboard';
};

const RegistrarOffice = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeRole = 'Registrar Officer';
  const defaultTab = useMemo(() => resolveTabFromPath(location.pathname), [location.pathname]);
  const [activeTab, setActiveTab] = useState(localStorage.getItem('registrarActiveTab') || defaultTab);

  useEffect(() => {
    const nextTab = resolveTabFromPath(location.pathname);
    setActiveTab(nextTab);
    localStorage.setItem('registrarActiveTab', nextTab);
  }, [location.pathname]);

  const handleTabChange = (nextTab) => {
    const nextRoute = tabRouteMap[nextTab] || tabRouteMap.dashboard;
    setActiveTab(nextTab);
    localStorage.setItem('registrarActiveTab', nextTab);
    navigate(nextRoute, { replace: false });
  };

  const handleLogout = () => {
    localStorage.removeItem('registrarActiveTab');
    console.log('Logged out successfully');
  };

  const renderContent = () => {
    if (children) return children;

    switch (activeTab) {
      case 'dashboard':
        return <RegistrarDashboard />;
      case 'clearance':
        return <RegistrarRequests />;
      case 'academic':
        return <RegisterAcademicRecords />;
      default:
        return (
          <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
            <div>
              <p className="text-lg font-semibold text-slate-700">This Registrar section is not yet implemented.</p>
              <p className="mt-2 text-sm text-slate-500">The active menu item is mapped, but the corresponding content is still under development.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#edf1f5] font-sans text-slate-800">
      <div className="mx-auto max-w-[1400px] px-3 pb-8 pt-4">
        <div className="overflow-hidden rounded-t-2xl bg-[#0a2540] shadow-xl">
          <div className="flex items-center justify-between gap-4 px-5 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f4b942] text-sm font-black text-[#0a1d3a]">BDU</div>
              <div>
                <h2 className="text-3xl font-bold">Bahir Dar University</h2>
                <p className="text-sm text-blue-100">Registrar Officer</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="relative rounded-xl bg-blue-900/40 p-2 text-white hover:bg-blue-900/60">
                <Bell className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold">3</span>
              </button>
              <div className="flex items-center gap-3 rounded-xl bg-blue-900/30 px-3 py-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-white">
                  <User className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{activeRole}</span>
                <ChevronDown className="h-4 w-4 text-blue-100" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-[760px] overflow-hidden rounded-b-2xl border border-slate-200 bg-white shadow-xl">
          <RegistrarSidebar
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            onLogout={handleLogout}
          />

          <main className="flex-1 overflow-y-auto bg-[#edf1f5] p-4 md:p-6">
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
};

export default RegistrarOffice;