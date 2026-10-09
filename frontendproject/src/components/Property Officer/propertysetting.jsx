import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  Bell, Boxes, Building2, CheckCircle2, Eye, EyeOff, LockKeyhole,
  LogOut, Monitor, Plus, Save, Settings, Shield, Trash2,
} from 'lucide-react';
import { usePropertyLanguage } from './propertyLanguage';
import { useAuth } from '../../context/authContext';

const PROFILE_URL = '/api/property/profile/me';
const authConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
});

const DEFAULT_CHECKS = [
  { key: 'assignedAssetsChecked', label: 'Laptop / Computer', enabled: true },
  { key: 'assetsReturned', label: 'Office Furniture', enabled: true },
  { key: 'assetRecordsUpdated', label: 'University Equipment', enabled: true },
  { key: 'noOutstandingProperty', label: 'Other Assigned Property', enabled: false },
];

const DEFAULT_CATEGORIES = [
  { name: 'Computer / Laptop', categoryCode: 'LAP', description: 'Computers, laptops, accessories', enabled: true },
  { name: 'Monitor', categoryCode: 'MON', description: 'Computer monitors and displays', enabled: true },
  { name: 'Printer', categoryCode: 'PRN', description: 'Printers and scanners', enabled: true },
  { name: 'Office Furniture', categoryCode: 'FUR', description: 'Tables, chairs, office furniture', enabled: true },
  { name: 'Laboratory Equipment', categoryCode: 'LAB', description: 'University laboratory equipment', enabled: true },
  { name: 'Other Equipment', categoryCode: 'OTH', description: 'Other university assets', enabled: true },
];

const DEFAULT_STATUSES = [
  { name: 'Assigned', description: 'Still assigned to employee', color: 'Blue' },
  { name: 'Returned', description: 'Returned to university', color: 'Green' },
  { name: 'Missing', description: 'Not found / lost', color: 'Red' },
  { name: 'Damaged', description: 'Damaged or broken', color: 'Orange' },
  { name: 'Cleared', description: 'All items checked and cleared', color: 'Purple' },
];

const DEFAULT_NOTIFICATIONS = {
  newClearanceRequest: true,
  requestResubmitted: true,
  actionRequired: true,
  assetReturn: true,
  clearanceApproved: true,
  clearanceReturned: true,
  systemNotification: true,
};

const DEFAULT_EMAIL_PREFERENCES = {
  emailNotifications: true,
  newRequestEmail: true,
  returnedRequestEmail: true,
  assetReturnEmail: true,
  clearanceApprovedEmail: true,
  clearanceReturnedEmail: true,
  systemNotificationEmail: true,
};

const DEFAULT_OFFICE = {
  name: 'Property Management Office',
  campus: 'Main Campus',
  location: '',
  phone: '',
  email: '',
};

const DEFAULT_CLEARANCE_RULES = {
  requireNoOutstandingAssets: true,
  requireOfficerComment: false,
};

