import React, { useState } from 'react';
import { Bell, Check, ChevronDown, FileText, Globe2, Mail, Monitor, Moon, Palette, RefreshCw, Save, Settings, Sun } from 'lucide-react';
import EmployeeNavbar from './employeenavbar';
import EmployeeSidebar from './employeesidbar';

const defaults = {
  email: true,
  updates: true,
  returned: true,
  resubmitted: true,
  reminder: true,
  theme: 'light',
  language: 'English',
  itemsPerPage: '20',
};

export default function EmployeeSettings() {
  const [settings, setSettings] = useState(() => ({ ...defaults, ...readSettings() }));
  const [message, setMessage] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const update = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  const save = () => { localStorage.setItem('employeeSettings', JSON.stringify(settings)); setMessage('Settings saved successfully.'); };
  const reset = () => { setSettings(defaults); localStorage.removeItem('employeeSettings'); setMessage('Settings reset to default.'); };

  return <div className="min-h-screen bg-[#f4f9ff] text-slate-800">
    <div className="hidden lg:block"><EmployeeSidebar /></div>
    {menuOpen && <><button type="button" aria-label="Close menu" className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" onClick={() => setMenuOpen(false)} /><div className="relative z-50 lg:hidden"><EmployeeSidebar onNavigate={() => setMenuOpen(false)} /></div></>}
    <EmployeeNavbar onMenuClick={() => setMenuOpen(true)} />
    <main className="min-h-screen p-4 sm:p-6 lg:ml-72">
    <div className="mx-auto max-w-5xl">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3"><div className="rounded-lg bg-blue-100 p-2 text-blue-700"><Settings size={20} /></div><div><h1 className="text-base font-bold text-slate-900">Settings</h1><p className="text-[10px] text-slate-500">Manage your notification preferences and appearance settings.</p></div></div>
        {message && <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">{message}</span>}
      </header>

      <section className="mb-4 overflow-hidden rounded border border-blue-100 bg-white shadow-sm"><SectionHeader icon={<Bell size={15} />} title="Notification Preferences" subtitle="Choose what notifications you want to receive and how you want to be notified." /><div className="grid sm:grid-cols-2 sm:divide-x sm:divide-blue-100"><div><Preference label="Email Notifications" description="Receive notifications via email." icon={<Mail size={12} />} checked={settings.email} onChange={(value) => update('email', value)} /><Preference label="Clearance Updates" description="Get notified about clearance status changes." icon={<FileText size={12} />} checked={settings.updates} onChange={(value) => update('updates', value)} /><Preference label="Request Returned" description="Be notified when your request is returned." icon={<RefreshCw size={12} />} checked={settings.returned} onChange={(value) => update('returned', value)} /></div><div><Preference label="Request Resubmitted" description="Get notified when your request is resubmitted." icon={<RefreshCw size={12} />} checked={settings.resubmitted} onChange={(value) => update('resubmitted', value)} /><Preference label="Pending Review Reminder" description="Receive reminders for requests pending your review." icon={<Check size={12} />} checked={settings.reminder} onChange={(value) => update('reminder', value)} /></div></div></section>

      <section className="mb-4 overflow-hidden rounded border border-blue-100 bg-white shadow-sm"><SectionHeader icon={<Palette size={15} />} title="Appearance" subtitle="Customize the look and feel of the application." /><div className="grid gap-4 p-3 sm:grid-cols-[1.5fr_1fr]"><div><p className="mb-2 flex items-center gap-1 text-[10px] font-semibold"><Sun size={12} /> Theme</p><div className="grid grid-cols-3 gap-2">{[['light', Sun, 'Light', 'Bright and clean'], ['dark', Moon, 'Dark', 'Easy on your eyes'], ['system', Monitor, 'System', 'Follow your device']].map(([value, Icon, label, caption]) => <button key={value} type="button" onClick={() => update('theme', value)} className={`flex items-center gap-2 rounded border p-2 text-left ${settings.theme === value ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}><Icon size={13} /><span><strong className="block text-[9px]">{label}</strong><small className="block text-[8px]">{caption}</small></span></button>)}</div></div><Select label="Language" icon={<Globe2 size={12} />} value={settings.language} options={['English', 'Amharic']} onChange={(value) => update('language', value)} /></div></section>

      <section className="mb-4 overflow-hidden rounded border border-blue-100 bg-white shadow-sm"><SectionHeader icon={<Monitor size={15} />} title="Display Preferences" subtitle="Adjust how information is displayed in the system." /><div className="p-3"><Select label="Items per Page" icon={<FileText size={12} />} value={settings.itemsPerPage} options={['10', '20', '50', '100']} onChange={(value) => update('itemsPerPage', value)} /></div></section>
      <div className="flex justify-end gap-2"><button type="button" onClick={reset} className="flex items-center gap-1 rounded border border-blue-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-blue-600"><RefreshCw size={11} /> Reset to Default</button><button type="button" onClick={save} className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white"><Save size={11} /> Save Changes</button></div>
    </div>
    </main>
  </div>;
}

function readSettings() { try { return JSON.parse(localStorage.getItem('employeeSettings') || '{}'); } catch { return {}; } }
function SectionHeader({ icon, title, subtitle }) { return <div className="flex items-center gap-2 border-b border-blue-100 bg-[#f8fbff] px-3 py-2"><div className="rounded-full bg-blue-100 p-1.5 text-blue-700">{icon}</div><div><h2 className="text-[10px] font-bold text-slate-800">{title}</h2><p className="text-[8px] text-slate-400">{subtitle}</p></div></div>; }
function Preference({ label, description, icon, checked, onChange }) { return <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0"><div className="flex items-center gap-2"><span className="rounded-full bg-blue-100 p-1.5 text-blue-600">{icon}</span><span><strong className="block text-[9px] text-slate-700">{label}</strong><small className="block text-[8px] text-slate-400">{description}</small></span></div><button type="button" aria-label={`Toggle ${label}`} onClick={() => onChange(!checked)} className={`relative h-4 w-8 shrink-0 rounded-full ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}><span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} /></button></div>; }
function Select({ label, icon, value, options, onChange }) { return <label className="block text-[10px] font-semibold text-slate-700"><span className="mb-2 flex items-center gap-1">{icon}{label}</span><span className="relative block"><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full appearance-none rounded border border-slate-200 bg-white px-2 py-2 text-[10px] font-normal text-slate-600 outline-none focus:border-blue-400">{options.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={12} className="pointer-events-none absolute right-2 top-2 text-slate-400" /></span></label>; }
