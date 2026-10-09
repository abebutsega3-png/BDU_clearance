import { useState } from 'react';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { Link } from 'react-router-dom';

const DARK_MODE_KEY = 'transportDashboardSettingsDarkMode';

export default function TransportDashboardSettings() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(DARK_MODE_KEY) === 'true');

  const updateDarkMode = (event) => {
    const enabled = event.target.checked;
    setDarkMode(enabled);
    localStorage.setItem(DARK_MODE_KEY, String(enabled));
  };

  return (
    <main className={`-m-5 min-h-[calc(100vh-5rem)] px-4 py-6 transition-colors sm:px-6 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <section className={`mx-auto w-full max-w-2xl rounded-lg border p-5 shadow-sm sm:p-6 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
        <Link
          to="/transport-office"
          className={`inline-flex items-center gap-2 text-sm font-medium transition ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-indigo-600'}`}
        >
          <ArrowLeft size={16} />Back to Dashboard
        </Link>

        <header className={`mt-5 border-b pb-5 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Dashboard Settings</p>
          <h1 className="mt-1 text-2xl font-bold">Dashboard Settings</h1>
          <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage your dashboard appearance and account settings.
          </p>
        </header>

        <section className={`border-b py-6 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
          <h2 className="text-base font-bold">Appearance</h2>
          <label className={`mt-4 flex cursor-pointer items-center justify-between rounded-lg border px-4 py-4 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
            <span>
              <span className="block text-sm font-semibold">Dark mode</span>
              <span className={`mt-1 block text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Use a darker appearance on this settings page.
              </span>
            </span>
            <input
              type="checkbox"
              checked={darkMode}
              onChange={updateDarkMode}
              aria-label="Enable dark mode on Dashboard Settings"
              className="h-5 w-5 accent-indigo-600"
            />
          </label>
        </section>

        <section className="pt-6">
          <h2 className="text-base font-bold">Account security</h2>
          <Link
            to="/transport-office/change-password"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <KeyRound size={16} />Change Password
          </Link>
        </section>
      </section>
    </main>
  );
}
