import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Bell, Check, ChevronDown, FileText, Globe2, Mail, Monitor, Moon, Palette, RefreshCw, Save, Settings, Sun } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import { useEmployeeLanguage } from './EmployeeLanguage';
import EmployeeNavbar from './employeenavbar';
import EmployeeSidebar from './employeesidbar';

const defaults = {
  emailNotifications: true,
  clearanceUpdates: true,
  requestReturned: true,
  requestResubmitted: true,
  pendingReviewReminder: true,
  theme: 'light',
  language: 'English',
  itemsPerPage: 20,
};

const notificationOptions = [
  ['emailNotifications', 'Email Notifications', 'Receive notifications via email.', Mail],
  ['clearanceUpdates', 'Clearance Updates', 'Get notified about clearance status changes.', FileText],
  ['requestReturned', 'Request Returned', 'Be notified when your request is returned.', RefreshCw],
  ['requestResubmitted', 'Request Resubmitted', 'Get notified when your request is resubmitted.', RefreshCw],
  ['pendingReviewReminder', 'Pending Review Reminder', 'Receive reminders for requests pending your review.', Check],
];

function settingsFromResponse(data) {
  return {
    ...defaults,
    ...data?.notificationPreferences,
    ...data?.displayPreferences,
    itemsPerPage: Number(data?.displayPreferences?.itemsPerPage ?? defaults.itemsPerPage),
  };
}

function toPayload(settings) {
  return {
    notificationPreferences: {
      emailNotifications: settings.emailNotifications,
      clearanceUpdates: settings.clearanceUpdates,
      requestReturned: settings.requestReturned,
      requestResubmitted: settings.requestResubmitted,
      pendingReviewReminder: settings.pendingReviewReminder,
    },
    displayPreferences: {
      theme: settings.theme,
      language: settings.language,
      itemsPerPage: settings.itemsPerPage,
    },
  };
}

