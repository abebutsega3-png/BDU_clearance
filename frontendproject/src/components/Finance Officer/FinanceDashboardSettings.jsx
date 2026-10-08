import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound } from 'lucide-react';

const DARK_MODE_KEY = 'financeDashboardSettingsDarkMode';

export default function FinanceDashboardSettings() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(DARK_MODE_KEY) === 'true');

  const updateDarkMode = (event) => {
    const enabled = event.target.checked;
    setDarkMode(enabled);
    localStorage.setItem(DARK_MODE_KEY, String(enabled));
  };

  return (
    <main className={`min-h-[calc(100vh-5rem)] px-4 py-6 transition-colors sm:px-6 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <section className={`mx-auto w-full max-w-2xl rounded-lg border p-5 shadow-sm sm:p-6 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
        <Link
          to="/finance-office"
          className={`mb-3 inline-flex items-center gap-1.5 text-[10px] font-medium transition ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-indigo-600'}`}
        >
          <ArrowLeft size={12} /> Back to Dashboard
        </Link>

        <header className={`border-b pb-4 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">Dashboard Settings</p>
          <h1 className="mt-1 text-lg font-bold">Dashboard Settings</h1>
          <p className={`mt-1 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage your dashboard appearance and account settings.
          </p>
        </header>

        <section className={`border-b py-4 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
          <h2 className="text-xs font-bold">Appearance</h2>
          <label className={`mt-2 flex cursor-pointer items-center justify-between rounded-md border px-3 py-3 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
            <span>
              <span className="block text-xs font-semibold">Dark mode</span>
              <span className={`mt-0.5 block text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Use a darker appearance on this settings page.
              </span>
            </span>
            <input
              type="checkbox"
              checked={darkMode}
              onChange={updateDarkMode}
              className="h-4 w-4 accent-indigo-600"
              aria-label="Enable dark mode"
            />
          </label>
        </section>

        <section className="pt-4">
          <h2 className="text-xs font-bold">Account security</h2>
          <Link
            to="/finance-office/profile?action=change-password"
            className="mt-2 inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
          >
            <KeyRound size={14} /> Change Password
          </Link>
        </section>
      </section>
    </main>
  );
}
