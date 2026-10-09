import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import { useLibraryLanguage } from './LibraryLanguage';
import {
  AlertCircle,
  Bell,
  BookOpenCheck,
  Building2,
  CheckCircle,
  ClipboardCheck,
  Compass,
  Loader2,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
} from 'lucide-react';

const SETTINGS_URL = '/api/library-settings';
const DEFAULT_GENERAL = {
  libraryName: 'Bahir Dar University Library',
  officeName: 'Library Office',
  contactEmail: '',
  phoneNumber: '',
  location: '',
};
const DEFAULT_RULES = {
  checkUnreturnedBooks: true,
  checkOverdueBooks: true,
  checkOutstandingFines: true,
  checkLostDamagedBooks: true,
  requireChecklistCompletion: true,
};
const DEFAULT_NOTIFICATIONS = {
  newClearanceRequest: true,
  resubmittedClearance: true,
  clearanceStatusUpdated: true,
};
const DEFAULT_CHECKLIST = {
  borrowedBooksChecked: true,
  unreturnedBooksChecked: true,
  outstandingMaterialsChecked: true,
  lostDamagedMaterialsChecked: true,
  libraryAccountChecked: true,
};
const DEFAULT_DELIVERY = { inSystemNotifications: true, emailNotifications: true };
const notifySettingsUpdated = () => window.dispatchEvent(new Event('library-officer-settings-updated'));
const authConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
});

