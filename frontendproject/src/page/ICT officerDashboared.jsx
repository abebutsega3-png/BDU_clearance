import React, { useEffect } from 'react';
import ICTSummaryDashboard from '../components/ICT Officer/ICTSummaryDashboard';
import ICTSidebar from '../components/ICT Officer/ict sidbare';
import ICTNavbar from '../components/ICT Officer/ictnavbar';
import { getICTOfficerSettings, applyICTOfficerTheme } from '../components/ICT Officer/ICTSettings';

const ICTOfficerDashboard = ({ children }) => {
  useEffect(() => {
    const settings = getICTOfficerSettings();
    applyICTOfficerTheme(settings.appearance.theme);
  }, []);

  const settings = getICTOfficerSettings();
  const isDark = settings.appearance.theme === 'Dark';

  return (
    <div className={`min-h-screen ${isDark ? 'ict-dark-theme bg-slate-900' : 'bg-slate-100'}`}>
      <style>{`
        .ict-dark-theme {
          background: #0f172a;
          color: #e2e8f0;
        }
        .ict-dark-theme .bg-white,
        .ict-dark-theme .bg-slate-50,
        .ict-dark-theme .bg-slate-100,
        .ict-dark-theme .bg-gray-50,
        .ict-dark-theme .bg-gray-100,
        .ict-dark-theme .bg-[#edf3f4] {
          background-color: #111827 !important;
        }
        .ict-dark-theme .text-slate-800,
        .ict-dark-theme .text-slate-900,
        .ict-dark-theme .text-gray-900,
        .ict-dark-theme .text-slate-700,
        .ict-dark-theme .text-gray-700,
        .ict-dark-theme .text-slate-600,
        .ict-dark-theme .text-slate-500,
        .ict-dark-theme .text-gray-500,
        .ict-dark-theme .text-slate-400,
        .ict-dark-theme .text-gray-600 {
          color: #e2e8f0 !important;
        }
        .ict-dark-theme .border-slate-200,
        .ict-dark-theme .border-slate-300,
        .ict-dark-theme .border-gray-200,
        .ict-dark-theme .border-gray-300,
        .ict-dark-theme .border-slate-100 {
          border-color: #334155 !important;
        }
        .ict-dark-theme .text-slate-500,
        .ict-dark-theme .text-slate-400,
        .ict-dark-theme .text-gray-500 {
          color: #94a3b8 !important;
        }
        .ict-dark-theme input,
        .ict-dark-theme select,
        .ict-dark-theme textarea {
          background-color: #0f172a !important;
          color: #e2e8f0 !important;
          border-color: #475569 !important;
        }
      `}</style>
      <ICTSidebar />
      <div className="ml-72 min-h-screen">
        <ICTNavbar />
        <main className="p-4 sm:p-5 lg:p-6">{children || <ICTSummaryDashboard />}</main>
      </div>
    </div>
  );
};

export default ICTOfficerDashboard;