const authText = 'text-slate-700';
const inputClass = 'w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[10px] text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const suggestCategoryCode = (name, existingCodes = []) => {
  const words = String(name || '').trim().split(/[^a-z\d]+/i).filter(Boolean);
  const base = (words.length > 1 ? words.map((word) => word[0]).join('') : (words[0] || '').slice(0, 3))
    .toUpperCase()
    .slice(0, 20) || 'CAT';
  const codes = new Set(existingCodes.map((code) => String(code || '').toUpperCase()));
  if (!codes.has(base)) return base;
  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${base.slice(0, 17)}${suffix}`;
    if (!codes.has(candidate)) return candidate;
  }
};

export default function PropertySettings() {
  const { t } = usePropertyLanguage();
  const { user, logout } = useAuth();
  const languageTranslator = useRef(t);

  useEffect(() => {
    languageTranslator.current = t;
  }, [t]);
  const [activeTab, setActiveTab] = useState('checks');
  const [clearanceChecks, setClearanceChecks] = useState(DEFAULT_CHECKS);
  const [clearanceRules, setClearanceRules] = useState(DEFAULT_CLEARANCE_RULES);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [statuses, setStatuses] = useState(DEFAULT_STATUSES);
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [emailPreferences, setEmailPreferences] = useState(DEFAULT_EMAIL_PREFERENCES);
  const [office, setOffice] = useState(DEFAULT_OFFICE);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [categoryDraft, setCategoryDraft] = useState({ name: '', categoryCode: '', description: '', enabled: true });
  const [statusDraft, setStatusDraft] = useState({ name: '', description: '', color: 'Blue' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let active = true;
    const loadSettings = async () => {
      try {
        const response = await axios.get(PROFILE_URL, authConfig());
        const loadedProfile = response.data?.profile;
        if (!loadedProfile) throw new Error(languageTranslator.current('Property officer profile was not returned.', 'የንብረት ኦፊሰር መገለጫ አልተመለሰም።'));
        if (!active) return;

        const settings = loadedProfile.propertySettings || {};
        setClearanceChecks(settings.clearanceChecklist?.length ? settings.clearanceChecklist : DEFAULT_CHECKS);
        setClearanceRules({ ...DEFAULT_CLEARANCE_RULES, ...(settings.clearanceRules || {}) });
        const loadedCategories = settings.assetCategories?.length ? settings.assetCategories : DEFAULT_CATEGORIES;
        const normalizedCategories = loadedCategories.reduce((result, category) => {
          const categoryCode = category.categoryCode || suggestCategoryCode(
            category.name,
            result.map((item) => item.categoryCode)
          );
          result.push({ ...category, categoryCode });
          return result;
        }, []);
        setCategories(normalizedCategories);
        setStatuses(settings.assetStatuses?.length ? settings.assetStatuses : DEFAULT_STATUSES);
        setNotifications({
          ...DEFAULT_NOTIFICATIONS,
          ...(loadedProfile.notificationPreferences || {}),
        });
        setEmailPreferences({
          ...DEFAULT_EMAIL_PREFERENCES,
          ...(settings.emailPreferences || {}),
        });
        setOffice({
          ...DEFAULT_OFFICE,
          ...(loadedProfile.propertyOffice || {}),
        });
      } catch (error) {
        if (active) setMessage({ type: 'error', text: error.response?.data?.message || error.message || languageTranslator.current('Unable to load property settings.', 'የንብረት ቅንብሮችን መጫን አልተቻለም።') });
      } finally {
        if (active) setLoading(false);
      }
    };
    loadSettings();
    return () => { active = false; };
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await axios.put(PROFILE_URL, {
        propertySettings: {
          clearanceChecklist: clearanceChecks,
          clearanceRules,
          assetCategories: categories,
          assetStatuses: statuses,
        },
      }, authConfig());
      const updatedProfile = response.data?.profile;
      if (!updatedProfile) throw new Error(t('The saved settings were not returned.', 'የተቀመጡት ቅንብሮች አልተመለሱም።'));
      setMessage({ type: 'success', text: t('Property settings saved.', 'የንብረት ቅንብሮች ተቀምጠዋል።') });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || t('Unable to save property settings.', 'የንብረት ቅንብሮችን ማስቀመጥ አልተቻለም።') });
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await axios.put(PROFILE_URL, {
        notificationPreferences: notifications,
        emailPreferences,
      }, authConfig());
      const updatedProfile = response.data?.profile;
      if (!updatedProfile) throw new Error(t('The notification preferences were not returned.', 'የማሳወቂያ ምርጫዎች አልተመለሱም።'));
      setMessage({ type: 'success', text: t('Notification preferences saved.', 'የማሳወቂያ ምርጫዎች ተቀምጠዋል።') });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || t('Unable to save notification preferences.', 'የማሳወቂያ ምርጫዎችን ማስቀመጥ አልተቻለም።') });
    } finally {
      setSaving(false);
    }
  };

  const saveOffice = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await axios.put(PROFILE_URL, { propertyOffice: office }, authConfig());
      if (!response.data?.profile?.propertyOffice) throw new Error(t('The updated office information was not returned.', 'የቢሮ መረጃው አልተመለሰም።'));
      setOffice({ ...DEFAULT_OFFICE, ...response.data.profile.propertyOffice });
      setMessage({ type: 'success', text: t('Property office information saved.', 'የንብረት ቢሮ መረጃ ተቀምጧል።') });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || error.message || t('Unable to save office information.', 'የቢሮ መረጃን ማስቀመጥ አልተቻለም።') });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmNewPassword) {
      setMessage({ type: 'error', text: t('New password and confirmation do not match.', 'አዲሱ የይለፍ ቃልና ማረጋገጫው አይዛመዱም።') });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const response = await axios.patch(`/api/profile/${user?._id}/password`, {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      }, authConfig());
      setPasswords({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setMessage({ type: 'success', text: response.data?.message || t('Password updated successfully.', 'የይለፍ ቃሉ ተዘምኗል።') });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || t('Unable to update password.', 'የይለፍ ቃሉን ማዘመን አልተቻለም።') });
    } finally {
      setSaving(false);
    }
  };

  const logoutAllDevices = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await axios.post('/api/property/profile/logout-all-devices', {}, authConfig());
      localStorage.removeItem('token');
      logout();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || t('Unable to sign out other sessions.', 'Бусад session-үүдээс гарах боломжгүй байна።') });
      setSaving(false);
    }
  };

  const addCategory = async () => {
    const newCategory = {
      ...categoryDraft,
      name: categoryDraft.name.trim(),
      categoryCode: categoryDraft.categoryCode.trim().toUpperCase(),
      description: categoryDraft.description.trim(),
      enabled: categoryDraft.enabled,
    };
    const nextCategories = [...categories, newCategory];
    setSaving(true);
    setMessage(null);
    try {
      const response = await axios.put(PROFILE_URL, {
        propertySettings: { assetCategories: nextCategories },
      }, authConfig());
      const savedCategories = response.data?.profile?.propertySettings?.assetCategories;
      if (!Array.isArray(savedCategories)) throw new Error(t('The saved asset categories were not returned.', 'የተቀመጡት የንብረት ምድቦች አልተመለሱም።'));
      setCategories(savedCategories);
      setCategoryDraft({ name: '', categoryCode: '', description: '', enabled: true });
      setMessage({ type: 'success', text: t('Asset category saved.', 'የንብረት ምድቡ ተቀምጧል።') });
      return true;
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || error.message || t('Unable to save asset category.', 'የንብረት ምድቡን ማስቀመጥ አልተቻለም።') });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addStatus = () => {
    if (!statusDraft.name.trim()) return;
    setStatuses((current) => [...current, { ...statusDraft, name: statusDraft.name.trim() }]);
    setStatusDraft({ name: '', description: '', color: 'Blue' });
  };

  if (loading) return <div className="p-8 text-center text-sm text-slate-500">{t('Loading Property / Asset Settings...', 'የንብረት ቅንብሮችን በመጫን ላይ...')}</div>;

  const tabs = [
    { id: 'checks', label: t('Required Asset Checks', 'አስፈላጊ የንብረት ምርመራዎች') },
    { id: 'rules', label: t('Clearance Rules', 'የክሊራንስ ደንቦች') },
    { id: 'approvals', label: t('Approval Settings', 'የማጽደቅ ቅንብሮች') },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-4 text-slate-800 sm:p-5">
      <header className="mb-4">
        <p className="text-[10px] font-semibold text-slate-500">{t('Property / Asset Officer', 'የንብረት ኦፊሰር')} <span className="px-1">/</span> {t('Settings', 'ቅንብሮች')}</p>
        <h1 className="mt-1 text-xl font-bold">{t('Settings', 'ቅንብሮች')}</h1>
        <p className="mt-1 text-xs text-slate-500">{t('Manage clearance rules, asset categories, status and notification settings.', 'የክሊራንስ ደንቦችን፣ የንብረት ምድቦችን፣ ሁኔታዎችን እና የማሳወቂያ ቅንብሮችን ያስተዳድሩ።')}</p>
      </header>

      {message && (
        <p role={message.type === 'error' ? 'alert' : 'status'} className={`mb-4 rounded-md border px-3 py-2 text-xs ${message.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {message.text}
        </p>
      )}

      <div className="grid items-stretch gap-3 xl:grid-cols-3">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <SectionTitle t={t} icon={Building2} title="Property Office Information" description="View and update your property office details." />
          <form onSubmit={saveOffice} className="space-y-2 p-3">
            {[
              ['name', 'Office Name'],
              ['campus', 'Campus'],
              ['location', 'Location'],
              ['phone', 'Phone'],
              ['email', 'Email'],
            ].map(([field, label]) => (
              <label key={field} className="block text-[9px] font-semibold text-slate-600">
                {t(label, label)}
                <input
                  required={field === 'name'}
                  type={field === 'email' ? 'email' : 'text'}
                  value={office[field]}
                  onChange={(event) => setOffice((current) => ({ ...current, [field]: event.target.value }))}
                  className={`${inputClass} mt-1`}
                />
              </label>
            ))}
            <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-[9px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              <Save size={11} />{saving ? t('Saving...', 'በማስቀመጥ ላይ...') : t('Save Changes', 'ለውጦችን አስቀምጥ')}
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <SectionTitle t={t} icon={Settings} title="Clearance Settings" description="Configure property clearance requirements and approval rules." />
          <div className="flex border-b border-slate-200 px-3">
            {tabs.map((tab) => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`border-b-2 px-2 py-2 text-[9px] font-semibold ${activeTab === tab.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-3">
            {activeTab === 'checks' && (
              <>
                <h3 className="text-[11px] font-bold">{t('Required Property Checks', 'አስፈላጊ የንብረት ምርመራዎች')}</h3>
                <p className="mt-1 text-[9px] text-slate-500">{t('Select the asset checks that officers must complete during clearance review.', 'ኦፊሰሮች በክሊራንስ ግምገማ ወቅት ማጠናቀቅ ያለባቸውን የንብረት ምርመራዎች ይምረጡ።')}</p>
                <div className="mt-3 space-y-2">
                  {clearanceChecks.map((check, index) => (
                    <label key={check.key} className="flex items-center gap-2 text-[10px] font-medium text-slate-700">
                      <input type="checkbox" checked={Boolean(check.enabled)} onChange={(event) => setClearanceChecks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: event.target.checked } : item))} className="h-3 w-3 accent-blue-600" />
                      {check.label}
                    </label>
                  ))}
                </div>
              </>
            )}
            {activeTab === 'rules' && (
              <>
                <h3 className="text-[11px] font-bold">{t('Clearance Rules', 'የክሊራንስ ደንቦች')}</h3>
                <p className="mt-1 text-[9px] text-slate-500">{t('These rules are checked by the server before a property clearance can be approved.', 'የንብረት ክሊራንስ ከመጽደቁ በፊት እነዚህ ደንቦች በሰርቨሩ ይረጋገጣሉ።')}</p>
                <div className="mt-3 space-y-3">
                  <SettingToggle
                    label={t('Require all assigned assets to be returned', 'ሁሉም የተመደቡ ንብረቶች እንዲመለሱ ጠይቅ')}
                    description={t('Block approval while the employee has any asset that is not marked Returned.', 'ማንኛውም ንብረት ተመልሷል ተብሎ ካልተመዘገበ ማጽደቅን አግድ።')}
                    t={t}
                    checked={clearanceRules.requireNoOutstandingAssets}
                    onChange={(value) => setClearanceRules((current) => ({ ...current, requireNoOutstandingAssets: value }))}
                  />
                </div>
              </>
            )}
            {activeTab === 'approvals' && (
              <>
                <h3 className="text-[11px] font-bold">{t('Approval Settings', 'የማጽደቅ ቅንብሮች')}</h3>
                <p className="mt-1 text-[9px] text-slate-500">{t('Configure the information required before an officer approves a request.', 'ኦፊሰር ጥያቄን ከማጽደቁ በፊት የሚያስፈልገውን መረጃ ያዋቅሩ።')}</p>
                <div className="mt-3 space-y-3">
                  <SettingToggle
                    label={t('Require an officer comment', 'የኦፊሰር አስተያየት ጠይቅ')}
                    description={t('Require a comment in the clearance review before approval is accepted.', 'ማጽደቅ ከመቀበሉ በፊት በክሊራንስ ግምገማ ላይ አስተያየት ያስፈልጋል።')}
                    t={t}
                    checked={clearanceRules.requireOfficerComment}
                    onChange={(value) => setClearanceRules((current) => ({ ...current, requireOfficerComment: value }))}
                  />
                </div>
              </>
            )}
            <button type="button" onClick={saveSettings} disabled={saving} className="mt-4 inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-[9px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              <Save size={11} />{saving ? t('Saving...', 'በማስቀመጥ ላይ...') : t('Save Changes', 'ለውጦችን አስቀምጥ')}
            </button>
          </div>
        </section>

        <SettingsTable
          icon={Boxes}
          t={t}
          title="Asset Categories"
          description="Manage property/asset categories used in the clearance process."
          addLabel="Add Category"
          onAdd={addCategory}
          draft={categoryDraft}
          setDraft={setCategoryDraft}
          draftFields={['name', 'categoryCode', 'description', 'enabled']}
          rows={categories}
          onUpdate={(index, field, value) => setCategories((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item))}
          onDelete={(index) => setCategories((current) => current.filter((_, itemIndex) => itemIndex !== index))}
          columns={['Category Name', 'Category Code', 'Description', 'Status']}
          save={saveSettings}
          saving={saving}
        />

        <SettingsTable
          icon={Shield}
          t={t}
          title="Status Settings"
          description="Manage asset and clearance status options."
          addLabel="Add Status"
          onAdd={addStatus}
          draft={statusDraft}
          setDraft={setStatusDraft}
          draftFields={['name', 'description', 'color']}
          rows={statuses}
          onUpdate={(index, field, value) => setStatuses((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item))}
          onDelete={(index) => setStatuses((current) => current.filter((_, itemIndex) => itemIndex !== index))}
          columns={['Status Name', 'Description', 'Color']}
          save={saveSettings}
          saving={saving}
        />

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <SectionTitle t={t} icon={Bell} title="Notification Settings" description="Choose when to send notifications to responsible offices and users." />
          <div className="p-3">
            <div className="mb-2 grid grid-cols-[1fr_52px_52px] gap-2 text-center text-[9px] font-semibold text-slate-500">
              <span className="text-left">{t('Event', 'ክስተት')}</span>
              <span>{t('In-System', 'በሲስተም')}</span>
              <span>{t('Email', 'ኢሜይል')}</span>
            </div>
            {[
              ['New Clearance Request', 'newClearanceRequest', 'newRequestEmail'],
              ['Resubmitted Clearance', 'requestResubmitted', 'returnedRequestEmail'],
              ['Asset Return Submitted', 'assetReturn', 'assetReturnEmail'],
              ['Clearance Approved', 'clearanceApproved', 'clearanceApprovedEmail'],
              ['Clearance Returned', 'clearanceReturned', 'clearanceReturnedEmail'],
              ['System Notifications', 'systemNotification', 'systemNotificationEmail'],
            ].map(([label, appKey, emailKey]) => (
              <div key={appKey} className="grid grid-cols-[1fr_52px_52px] items-center gap-2 border-t border-slate-100 py-2 text-[9px] text-slate-700">
                <span>{t(label, label)}</span>
                <div className="flex justify-center"><input aria-label={`${label} in-system`} type="checkbox" checked={notifications[appKey] !== false} onChange={(event) => setNotifications((current) => ({ ...current, [appKey]: event.target.checked }))} className="h-3.5 w-3.5 accent-blue-600" /></div>
                <div className="flex justify-center"><input aria-label={`${label} email`} type="checkbox" checked={emailPreferences[emailKey] !== false} onChange={(event) => setEmailPreferences((current) => ({ ...current, [emailKey]: event.target.checked }))} className="h-3.5 w-3.5 accent-blue-600" /></div>
              </div>
            ))}
            <div className="mt-2 rounded border border-blue-100 bg-blue-50 p-2 text-[9px] text-blue-700">
              <CheckCircle2 size={12} className="mr-1 inline" /> {t('Notification preferences are saved to your account.', 'የማሳወቂያ ምርጫዎች በመለያዎ ላይ ተቀምጠዋል።')}
            </div>
            <button type="button" onClick={saveNotifications} disabled={saving} className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-[9px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              <Save size={11} />{saving ? t('Saving...', 'በማስቀመጥ ላይ...') : t('Save Notifications', 'ማሳወቂያዎችን አስቀምጥ')}
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <SectionTitle t={t} icon={LockKeyhole} title="Security / Account" description="Manage your account security settings." />
          <form onSubmit={changePassword} className="space-y-2 p-3">
            <h3 className="text-[10px] font-bold text-slate-700">{t('Change Password', 'የይለፍ ቃል ቀይር')}</h3>
            {[
              ['currentPassword', 'Current Password', 'current'],
              ['newPassword', 'New Password', 'new'],
              ['confirmNewPassword', 'Confirm New Password', 'confirm'],
            ].map(([field, label, visibilityKey]) => (
              <label key={field} className="block text-[9px] font-semibold text-slate-600">
                {t(label, label)}
                <span className="mt-1 flex rounded-md border border-slate-200 focus-within:border-blue-400">
                  <input
                    required
                    type={showPasswords[visibilityKey] ? 'text' : 'password'}
                    value={passwords[field]}
                    onChange={(event) => setPasswords((current) => ({ ...current, [field]: event.target.value }))}
                    className="min-w-0 flex-1 rounded-md px-2 py-1.5 text-[10px] outline-none"
                  />
                  <button type="button" aria-label={showPasswords[visibilityKey] ? t('Hide password', 'Нууц үгийг нуух') : t('Show password', 'Нууц үгийг харуулах')} onClick={() => setShowPasswords((current) => ({ ...current, [visibilityKey]: !current[visibilityKey] }))} className="px-2 text-slate-400">
                    {showPasswords[visibilityKey] ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </span>
              </label>
            ))}
            <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-[9px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              <LockKeyhole size={11} />{t('Update Password', 'Нууц үг шинэчлэх')}
            </button>
          </form>
          <div className="space-y-3 border-t border-slate-100 p-3">
            <div className="flex items-start gap-2 text-[9px]">
              <Shield size={14} className="mt-0.5 text-slate-500" />
              <div><p className="font-semibold text-slate-700">{t('Two-Factor Authentication', 'Хоёр шатлалт баталгаажуулалт')}</p><p className="text-slate-500">{t('2FA setup is not available for this account yet.', 'Энэ бүртгэлд 2FA тохиргоо хараахан боломжгүй байна።')}</p></div>
            </div>
            <div className="flex items-center justify-between gap-2 text-[9px]">
              <div className="flex items-center gap-2"><Monitor size={14} className="text-slate-500" /><div><p className="font-semibold text-slate-700">{t('Active Sessions', 'Идэвхтэй session')}</p><p className="text-slate-500">{t('Sign out from all devices.', 'Бүх төхөөрөмжөөс гаргах.')}</p></div></div>
              <button type="button" onClick={logoutAllDevices} disabled={saving} className="inline-flex shrink-0 items-center gap-1 rounded border border-rose-200 px-2 py-1 text-[9px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">
                <LogOut size={11} />{t('Sign Out All', 'Бүгдээс гарах')}
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, description, t }) {
  const translations = {
    'Clearance Settings': 'የክሊራንስ ቅንብሮች',
    'Configure property clearance requirements and approval rules.': 'የንብረት ክሊራንስ መስፈርቶችን እና የማጽደቅ ደንቦችን ያዋቅሩ።',
    'Notification Settings': 'የማሳወቂያ ቅንብሮች',
    'Choose when to send notifications to responsible offices and users.': 'ለሚመለከታቸው ቢሮዎች እና ተጠቃሚዎች ማሳወቂያዎች መቼ እንደሚላኩ ይምረጡ።',
  };
  return (
    <header className="flex items-start gap-2 border-b border-slate-100 p-3">
      <Icon size={16} className="mt-0.5 shrink-0 text-blue-700" />
      <div>
        <h2 className={`text-[11px] font-bold ${authText}`}>{t(title, translations[title])}</h2>
        <p className="mt-0.5 text-[9px] text-slate-500">{t(description, translations[description])}</p>
      </div>
    </header>
  );
}

function SettingsTable({ icon, title, description, addLabel, onAdd, draft, setDraft, draftFields, rows, onUpdate, onDelete, columns, save, saving, t }) {
  const Icon = icon;
  const isCategoryTable = title === 'Asset Categories';
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const translations = {
    'Asset Categories': 'የንብረት ምድቦች',
    'Manage property/asset categories used in the clearance process.': 'በክሊራንስ ሂደት ውስጥ የሚጠቀሙ የንብረት ምድቦችን ያስተዳድሩ።',
    'Add Category': 'ምድብ ጨምር',
    'Category Name': 'የምድብ ስም',
    'Category Code': 'የምድብ ኮድ',
    'Add Asset Category': 'የንብረት ምድብ ጨምር',
    'Category Name *': 'የምድብ ስም *',
    'Category Code *': 'የምድብ ኮድ *',
    'Status Settings': 'የሁኔታ ቅንብሮች',
    'Manage asset and clearance status options.': 'የንብረት እና የክሊራንስ ሁኔታ አማራጮችን ያስተዳድሩ።',
    'Add Status': 'ሁኔታ ጨምር',
    'Status Name': 'የሁኔታ ስም',
    Description: 'መግለጫ',
    Status: 'ሁኔታ',
    Color: 'ቀለም',
    Action: 'ተግባር',
    'New status color': 'አዲስ የሁኔታ ቀለም',
    'Save table settings': 'የሰንጠረዥ ቅንብሮችን አስቀምጥ',
    Active: 'ንቁ',
    Inactive: 'ንቁ ያልሆነ',
    'No entries yet.': 'እስካሁን ምንም መዝገብ የለም።',
    Save: 'አስቀምጥ',
    'Saving...': 'በማስቀመጥ ላይ...',
  };
  return (
    <section className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex items-start justify-between gap-2 border-b border-slate-100 p-3">
        <div className="flex items-start gap-2">
          <Icon size={16} className="mt-0.5 shrink-0 text-blue-700" />
          <div><h2 className="text-[11px] font-bold text-slate-700">{t(title, translations[title])}</h2><p className="mt-0.5 text-[9px] text-slate-500">{t(description, translations[description])}</p></div>
        </div>
        <button type="button" onClick={() => isCategoryTable ? setIsCategoryModalOpen(true) : onAdd()} disabled={!isCategoryTable && !draft.name.trim()} className="inline-flex shrink-0 items-center gap-1 rounded bg-emerald-600 px-2 py-1.5 text-[9px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
          <Plus size={11} />{t(addLabel, translations[addLabel])}
        </button>
      </header>
      {!isCategoryTable && <div className="grid grid-cols-1 gap-1.5 border-b border-slate-100 bg-slate-50 p-2 sm:grid-cols-2">
        {draftFields.map((field) => field === 'color' ? (
          <select key={field} aria-label={t('New status color', translations['New status color'])} value={draft[field]} onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))} className={inputClass}>
            {['Blue', 'Green', 'Red', 'Orange', 'Purple'].map((color) => <option key={color}>{color}</option>)}
          </select>
        ) : (
          <input key={field} aria-label={t(`New ${field}`, field === 'name' ? 'አዲስ ስም' : 'አዲስ መግለጫ')} value={draft[field]} onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))} placeholder={field === 'name' ? `${t(columns[0], translations[columns[0]])} ${t('name', 'ስም')}` : t('Description', translations.Description)} className={inputClass} />
        ))}
      </div>}
      <div className="overflow-x-auto">
        <table className={`w-full ${isCategoryTable ? 'min-w-[540px]' : 'min-w-[400px]'} text-left text-[9px]`}>
          <thead className="bg-slate-50 text-slate-600"><tr><th className="px-2 py-2">#</th>{columns.map((column) => <th key={column} className="px-2 py-2">{t(column, translations[column])}</th>)}<th className="px-2 py-2 text-right">{t('Action', translations.Action)}</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={`${row.key || row.name}-${index}`}>
                <td className="px-2 py-2">{index + 1}</td>
                <td className="px-2 py-2"><input aria-label={`${t(columns[0], translations[columns[0]])} ${index + 1}`} value={row.name || ''} onChange={(event) => onUpdate(index, 'name', event.target.value)} className="w-24 bg-transparent font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-blue-300" /></td>
                {isCategoryTable && <td className="px-2 py-2"><input aria-label={`${t('Category Code', translations['Category Code'])} ${index + 1}`} value={row.categoryCode || ''} onChange={(event) => onUpdate(index, 'categoryCode', event.target.value.toUpperCase())} className="w-16 bg-transparent font-mono text-slate-600 outline-none focus:ring-1 focus:ring-blue-300" /></td>}
                <td className="px-2 py-2"><input aria-label={`${t(isCategoryTable ? 'Description' : columns[1], translations.Description)} ${index + 1}`} value={row.description || ''} onChange={(event) => onUpdate(index, 'description', event.target.value)} className="w-28 bg-transparent text-slate-500 outline-none focus:ring-1 focus:ring-blue-300" /></td>
                <td className="px-2 py-2">
                  {title === 'Asset Categories' ? (
                    <button type="button" onClick={() => onUpdate(index, 'enabled', !row.enabled)} className={`rounded-full px-2 py-0.5 font-semibold ${row.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{t(row.enabled ? 'Active' : 'Inactive', translations[row.enabled ? 'Active' : 'Inactive'])}</button>
                  ) : (
                    <select aria-label={`${t('Color', translations.Color)} ${t('for status', 'ለሁኔታ')} ${index + 1}`} value={row.color || 'Blue'} onChange={(event) => onUpdate(index, 'color', event.target.value)} className="rounded-full border-0 bg-slate-50 px-1.5 py-0.5 text-[9px] text-slate-700">
                      {['Blue', 'Green', 'Red', 'Orange', 'Purple'].map((color) => <option key={color}>{color}</option>)}
                    </select>
                  )}
                </td>
                <td className="px-2 py-2 text-right">
                  <button type="button" onClick={save} title={t('Save table settings', translations['Save table settings'])} className="mr-1 rounded p-1 text-blue-600 hover:bg-blue-50"><Save size={12} /></button>
                  <button type="button" onClick={() => onDelete(index)} title={`${t('Delete', 'ሰርዝ')} ${t(columns[0], translations[columns[0]]).toLowerCase()}`} className="rounded p-1 text-rose-600 hover:bg-rose-50"><Trash2 size={12} /></button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={columns.length + 2} className="p-4 text-center text-slate-400">{t('No entries yet.', translations['No entries yet.'])}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-100 p-2 text-right">
        <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1.5 text-[9px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          <Save size={11} />{saving ? t('Saving...', translations['Saving...']) : t('Save', translations.Save)}
        </button>
      </div>
      {isCategoryTable && isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsCategoryModalOpen(false); }}>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (await onAdd()) setIsCategoryModalOpen(false);
            }}
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-xl"
            aria-labelledby="add-asset-category-title"
          >
            <h3 id="add-asset-category-title" className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">{t('Add Asset Category', translations['Add Asset Category'])}</h3>
            <div className="space-y-3 p-4">
              <label className="block text-xs font-semibold text-slate-700">{t('Category Name *', translations['Category Name *'])}
                <input autoFocus required maxLength={100} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className={`${inputClass} mt-1`} />
              </label>
              <label className="block text-xs font-semibold text-slate-700">{t('Category Code *', translations['Category Code *'])}
                <input required maxLength={20} pattern="[A-Za-z0-9_-]+" title={t('Use letters, numbers, hyphens, or underscores.', 'Үсэг፣ ቁጥር፣ ሰረዝ ወይም የታችኛውን ሰረዝ ይጠቀሙ።')} value={draft.categoryCode} onChange={(event) => setDraft((current) => ({ ...current, categoryCode: event.target.value.toUpperCase() }))} className={`${inputClass} mt-1 font-mono`} />
              </label>
              <label className="block text-xs font-semibold text-slate-700">{t('Description', translations.Description)}
                <textarea maxLength={240} rows={2} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} className={`${inputClass} mt-1 resize-y`} />
              </label>
              <label className="block text-xs font-semibold text-slate-700">{t('Status', translations.Status)}
                <select value={draft.enabled ? 'active' : 'inactive'} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.value === 'active' }))} className={`${inputClass} mt-1`}>
                  <option value="active">{t('Active', translations.Active)}</option>
                  <option value="inactive">{t('Inactive', translations.Inactive)}</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
              <button type="button" onClick={() => setIsCategoryModalOpen(false)} disabled={saving} className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">{t('Cancel', 'Cancel')}</button>
              <button type="submit" disabled={saving} className="rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? t('Saving...', translations['Saving...']) : t('Save Category', 'Save Category')}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function SettingToggle({ label, description, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-md border border-slate-200 p-2.5">
      <span>
        <span className="block text-[10px] font-semibold text-slate-700">{label}</span>
        <span className="mt-1 block text-[9px] text-slate-500">{description}</span>
      </span>
      <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-blue-600" />
    </label>
  );
}
