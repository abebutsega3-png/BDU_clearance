import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { useAdminLanguage } from './AdminLanguage';

const DARK_MODE_KEY = 'systemAdminDashboardSettingsDarkMode';

export default function SystemAdminDashboardSettings() {
  const { t } = useAdminLanguage();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(DARK_MODE_KEY) === 'true');

  const updateDarkMode = (event) => {
    const enabled = event.target.checked;
    setDarkMode(enabled);
    localStorage.setItem(DARK_MODE_KEY, String(enabled));
  };

  return (
    <main className={`min-h-[calc(100vh-72px)] px-4 py-6 transition-colors sm:px-6 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <section className={`mx-auto w-full max-w-2xl rounded-lg border p-5 shadow-sm sm:p-6 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
        <header className={`border-b pb-4 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">{t('Dashboard Settings')}</p>
          <h1 className="mt-1 text-lg font-bold">{t('Dashboard Settings')}</h1>
          <p className={`mt-1 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('Manage your dashboard appearance and account settings.')}</p>
        </header>

        <section className={`border-b py-4 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
          <h2 className="text-xs font-bold">{t('Appearance')}</h2>
          <label className={`mt-2 flex cursor-pointer items-center justify-between rounded-md border px-3 py-3 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
            <span>
              <span className="block text-xs font-semibold">{t('Dark mode')}</span>
              <span className={`mt-0.5 block text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('Use a darker appearance on this settings page.')}</span>
            </span>
            <input type="checkbox" checked={darkMode} onChange={updateDarkMode} className="h-4 w-4 accent-blue-600" />
          </label>
        </section>

        <section className="pt-4">
          <h2 className="text-xs font-bold">{t('Account security')}</h2>
          <Link to="/admin/change-password" className="mt-2 inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700">
            <KeyRound size={14} /> {t('Change Password')}
          </Link>
        </section>
      </section>
    </main>
  );
}
