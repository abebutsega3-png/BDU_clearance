import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bell, CheckCircle2, Eye, LockKeyhole, Monitor, Save, Settings, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../../context/authContext';

const API_URL = 'http://localhost:3000/api/ict/settings';

export const DEFAULT_ICT_SETTINGS = {
  notifications: { newClearanceRequest: true, requestResubmitted: true, pendingReminder: true, clearanceApproved: true, clearanceReturned: true, emailNotifications: true },
  appearance: { language: 'English', rowsPerPage: 10, dateFormat: 'DD/MM/YYYY', theme: 'System' },
  clearancePreferences: { defaultView: 'Pending Requests', defaultSort: 'Newest First', showReturnedRequests: true, showCompletedRequests: true },
  security: { twoFactorAuth: false },
};

const mergeSettings = (incoming = {}) => ({
  ...DEFAULT_ICT_SETTINGS,
  ...incoming,
  notifications: { ...DEFAULT_ICT_SETTINGS.notifications, ...(incoming.notifications || {}) },
  appearance: { ...DEFAULT_ICT_SETTINGS.appearance, ...(incoming.appearance || {}) },
  clearancePreferences: { ...DEFAULT_ICT_SETTINGS.clearancePreferences, ...(incoming.clearancePreferences || {}) },
  security: { ...DEFAULT_ICT_SETTINGS.security, ...(incoming.security || {}) },
});

export const getICTOfficerSettings = () => {
  try {
    const raw = localStorage.getItem('ictOfficerSettings');
    return mergeSettings(raw ? JSON.parse(raw) : {});
  } catch { return DEFAULT_ICT_SETTINGS; }
};

export const saveICTOfficerSettings = (nextSettings) => {
  const safeSettings = mergeSettings(nextSettings);
  localStorage.setItem('ictOfficerSettings', JSON.stringify(safeSettings));
  return safeSettings;
};