export default function EmployeeSettings() {
  const { user } = useAuth();
  const { language, previewLanguage, setLanguage, setTheme, setItemsPerPage, resolvedTheme, t } = useEmployeeLanguage();
  const userId = user?._id || user?.id;
  const [settings, setSettings] = useState(defaults);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const messageTimer = useRef(null);

  useEffect(() => {
    if (!userId) return undefined;

    const controller = new AbortController();
    const loadSettings = async () => {
      try {
        const { data } = await axios.get(`/api/profile/${encodeURIComponent(userId)}/settings`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
          signal: controller.signal,
        });
        if (!data?.success || !data.settings) throw new Error(data?.message || 'Invalid settings response.');
        const loaded = settingsFromResponse(data.settings);
        setSettings(loaded);
        setSettingsLoaded(true);
        previewLanguage(loaded.language);
        setTheme(loaded.theme);
        setItemsPerPage(loaded.itemsPerPage);
        localStorage.setItem('employeeSettings', JSON.stringify(loaded));
      } catch (loadError) {
        if (!controller.signal.aborted) {
          console.error('Unable to load employee settings:', loadError);
          setError(loadError.response?.data?.message || 'Unable to load settings. Please try again.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadSettings();
    return () => controller.abort();
  }, [userId, previewLanguage, setItemsPerPage, setTheme]);

  useEffect(() => () => window.clearTimeout(messageTimer.current), []);

  const update = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setMessage('');
    setError('');
    if (key === 'language') previewLanguage(value);
    if (key === 'theme') setTheme(value);
    if (key === 'itemsPerPage') setItemsPerPage(Number(value));
  };

  const save = async () => {
    if (!userId || !settingsLoaded || loading || saving) return;

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const { data } = await axios.put(
        `/api/profile/${encodeURIComponent(userId)}/settings`,
        toPayload(settings),
        { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } },
      );
      if (!data?.success || !data.settings) throw new Error(data?.message || 'Invalid settings response.');

      const saved = settingsFromResponse(data.settings);
      setSettings(saved);
      setLanguage(saved.language);
      setTheme(saved.theme);
      setItemsPerPage(saved.itemsPerPage);
      localStorage.setItem('employeeSettings', JSON.stringify(saved));
      setMessage(t('Settings saved successfully!'));
      window.clearTimeout(messageTimer.current);
      messageTimer.current = window.setTimeout(() => setMessage(''), 3000);
    } catch (saveError) {
      console.error('Unable to save employee settings:', saveError);
      setError(saveError.response?.data?.message || t('Unable to save settings. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setSettings(defaults);
    previewLanguage(defaults.language);
    setTheme(defaults.theme);
    setItemsPerPage(defaults.itemsPerPage);
    setError('');
    setMessage(t('Settings reset to default. Save your changes to keep them.'));
  };

  const isDark = resolvedTheme === 'dark';
  const selectedLanguage = language === 'am' ? 'Amharic' : 'English';
  const displayedError = error || (!userId ? 'Unable to load settings. Please try again.' : '');
  const isLoading = Boolean(userId) && loading;

  return <div className={`employee-dashboard min-h-screen ${isDark ? 'employee-theme-dark' : 'bg-[#f4f9ff] text-slate-800'}`}>
    <div className="hidden lg:block"><EmployeeSidebar /></div>
    {menuOpen && <><button type="button" aria-label={t('Close menu')} className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" onClick={() => setMenuOpen(false)} /><div className="relative z-50 lg:hidden"><EmployeeSidebar onNavigate={() => setMenuOpen(false)} /></div></>}
    <EmployeeNavbar onMenuClick={() => setMenuOpen(true)} />
    <main className="min-h-screen p-4 sm:p-6 lg:ml-72">
      <div className="mx-auto max-w-5xl">
        <header className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3"><div className="rounded-lg bg-blue-100 p-2 text-blue-700"><Settings size={20} /></div><div><h1 className="text-base font-bold text-slate-900">{t('Settings')}</h1><p className="text-[10px] text-slate-500">{t('Manage your notification preferences and appearance settings.')}</p></div></div>
          {message && <span role="status" className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">{message}</span>}
        </header>
        {displayedError && <p role="alert" className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{t(displayedError)}</p>}
        {isLoading && <p role="status" className="mb-4 text-xs text-slate-500">{t('Loading settings...')}</p>}

        <fieldset disabled={isLoading || !settingsLoaded}>
        <section className="mb-4 overflow-hidden rounded border border-blue-100 bg-white shadow-sm">
          <SectionHeader icon={<Bell size={15} />} title={t('Notification Preferences')} subtitle={t('Choose which notifications you want to receive.')} />
          <div className="grid sm:grid-cols-2 sm:divide-x sm:divide-blue-100">
            {[
              notificationOptions.slice(0, 3),
              notificationOptions.slice(3),
            ].map((column, index) => <div key={index}>
              {column.map(([key, label, description, Icon]) => <Preference
                key={key}
                label={t(label)}
                description={t(description)}
                icon={<Icon size={12} />}
                checked={settings[key]}
                onChange={(value) => update(key, value)}
              />)}
            </div>)}
          </div>
        </section>

        <section className="mb-4 overflow-hidden rounded border border-blue-100 bg-white shadow-sm">
          <SectionHeader icon={<Palette size={15} />} title={t('Appearance')} subtitle={t('Customize the look and feel of the application.')} />
          <div className="grid gap-4 p-3 sm:grid-cols-[1.5fr_1fr]">
            <div>
              <p className="mb-2 flex items-center gap-1 text-[10px] font-semibold"><Sun size={12} /> {t('Theme')}</p>
              <div className="grid grid-cols-3 gap-2">{[['light', Sun, 'Light', 'Bright and clean'], ['dark', Moon, 'Dark', 'Easy on your eyes'], ['system', Monitor, 'System', 'Follow your device']].map(([value, Icon, label, caption]) => <button key={value} type="button" aria-pressed={settings.theme === value} onClick={() => update('theme', value)} className={`flex items-center gap-2 rounded border p-2 text-left ${settings.theme === value ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' : 'border-slate-200 text-slate-500'}`}><Icon size={13} /><span><strong className="block text-[9px]">{t(label)}</strong><small className="block text-[8px]">{t(caption)}</small></span></button>)}</div>
            </div>
            <Select label={t('Language')} icon={<Globe2 size={12} />} value={settings.language || selectedLanguage} options={['English', 'Amharic']} onChange={(value) => update('language', value)} t={t} />
          </div>
        </section>

        <section className="mb-4 overflow-hidden rounded border border-blue-100 bg-white shadow-sm">
          <SectionHeader icon={<Monitor size={15} />} title={t('Display Preferences')} subtitle={t('Adjust how information is displayed in the system.')} />
          <div className="p-3"><Select label={t('Items per Page')} icon={<FileText size={12} />} value={String(settings.itemsPerPage)} options={['10', '20', '50', '100']} onChange={(value) => update('itemsPerPage', Number(value))} t={t} /></div>
        </section>
        </fieldset>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={reset} disabled={isLoading || !settingsLoaded || saving} className="flex items-center gap-1 rounded border border-blue-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-blue-600 disabled:opacity-50"><RefreshCw size={11} /> {t('Reset to Default')}</button>
          <button type="button" onClick={save} disabled={isLoading || !settingsLoaded || saving} className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Save size={11} /> {saving ? t('Saving...') : t('Save Changes')}</button>
        </div>
      </div>
    </main>
  </div>;
}

function SectionHeader({ icon, title, subtitle }) {
  return <div className="flex items-center gap-2 border-b border-blue-100 bg-[#f8fbff] px-3 py-2"><div className="rounded-full bg-blue-100 p-1.5 text-blue-700">{icon}</div><div><h2 className="text-[10px] font-bold text-slate-800">{title}</h2><p className="text-[8px] text-slate-400">{subtitle}</p></div></div>;
}

function Preference({ label, description, icon, checked, onChange }) {
  return <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0"><div className="flex items-center gap-2"><span className="rounded-full bg-blue-100 p-1.5 text-blue-600">{icon}</span><span><strong className="block text-[9px] text-slate-700">{label}</strong><small className="block text-[8px] text-slate-400">{description}</small></span></div><button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-4 w-8 shrink-0 rounded-full ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}><span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} /></button></div>;
}

function Select({ label, icon, value, options, onChange, t }) {
  return <label className="block text-[10px] font-semibold text-slate-700"><span className="mb-2 flex items-center gap-1">{icon}{label}</span><span className="relative block"><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full appearance-none rounded border border-slate-200 bg-white px-2 py-2 text-[10px] font-normal text-slate-600 outline-none focus:border-blue-400">{options.map((option) => <option key={option} value={option}>{['English', 'Amharic'].includes(option) ? t(option) : option}</option>)}</select><ChevronDown size={12} className="pointer-events-none absolute right-2 top-2 text-slate-400" /></span></label>;
}
