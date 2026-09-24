import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bell, Building2, Check, ClipboardCheck, Mail, Package, Save } from 'lucide-react';

const API = '/api/property/settings/me';
const defaultNotifications = {
  newClearanceRequest: true,
  requestResubmitted: true,
  employeeInformationUpdated: true,
  propertyVerificationRequired: true,
  clearanceApproved: true,
  clearanceReturned: true
};
const defaultOffice = { name: 'Property / Asset Management Office', email: '', phone: '', campus: 'Main Campus', location: '' };
const defaultCategories = ['Computer / Laptop', 'Monitor', 'Printer', 'Office Furniture', 'Laboratory Equipment', 'Other Equipment'].map((name) => ({ name, enabled: true }));
const defaultChecklist = [
  ['assignedAssetsChecked', 'Assigned Assets Checked'],
  ['assetsReturned', 'Assets Returned'],
  ['assetRecordsUpdated', 'Asset Records Updated'],
  ['noOutstandingProperty', 'No Outstanding Property'],
  ['propertyResponsibilityCleared', 'Property Responsibility Cleared']
].map(([key, label]) => ({ key, label, enabled: true }));
const defaultEmails = { inSystemNotifications: true, emailNotifications: true, newRequestEmail: true, returnedRequestEmail: true };

export default function PropertySettings() {
  const [notifications, setNotifications] = useState(defaultNotifications);
  const [office, setOffice] = useState(defaultOffice);
  const [categories, setCategories] = useState(defaultCategories);
  const [checklist, setChecklist] = useState(defaultChecklist);
  const [emails, setEmails] = useState(defaultEmails);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const authConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get(API, authConfig());
        const profile = response.data.profile || {};
        setNotifications({ ...defaultNotifications, ...(profile.notificationPreferences || {}) });
        setOffice({ ...defaultOffice, ...(profile.propertyOffice || {}) });
        setCategories(profile.propertySettings?.assetCategories?.length ? profile.propertySettings.assetCategories : defaultCategories);
        setChecklist(profile.propertySettings?.clearanceChecklist?.length ? profile.propertySettings.clearanceChecklist : defaultChecklist);
        setEmails({ ...defaultEmails, ...(profile.propertySettings?.emailPreferences || {}) });
      } catch (error) {
        setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to load Property Office settings.' });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const save = async (section, payload, text) => {
    setSaving(section);
    setMessage({ type: '', text: '' });
    try {
      await axios.put(API, payload, authConfig());
      setMessage({ type: 'success', text });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to save settings.' });
    } finally {
      setSaving('');
    }
  };

  const toggle = (setState, key) => setState((current) => ({ ...current, [key]: !current[key] }));

  if (loading) return <div className="p-8 text-center text-xs text-slate-500">Loading Property Office settings...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-xs text-slate-800 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="border-b border-slate-200 pb-4">
          <h1 className="text-lg font-bold text-slate-900">Property Officer Settings</h1>
          <p className="mt-1 text-slate-500">Configure Property Office workflow, verification, and notification behavior.</p>
        </header>
        {message.text && <div className={`rounded border p-3 font-semibold ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{message.text}</div>}

        <SettingsSection icon={Bell} title="Notification Settings" description="Choose which Property Office events appear in your notifications.">
          <div className="grid gap-x-8 sm:grid-cols-2">{[
            ['newClearanceRequest', 'New Clearance Request'], ['requestResubmitted', 'Clearance Request Resubmitted'],
            ['employeeInformationUpdated', 'Employee Information Updated'], ['propertyVerificationRequired', 'Property Verification Required'],
            ['clearanceApproved', 'Clearance Approved'], ['clearanceReturned', 'Clearance Returned']
          ].map(([key, label]) => <ToggleRow key={key} label={label} checked={notifications[key]} onChange={() => toggle(setNotifications, key)} />)}</div>
          <SaveButton saving={saving === 'notifications'} onClick={() => save('notifications', { notificationPreferences: notifications }, 'Notification settings saved.')} label="Save Changes" />
        </SettingsSection>

        <SettingsSection icon={Building2} title="Property Office Information" description="Information shown for the Property / Asset Management Office.">
          <div className="grid gap-4 sm:grid-cols-2">{[
            ['name', 'Property Office Name'], ['email', 'Office Email', 'email'], ['phone', 'Office Phone'], ['campus', 'Campus'], ['location', 'Office Location']
          ].map(([key, label, type = 'text']) => <label key={key} className="font-semibold text-slate-600">{label}<input type={type} value={office[key]} onChange={(event) => setOffice({ ...office, [key]: event.target.value })} className="mt-1 w-full rounded border border-slate-300 bg-white p-2 font-normal outline-none focus:border-teal-500" /></label>)}</div>
          <SaveButton saving={saving === 'office'} onClick={() => save('office', { propertyOffice: office }, 'Property Office information saved.')} label="Save Office Information" />
        </SettingsSection>

        <SettingsSection icon={Package} title="Asset Categories" description="Categories are managed by System Admin. Property Officers can view active categories used during asset verification.">
          <div className="grid gap-3 sm:grid-cols-2">{categories.map((item) => <ToggleRow key={item.name} label={item.name} checked={item.enabled} disabled />)}</div>
          <p className="mt-3 text-[10px] text-slate-500">Category creation and deletion are restricted to System Admin.</p>
        </SettingsSection>

        <SettingsSection icon={ClipboardCheck} title="Property Clearance Checklist" description="These checks guide Property Officers before a clearance is approved.">
          <div className="space-y-2">{checklist.map((item, index) => <ToggleRow key={item.key} label={item.label} checked={item.enabled} onChange={() => setChecklist((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, enabled: !entry.enabled } : entry))} />)}</div>
          <SaveButton saving={saving === 'checklist'} onClick={() => save('checklist', { clearanceChecklist: checklist }, 'Clearance checklist saved.')} label="Save Checklist" />
        </SettingsSection>

        <SettingsSection icon={Mail} title="Email Preferences" description="Control in-system and email delivery for Property Office events.">
          <div className="grid gap-x-8 sm:grid-cols-2">{[
            ['inSystemNotifications', 'In-System Notifications'], ['emailNotifications', 'Email Notifications'],
            ['newRequestEmail', 'New Request Email'], ['returnedRequestEmail', 'Returned Request Email']
          ].map(([key, label]) => <ToggleRow key={key} label={label} checked={emails[key]} onChange={() => toggle(setEmails, key)} />)}</div>
          <SaveButton saving={saving === 'emails'} onClick={() => save('emails', { emailPreferences: emails }, 'Email preferences saved.')} label="Save Email Preferences" />
        </SettingsSection>
      </div>
    </div>
  );
}

function SettingsSection({ icon: Icon, title, description, children }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 border-b border-slate-100 pb-3"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Icon size={16} className="text-teal-700" />{title}</h2><p className="mt-1 text-[10px] text-slate-500">{description}</p></div>{children}</section>;
}

function ToggleRow({ label, checked, onChange, disabled = false }) {
  return <label className={`flex items-center justify-between border-b border-slate-100 py-3 last:border-0 ${disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}><span className="font-semibold text-slate-700">{label}</span><input type="checkbox" checked={Boolean(checked)} onChange={onChange} disabled={disabled} className="sr-only" /><span className={`flex h-6 w-11 items-center rounded-full p-1 transition ${checked ? 'bg-teal-700' : 'bg-slate-300'}`}><span className={`flex h-4 w-4 items-center justify-center rounded-full bg-white transition ${checked ? 'translate-x-5' : ''}`}>{checked && <Check size={11} className="text-teal-700" />}</span></span></label>;
}

function SaveButton({ saving, onClick, label }) {
  return <div className="mt-4 flex justify-end"><button type="button" onClick={onClick} disabled={saving} className="inline-flex items-center gap-1.5 rounded bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"><Save size={14} />{saving ? 'Saving...' : label}</button></div>;
}