export default function LibrarySettings() {
  const { user } = useAuth();
  const { t } = useLibraryLanguage();
  const userId = user?._id || user?.id || localStorage.getItem('userId') || '';
  const [generalSettings, setGeneralSettings] = useState(DEFAULT_GENERAL);
  const [clearanceRules, setClearanceRules] = useState(DEFAULT_RULES);
  const [notificationPreferences, setNotificationPreferences] = useState(DEFAULT_NOTIFICATIONS);
  const [clearanceChecklist, setClearanceChecklist] = useState(DEFAULT_CHECKLIST);
  const [deliveryPreferences, setDeliveryPreferences] = useState(DEFAULT_DELIVERY);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSection, setActiveSection] = useState('general');

  useEffect(() => {
    let active = true;
    const fetchSettings = async () => {
      if (!userId) {
        setError(t('Unable to identify the signed-in Library Officer.'));
        setLoading(false);
        return;
      }
      try {
        const response = await axios.get(`${SETTINGS_URL}/${encodeURIComponent(userId)}`, authConfig());
        if (!active) return;
        const settings = response.data || {};
        setGeneralSettings({ ...DEFAULT_GENERAL, ...(settings.generalSettings || {}) });
        setClearanceRules({ ...DEFAULT_RULES, ...(settings.clearanceRules || {}) });
        setNotificationPreferences({ ...DEFAULT_NOTIFICATIONS, ...(settings.notificationPreferences || {}) });
        setClearanceChecklist({ ...DEFAULT_CHECKLIST, ...(settings.clearanceChecklist || {}) });
        setDeliveryPreferences({ ...DEFAULT_DELIVERY, ...(settings.deliveryPreferences || {}) });
      } catch (loadError) {
        if (active) setError(loadError.response?.data?.message || t('Unable to load Library Officer settings.'));
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchSettings();
    return () => { active = false; };
  }, [userId, t]);

  const saveSettings = async (section, value) => {
    setSavingSection(section);
    setError('');
    setSuccess('');
    try {
      const response = await axios.put(`${SETTINGS_URL}/${encodeURIComponent(userId)}`, { [section]: value }, authConfig());
      if (!response.data?.settings?.[section]) throw new Error(t('The saved settings were not returned by the server.'));
      if (section === 'generalSettings') setGeneralSettings({ ...DEFAULT_GENERAL, ...response.data.settings.generalSettings });
      notifySettingsUpdated();
      setSuccess(t('Settings saved successfully.'));
    } catch (saveError) {
      setError(saveError.response?.data?.message || saveError.message || t('Unable to save settings.'));
    } finally {
      setSavingSection('');
    }
  };

  if (loading) {
    return <div className="flex min-h-64 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 animate-spin" size={18} />{t('Loading Settings...')}</div>;
  }

  const settingsSections = [
    { id: 'general', title: 'General Settings', description: 'Library and office contact information.', icon: Building2, number: '01' },
    { id: 'rules', title: 'Clearance Rules', description: 'Required checks before approving library clearance.', icon: BookOpenCheck, number: '02' },
    { id: 'checklist', title: 'Clearance Verification Checklist', description: 'Review items for processing employee clearance.', icon: ClipboardCheck, number: '03' },
    { id: 'notifications', title: 'Notification Settings', description: 'Choose which updates and delivery channels to use.', icon: Bell, number: '04' },
    { id: 'account', title: 'Account & Security', description: 'Officer account details and password settings.', icon: ShieldCheck, number: '05' },
  ];

  return (
    <main className="min-h-[calc(100vh-56px)] bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-teal-800 via-teal-700 to-cyan-700 px-5 py-6 text-white shadow-lg shadow-teal-900/10 sm:px-8 sm:py-8">
          <div aria-hidden="true" className="absolute -right-12 -top-24 -z-10 h-64 w-64 rounded-full border-[32px] border-white/10" />
          <div aria-hidden="true" className="absolute bottom-[-5rem] right-36 -z-10 h-40 w-40 rounded-full bg-cyan-300/10 blur-2xl" />
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3 shadow-inner backdrop-blur-sm">
                <SlidersHorizontal size={24} />
              </div>
              <div>
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-teal-50">
                  <Sparkles size={12} />{t('Library Officer')}
                </div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('Settings')}</h1>
                <p className="mt-2 max-w-xl text-xs leading-5 text-teal-50/90 sm:text-sm">
                  {t('Manage library information, clearance verification rules, notifications, and account security.')}
                </p>
              </div>
            </div>
            <div className="hidden rounded-2xl border border-white/15 bg-white/10 p-4 sm:block">
              <BookOpenCheck size={34} strokeWidth={1.5} className="text-teal-50" />
            </div>
          </div>
        </header>

        {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-700"><span className="mt-0.5"><AlertCircle size={15} /></span>{error}</p>}
        {success && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700"><CheckCircle size={15} />{success}</p>}

        <div className="grid items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-5">
            <div className="px-3 pb-3 pt-2">
              <p className="text-xs font-bold text-slate-900">{t('Settings menu')}</p>
              <p className="mt-1 text-[10px] leading-4 text-slate-500">{t('Choose a section to manage your Library settings.')}</p>
            </div>
            <nav aria-label={t('Settings sections')} className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-1">
              {settingsSections.map(({ id, title, description, icon, number }) => (
                <SettingsNavItem
                  key={id}
                  icon={icon}
                  label={t(title)}
                  description={t(description)}
                  number={number}
                  active={activeSection === id}
                  onClick={() => setActiveSection(id)}
                />
              ))}
            </nav>
            <div className="mt-3 hidden rounded-xl bg-teal-50 p-3 lg:block">
              <div className="flex items-center gap-2 text-teal-800">
                <ShieldCheck size={15} />
                <span className="text-[10px] font-bold">{t('Secure preferences')}</span>
              </div>
              <p className="mt-1 text-[10px] leading-4 text-teal-700/80">{t('Your changes are saved to your signed-in officer account.')}</p>
            </div>
          </aside>

          <div className="min-w-0 space-y-4">
        {activeSection === 'general' && <SettingsSection id="general-settings" icon={Building2} title="General Settings" description="Library and office contact information." number="01">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['libraryName', 'Library Name', true],
              ['officeName', 'Office Name', true],
              ['contactEmail', 'Office Contact Email', false],
              ['phoneNumber', 'Phone Number', false],
              ['location', 'Office Location', false],
            ].map(([key, label, required]) => (
              <label key={key} className="block text-xs font-semibold text-slate-600">
                {t(label, label)}
                <input
                  required={required}
                  type={key === 'contactEmail' ? 'email' : 'text'}
                  maxLength={key === 'contactEmail' ? 254 : 160}
                  value={generalSettings[key]}
                  onChange={(event) => setGeneralSettings((current) => ({ ...current, [key]: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                />
              </label>
            ))}
          </div>
          <SaveButton t={t} saving={savingSection === 'generalSettings'} onClick={() => saveSettings('generalSettings', generalSettings)} />
        </SettingsSection>}

        {activeSection === 'rules' && <SettingsSection id="clearance-rules" icon={BookOpenCheck} title="Clearance Rules" description="Define the checks required before an employee can receive Library clearance." number="02">
          <div className="space-y-1">
            {[
              ['checkUnreturnedBooks', 'Check for unreturned books'],
              ['checkOverdueBooks', 'Check for overdue books'],
              ['checkOutstandingFines', 'Check for outstanding fines'],
              ['checkLostDamagedBooks', 'Check for lost or damaged books'],
              ['requireChecklistCompletion', 'Require all enabled verification checks before clearance'],
            ].map(([key, label]) => (
              <ToggleRow key={key} label={t(label, label)} checked={clearanceRules[key]} onChange={() => setClearanceRules((current) => ({ ...current, [key]: !current[key] }))} />
            ))}
          </div>
          <SaveButton t={t} saving={savingSection === 'clearanceRules'} onClick={() => saveSettings('clearanceRules', clearanceRules)} />
        </SettingsSection>}

        {activeSection === 'checklist' && <SettingsSection icon={ClipboardCheck} title="Clearance Verification Checklist" description="Library Officer review items recorded while processing employee clearance." number="03">
          <div className="space-y-1">
            {[
              ['borrowedBooksChecked', 'Borrowed books checked'],
              ['unreturnedBooksChecked', 'Unreturned books checked'],
              ['outstandingMaterialsChecked', 'Outstanding materials checked'],
              ['lostDamagedMaterialsChecked', 'Lost / damaged materials checked'],
              ['libraryAccountChecked', 'Library account checked'],
            ].map(([key, label]) => (
              <ToggleRow key={key} label={t(label, label)} checked={clearanceChecklist[key]} onChange={() => setClearanceChecklist((current) => ({ ...current, [key]: !current[key] }))} />
            ))}
          </div>
          <SaveButton t={t} saving={savingSection === 'clearanceChecklist'} onClick={() => saveSettings('clearanceChecklist', clearanceChecklist)} />
        </SettingsSection>}

        {activeSection === 'notifications' && <SettingsSection id="notification-settings" icon={Bell} title="Notification Settings" description="Choose which employee-clearance updates to receive and where they are delivered." number="04">
          <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h3 className="mb-2 text-xs font-bold text-slate-700">{t('Notification Events', 'የማሳወቂያ ክስተቶች')}</h3>
              {[
                ['newClearanceRequest', 'New clearance request'],
                ['resubmittedClearance', 'Clearance request returned / resubmitted'],
                ['clearanceStatusUpdated', 'Clearance status updated'],
              ].map(([key, label]) => (
                <ToggleRow key={key} label={t(label, label)} checked={notificationPreferences[key]} onChange={() => setNotificationPreferences((current) => ({ ...current, [key]: !current[key] }))} />
              ))}
            </div>
            <div>
              <h3 className="mb-2 text-xs font-bold text-slate-700">{t('Delivery Channels', 'የማድረሻ መንገዶች')}</h3>
              {[
                ['inSystemNotifications', 'In-app notifications'],
                ['emailNotifications', 'Email notifications'],
              ].map(([key, label]) => (
                <ToggleRow key={key} label={t(label, label)} checked={deliveryPreferences[key]} onChange={() => setDeliveryPreferences((current) => ({ ...current, [key]: !current[key] }))} />
              ))}
            </div>
          </div>
          <SaveButton
            t={t}
            saving={savingSection === 'notifications'}
            onClick={async () => {
              setSavingSection('notifications');
              setError('');
              setSuccess('');
              try {
                const response = await axios.put(`${SETTINGS_URL}/${encodeURIComponent(userId)}`, {
                  notificationPreferences,
                  deliveryPreferences,
                }, authConfig());
                if (!response.data?.settings?.notificationPreferences || !response.data?.settings?.deliveryPreferences) {
                  throw new Error(t('The saved settings were not returned by the server.'));
                }
                notifySettingsUpdated();
                setSuccess(t('Settings saved successfully.'));
              } catch (saveError) {
                setError(saveError.response?.data?.message || saveError.message || t('Unable to save settings.'));
              } finally {
                setSavingSection('');
              }
            }}
          />
        </SettingsSection>}

        {activeSection === 'account' && <SettingsSection id="account-security" icon={ShieldCheck} title="Account & Security" description="Signed-in officer identity and account protection." number="05">
          <div className="grid gap-3 sm:grid-cols-2">
            <ReadOnlyDetail label={t('Officer Name', 'የኦፊሰር ስም')} value={user?.name || user?.fullName} />
            <ReadOnlyDetail label={t('Employee ID', 'የሰራተኛ መለያ')} value={user?.employeeId} />
            <ReadOnlyDetail label={t('Username', 'የተጠቃሚ ስም')} value={user?.username} />
            <ReadOnlyDetail label={t('Email', 'ኢሜይል')} value={user?.email} />
          </div>
          <Link to="/library-office/profile#security" className="mt-4 inline-flex items-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-800">
            <UserRound size={14} />{t('Change Password', 'የይለፍ ቃል ቀይር')}
          </Link>
        </SettingsSection>}
          </div>
        </div>
      </div>
    </main>
  );
}

function SettingsNavItem({ icon: Icon, label, description, number, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group flex min-h-12 min-w-0 items-center gap-2 rounded-xl px-2.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 sm:px-3 lg:gap-3 ${
        active ? 'bg-teal-700 text-white shadow-sm shadow-teal-900/15' : 'text-slate-600 hover:bg-teal-50 hover:text-teal-800'
      }`}
    >
      <span className={`shrink-0 rounded-lg p-2 transition ${active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-teal-700'}`}><Icon size={15} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[10px] font-semibold sm:text-[11px] lg:text-xs">{label}</span>
        {description && <span className={`mt-0.5 hidden truncate text-[9px] lg:block ${active ? 'text-teal-100' : 'text-slate-400'}`}>{description}</span>}
      </span>
      <span className={`hidden text-[9px] font-bold lg:block ${active ? 'text-teal-100' : 'text-slate-400'}`}>{number}</span>
    </button>
  );
}

function SettingsSection({ id, icon: Icon, title, description, number, children }) {
  const { t } = useLibraryLanguage();
  return (
    <section id={id} className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <span className="rounded-xl bg-teal-50 p-2.5 text-teal-700"><Icon size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-teal-700">{t('Settings section')} {number}</p>
          <h2 className="text-sm font-bold text-slate-900 sm:text-base">{t(title)}</h2>
          <p className="mt-1 text-[11px] leading-5 text-slate-500 sm:text-xs">{t(description)}</p>
        </div>
        <Compass size={16} className="hidden text-slate-300 sm:block" />
      </header>
      <div className="space-y-4 p-5 sm:p-6">{children}</div>
    </section>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-100 px-3.5 py-3 transition hover:border-teal-100 hover:bg-teal-50/40 sm:px-4">
      <span className="text-xs font-medium leading-5 text-slate-700">{label}</span>
      <input type="checkbox" checked={Boolean(checked)} onChange={onChange} className="h-4 w-4 shrink-0 accent-teal-700 focus-visible:ring-2 focus-visible:ring-teal-500" />
    </label>
  );
}

function ReadOnlyDetail({ label, value }) {
  const { t } = useLibraryLanguage();
  return <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-[10px] font-semibold text-slate-500">{label}</p><p className="mt-1 text-xs font-medium text-slate-800">{value || t('Not provided')}</p></div>;
}

function SaveButton({ t, saving, onClick }) {
  return <div className="flex justify-end border-t border-slate-100 pt-4"><button type="button" onClick={onClick} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-teal-700/15 transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/20 disabled:cursor-not-allowed disabled:opacity-50">{saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}{saving ? t('Saving...') : t('Save Changes')}</button></div>;
}