export const applyICTOfficerTheme = (theme = 'System') => {
  const isDark = theme === 'Dark' || (theme === 'System' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.body.classList.toggle('ict-dark-theme', isDark);
};

const authConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const Toggle = ({ checked, onChange, disabled = false }) => <label className={`relative inline-flex items-center ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}><input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="peer sr-only" /><span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-blue-600" /><span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" /></label>;
const Section = ({ title, description, icon: Icon, children }) => <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-3 border-b border-slate-200 pb-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600"><Icon size={20} /></span><div><h2 className="text-lg font-bold text-slate-800">{title}</h2><p className="text-xs text-slate-500">{description}</p></div></div>{children}</section>;

const ICTSettings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('notifications');
  const [settings, setSettings] = useState(getICTOfficerSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    const loadSettings = async () => {
      try { const response = await axios.get(API_URL, authConfig()); setSettings(mergeSettings(response.data?.settings)); }
      catch { setSettings(getICTOfficerSettings()); }
      finally { setLoading(false); }
    };
    loadSettings();
  }, []);
  useEffect(() => { applyICTOfficerTheme(settings.appearance.theme); }, [settings.appearance.theme]);

  const updateGroup = (group, name, value) => setSettings((current) => ({ ...current, [group]: { ...current[group], [name]: value } }));
  const toggle = (group, name) => updateGroup(group, name, !settings[group][name]);
  const handleSave = async (event) => {
    event.preventDefault(); setSaving(true); setMessage({ type: '', text: '' });
    const saved = saveICTOfficerSettings(settings);
    try { const response = await axios.put(API_URL, saved, authConfig()); setSettings(mergeSettings(response.data?.settings || saved)); setMessage({ type: 'success', text: 'Settings saved successfully.' }); }
    catch (error) { setMessage({ type: 'error', text: error.response?.data?.message || 'Settings saved locally. Server is unavailable.' }); }
    finally { setSaving(false); }
  };
  const changePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) { setMessage({ type: 'error', text: 'New passwords do not match.' }); return; }
    try { await axios.put('http://localhost:3000/api/ict/profile/change-password', passwords, authConfig()); setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' }); setMessage({ type: 'success', text: 'Password changed successfully.' }); }
    catch (error) { setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to change password.' }); }
  };

  const tabs = [['security', 'Security', LockKeyhole], ['notifications', 'Notifications', Bell], ['display', 'Display Preferences', Monitor], ['clearance', 'Clearance Preferences', Eye], ['account', 'Account Information', UserRound]];
  const row = (label, key, group = 'notifications', disabled = false) => <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5" key={key}><div><span className="text-sm font-semibold text-slate-700">{label}</span>{disabled && <p className="text-xs text-slate-500">System workflow notification</p>}</div><Toggle checked={Boolean(settings[group][key])} disabled={disabled} onChange={() => toggle(group, key)} /></div>;
  const field = (label, name, group, options) => <label className="block rounded-xl border border-slate-200 bg-slate-50 p-3.5" key={name}><span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span><select value={settings[group][name]} onChange={(e) => updateGroup(group, name, e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-800">{options.map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></label>;

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading settings...</div>;
  return <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-cyan-50 p-5 md:p-7"><div className="mx-auto max-w-7xl"><header className="mb-6 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm"><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Settings size={22} /></span><div><h1 className="text-2xl font-bold text-slate-800">ICT Officer Settings</h1><p className="text-sm text-slate-500">Personal preferences for the employee clearance workflow.</p></div></div></header>
    {message.text && <div className={`mb-5 rounded-xl border p-3 text-sm font-semibold ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{message.type !== 'error' && <CheckCircle2 className="mr-2 inline" size={18} />}{message.text}</div>}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]"><aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><p className="mb-3 px-2 pt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Settings</p><div className="space-y-2">{tabs.map(([id, label, Icon]) => <button type="button" key={id} onClick={() => setActiveTab(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${activeTab === id ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}><Icon size={17} />{label}</button>)}</div></aside>
      <form className="space-y-6" onSubmit={handleSave}>
        {activeTab === 'security' && <Section title="Security" description="Protect your ICT Officer account." icon={ShieldCheck}><div className="space-y-3"><h3 className="font-semibold text-slate-700">Change Password</h3>{[['currentPassword', 'Current Password'], ['newPassword', 'New Password'], ['confirmPassword', 'Confirm New Password']].map(([name, label]) => <input key={name} type="password" required minLength={name !== 'currentPassword' ? 6 : undefined} placeholder={label} value={passwords[name]} onChange={(e) => setPasswords({ ...passwords, [name]: e.target.value })} className="block w-full rounded-lg border border-slate-300 p-2.5 text-sm" />)}<button type="button" onClick={changePassword} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Change Password</button></div><div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4"><span className="text-sm font-semibold text-slate-700">Two-Factor Authentication</span><Toggle checked={settings.security.twoFactorAuth} onChange={() => toggle('security', 'twoFactorAuth')} /></div><div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5"><span className="text-sm font-semibold text-slate-700">Active Sessions</span><button type="button" className="text-sm font-semibold text-blue-600">View sessions</button></div></Section>}
        {activeTab === 'notifications' && <Section title="Notification Preferences" description="Choose the alerts you receive from the clearance system." icon={Bell}><div className="space-y-3">{row('New ICT Clearance Request', 'newClearanceRequest')}{row('Clearance Resubmitted', 'requestResubmitted')}{row('Pending Review Reminder', 'pendingReminder')}{row('ICT Clearance Approved', 'clearanceApproved', 'notifications', true)}{row('ICT Clearance Returned', 'clearanceReturned', 'notifications', true)}{row('Email Notifications', 'emailNotifications')}</div></Section>}
        {activeTab === 'display' && <Section title="Display Preferences" description="Choose how information is displayed." icon={Monitor}><div className="grid gap-4 md:grid-cols-2">{field('Language', 'language', 'appearance', [['English', 'English'], ['Amharic', 'Amharic']])}{field('Items Per Page', 'rowsPerPage', 'appearance', [[10, '10'], [25, '25'], [50, '50']])}{field('Date Format', 'dateFormat', 'appearance', [['DD/MM/YYYY', 'DD/MM/YYYY'], ['MM/DD/YYYY', 'MM/DD/YYYY'], ['YYYY-MM-DD', 'YYYY-MM-DD']])}{field('Theme', 'theme', 'appearance', [['Light', 'Light'], ['Dark', 'Dark'], ['System', 'System']])}</div></Section>}
        {activeTab === 'clearance' && <Section title="Clearance Preferences" description="Set your default request list and display filters." icon={Eye}><div className="grid gap-4 md:grid-cols-2">{field('Default Request List', 'defaultView', 'clearancePreferences', [['Pending Requests', 'Pending Requests'], ['All Requests', 'All Requests']])}{field('Default Sort', 'defaultSort', 'clearancePreferences', [['Newest First', 'Newest First'], ['Oldest First', 'Oldest First']])}{row('Show Returned Requests', 'showReturnedRequests', 'clearancePreferences')}{row('Show Completed Requests', 'showCompletedRequests', 'clearancePreferences')}</div><p className="mt-4 text-xs text-slate-500">Workflow rules are managed by the System Admin.</p></Section>}
        {activeTab === 'account' && <Section title="Account Information" description="Your account details are managed by the administrator." icon={UserRound}><div className="grid gap-4 sm:grid-cols-2">{[['Name', user?.fullName || user?.name], ['Employee ID', user?.employeeId], ['Role', user?.role || 'ICT Officer'], ['Department', user?.department || 'ICT'], ['Campus', user?.campus || 'Main Campus'], ['Account Status', user?.status || 'Active']].map(([label, value]) => <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5" key={label}><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-800">{value || 'Not provided'}</p></div>)}</div></Section>}
        {activeTab !== 'security' && activeTab !== 'account' && <div className="flex justify-end"><button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"><Save size={18} />{saving ? 'Saving...' : 'Save Preferences'}</button></div>}
      </form></div></div></div>;
};

export default ICTSettings;