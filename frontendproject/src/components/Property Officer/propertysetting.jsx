import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  Bell, Boxes, CheckCircle2, ClipboardCheck, Plus, Save,
  Settings, Shield, Trash2,
} from 'lucide-react';
import { usePropertyLanguage } from './propertyLanguage';

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
  { name: 'Computer / Laptop', description: 'Computers, laptops, accessories', enabled: true },
  { name: 'Furniture', description: 'Tables, chairs, office furniture', enabled: true },
  { name: 'Office Equipment', description: 'Printers, scanners, projectors', enabled: true },
  { name: 'Other Property', description: 'Other university assets', enabled: true },
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
};

const DEFAULT_CLEARANCE_RULES = {
  requireNoOutstandingAssets: true,
  requireOfficerComment: false,
};

const authText = 'text-slate-700';
const inputClass = 'w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[10px] text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

export default function PropertySettings() {
  const { t } = usePropertyLanguage();
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
  const [categoryDraft, setCategoryDraft] = useState({ name: '', description: '' });
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
        setCategories(settings.assetCategories?.length ? settings.assetCategories : DEFAULT_CATEGORIES);
        setStatuses(settings.assetStatuses?.length ? settings.assetStatuses : DEFAULT_STATUSES);
        setNotifications({
          ...DEFAULT_NOTIFICATIONS,
          ...(loadedProfile.notificationPreferences || {}),
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
      const response = await axios.put(PROFILE_URL, { notificationPreferences: notifications }, authConfig());
      const updatedProfile = response.data?.profile;
      if (!updatedProfile) throw new Error(t('The notification preferences were not returned.', 'የማሳወቂያ ምርጫዎች አልተመለሱም።'));
      setMessage({ type: 'success', text: t('Notification preferences saved.', 'የማሳወቂያ ምርጫዎች ተቀምጠዋል።') });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || t('Unable to save notification preferences.', 'የማሳወቂያ ምርጫዎችን ማስቀመጥ አልተቻለም።') });
    } finally {
      setSaving(false);
    }
  };

  const addCategory = () => {
    if (!categoryDraft.name.trim()) return;
    setCategories((current) => [...current, { ...categoryDraft, name: categoryDraft.name.trim(), enabled: true }]);
    setCategoryDraft({ name: '', description: '' });
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
          draftFields={['name', 'description']}
          rows={categories}
          onUpdate={(index, field, value) => setCategories((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item))}
          onDelete={(index) => setCategories((current) => current.filter((_, itemIndex) => itemIndex !== index))}
          columns={['Category Name', 'Description', 'Status']}
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
          <div className="space-y-3 p-3">
            <NotificationToggle t={t} label="New Clearance Request" description="Notify relevant officers when a new request is submitted." checked={notifications.newClearanceRequest} onChange={(value) => setNotifications((current) => ({ ...current, newClearanceRequest: value }))} />
            <NotificationToggle t={t} label="Returned Request" description="Notify when a request is returned for re-check." checked={notifications.requestResubmitted} onChange={(value) => setNotifications((current) => ({ ...current, requestResubmitted: value }))} />
            <NotificationToggle t={t} label="Property Action Required" description="Notify about pending property reviews and other items requiring action." checked={notifications.actionRequired} onChange={(value) => setNotifications((current) => ({ ...current, actionRequired: value }))} />
            <div className="rounded border border-blue-100 bg-blue-50 p-2 text-[9px] text-blue-700">
              <CheckCircle2 size={12} className="mr-1 inline" /> {t('Notification preferences are saved to your account.', 'የማሳወቂያ ምርጫዎች በመለያዎ ላይ ተቀምጠዋል።')}
            </div>
            <button type="button" onClick={saveNotifications} disabled={saving} className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-[9px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              <Save size={11} />{saving ? t('Saving...', 'በማስቀመጥ ላይ...') : t('Save Notifications', 'ማሳወቂያዎችን አስቀምጥ')}
            </button>
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
  const translations = {
    'Asset Categories': 'የንብረት ምድቦች',
    'Manage property/asset categories used in the clearance process.': 'በክሊራንስ ሂደት ውስጥ የሚጠቀሙ የንብረት ምድቦችን ያስተዳድሩ።',
    'Add Category': 'ምድብ ጨምር',
    'Category Name': 'የምድብ ስም',
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
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex items-start justify-between gap-2 border-b border-slate-100 p-3">
        <div className="flex items-start gap-2">
          <Icon size={16} className="mt-0.5 shrink-0 text-blue-700" />
          <div><h2 className="text-[11px] font-bold text-slate-700">{t(title, translations[title])}</h2><p className="mt-0.5 text-[9px] text-slate-500">{t(description, translations[description])}</p></div>
        </div>
        <button type="button" onClick={onAdd} disabled={!draft.name.trim()} className="inline-flex shrink-0 items-center gap-1 rounded bg-emerald-600 px-2 py-1.5 text-[9px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
          <Plus size={11} />{t(addLabel, translations[addLabel])}
        </button>
      </header>
      <div className="grid grid-cols-1 gap-1.5 border-b border-slate-100 bg-slate-50 p-2 sm:grid-cols-2">
        {draftFields.map((field) => (
          field === 'color' ? (
            <select key={field} aria-label={t('New status color', translations['New status color'])} value={draft[field]} onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))} className={inputClass}>
              {['Blue', 'Green', 'Red', 'Orange', 'Purple'].map((color) => <option key={color}>{color}</option>)}
            </select>
          ) : (
            <input key={field} aria-label={t(`New ${field}`, field === 'name' ? 'አዲስ ስም' : 'አዲስ መግለጫ')} value={draft[field]} onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))} placeholder={field === 'name' ? `${t(columns[0], translations[columns[0]])} ${t('name', 'ስም')}` : t('Description', translations.Description)} className={inputClass} />
          )
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[400px] text-left text-[9px]">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="px-2 py-2">#</th>{columns.map((column) => <th key={column} className="px-2 py-2">{t(column, translations[column])}</th>)}<th className="px-2 py-2 text-right">{t('Action', translations.Action)}</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={`${row.key || row.name}-${index}`}>
                <td className="px-2 py-2">{index + 1}</td>
                <td className="px-2 py-2"><input aria-label={`${t(columns[0], translations[columns[0]])} ${index + 1}`} value={row.name || ''} onChange={(event) => onUpdate(index, 'name', event.target.value)} className="w-24 bg-transparent font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-blue-300" /></td>
                <td className="px-2 py-2"><input aria-label={`${t(columns[1], translations[columns[1]])} ${index + 1}`} value={row.description || ''} onChange={(event) => onUpdate(index, 'description', event.target.value)} className="w-28 bg-transparent text-slate-500 outline-none focus:ring-1 focus:ring-blue-300" /></td>
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
    </section>
  );
}

function NotificationToggle({ label, description, checked, onChange, t }) {
  const translations = {
    'New Clearance Request': 'አዲስ የክሊራንስ ጥያቄ',
    'Notify relevant officers when a new request is submitted.': 'አዲስ ጥያቄ ሲቀርብ ለሚመለከታቸው ኦፊሰሮች ያሳውቁ።',
    'Returned Request': 'የተመለሰ ጥያቄ',
    'Notify when a request is returned for re-check.': 'ጥያቄ ለድጋሚ ግምገማ ሲመለስ ያሳውቁ።',
    'Property Action Required': 'የንብረት እርምጃ ያስፈልጋል',
    'Notify about pending property reviews and other items requiring action.': 'ስለሚጠባበቁ የንብረት ግምገማዎች እና እርምጃ ስለሚያስፈልጋቸው ሌሎች ነገሮች ያሳውቁ።',
  };
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="flex items-start gap-2">
        <ClipboardCheck size={13} className="mt-0.5 shrink-0 text-slate-500" />
        <span><span className="block text-[10px] font-semibold text-slate-700">{t(label, translations[label])}</span><span className="mt-0.5 block text-[9px] text-slate-500">{t(description, translations[description])}</span></span>
      </span>
      <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} className="h-3.5 w-3.5 shrink-0 accent-emerald-600" />
    </label>
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
