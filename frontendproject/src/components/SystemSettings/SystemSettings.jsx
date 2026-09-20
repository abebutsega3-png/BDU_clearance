import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Settings, Users, Shield, Bell, Lock, Building, FileCheck, Database, Save, BellRing, CheckCircle, Edit, Trash2, Plus } from 'lucide-react';

const api = 'http://localhost:3000/api/settings';
const defaults = {
  general: { systemName: 'Bahir Dar University Employee Clearance System', universityName: 'Bahir Dar University', systemEmail: 'admin@bdu.edu.et', dateFormat: 'DD/MM/YYYY', timeZone: 'Africa/Addis_Ababa', language: 'English' },
  usersAndAccounts: { allowUserRegistration: false, requireEmailVerification: true, passwordExpiration: true, passwordExpiryDays: 90, maximumLoginAttempts: 5, sessionTimeout: '30 minutes', accountLockoutDuration: '30 minutes', forcePasswordChangeOnFirstLogin: true },
  notifications: { emailNotifications: true, systemNotifications: true, notifyWhen: { newUserCreated: true, newEmployeeAdded: true, passwordResetRequested: true, securityAlert: true, userAccountDeactivated: true, employeeClearanceCompleted: true, systemErrorOccurred: true, backupCompleted: false } },
  security: { twoFactorAuth: true, accountLockout: true, failedLoginAlert: true, passwordStrength: 'Strong', minimumPasswordLength: 8, auditLogging: true, encryptSensitiveData: true },
  backupAndMaintenance: { automaticBackup: true, backupFrequency: 'Daily', lastBackup: '', nextBackup: '', maintenanceMode: false },
};

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
const mergeSettings = (current, incoming = {}) => ({
  ...current,
  ...incoming,
  general: { ...current.general, ...incoming.general },
  usersAndAccounts: { ...current.usersAndAccounts, ...incoming.usersAndAccounts },
  notifications: { ...current.notifications, ...incoming.notifications, notifyWhen: { ...current.notifications.notifyWhen, ...incoming.notifications?.notifyWhen } },
  security: { ...current.security, ...incoming.security },
  backupAndMaintenance: { ...current.backupAndMaintenance, ...incoming.backupAndMaintenance },
});

export default function SystemSettings() {
  const [settings, setSettings] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedSetting, setSelectedSetting] = useState(null);
  const [settingForms, setSettingForms] = useState({
    general: {
      systemName: 'Bahir Dar University Employee Clearance System',
      universityName: 'Bahir Dar University',
      contactEmail: 'admin@bdu.edu.et',
      contactPhone: '+251 58 220 0000',
      systemDescription: 'University employee clearance management platform',
      language: 'English',
      timeZone: 'Africa/Addis_Ababa',
      dateFormat: 'DD/MM/YYYY',
    },
    clearance: {
      requiredOffices: {
        hr: true,
        library: true,
        finance: true,
        department: true,
      },
      requestEnabled: true,
      allowResubmission: true,
      rejectionCommentRequired: true,
      autoCompleteWhenCleared: true,
      workflow: 'HR -> Library -> Finance -> Department',
    },
    notification: {
      newRequest: true,
      requestCleared: true,
      requestRejected: true,
      clearanceCompleted: true,
      certificateAvailable: true,
      emailNotification: true,
      inAppNotification: true,
    },
    certificate: {
      template: 'BDU Standard Certificate',
      authorizedSignatory: 'Registrar Office',
      certificatePrefix: 'BDU-CLR',
      certificateNumberFormat: 'BDU-CLR-0001',
      qrVerification: true,
      autoGenerate: true,
    },
    security: {
      minimumPasswordLength: 8,
      requireUppercase: true,
      requireNumber: true,
      requireSpecial: true,
      passwordChangeOnFirstLogin: true,
      maxFailedAttempts: 5,
      accountLockDuration: '30 Minutes',
      sessionTimeout: '30 Minutes',
    },
    backup: {
      backupSchedule: 'Daily',
      maintenanceMode: false,
      backupHistory: ['backup_2026_09_01', 'backup_2026_08_31'],
    },
  });

  useEffect(() => {
    axios.get(api, { headers: headers() })
      .then(({ data }) => {
        setSettings((current) => mergeSettings(current, data.settings));
      })
      .catch(() => setMessage('Unable to load settings. Please sign in again.'))
      .finally(() => setLoading(false));
  }, []);

  const saveSection = async (section, data) => {
    try {
      const response = await axios.put(`${api}/${section}`, data, { headers: headers() });
      setSettings((current) => mergeSettings(current, response.data.settings));
      setMessage(`${section} settings saved successfully.`);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to save settings.');
    }
  };

  const update = (section, key, value) => {
    setSettings((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));
  };

  const updateNotification = (key, value) => {
    setSettings((current) => ({ ...current, notifications: { ...current.notifications, notifyWhen: { ...current.notifications.notifyWhen, [key]: value } } }));
  };

  const toggles = {
    allowReg: settings.usersAndAccounts.allowUserRegistration,
    emailVerif: settings.usersAndAccounts.requireEmailVerification,
    passExp: settings.usersAndAccounts.passwordExpiration,
    forcePass: settings.usersAndAccounts.forcePasswordChangeOnFirstLogin,
    emailNotif: settings.notifications.emailNotifications,
    sysNotif: settings.notifications.systemNotifications,
    twoFA: settings.security.twoFactorAuth,
    accLockout: settings.security.accountLockout,
    failedLoginAlert: settings.security.failedLoginAlert,
    auditLogging: settings.security.auditLogging,
    encryptData: settings.security.encryptSensitiveData,
    autoBackup: settings.backupAndMaintenance.automaticBackup,
    maintenanceMode: settings.backupAndMaintenance.maintenanceMode,
  };

  const toggleMap = {
    allowReg: ['usersAndAccounts', 'allowUserRegistration'], emailVerif: ['usersAndAccounts', 'requireEmailVerification'],
    passExp: ['usersAndAccounts', 'passwordExpiration'], forcePass: ['usersAndAccounts', 'forcePasswordChangeOnFirstLogin'],
    emailNotif: ['notifications', 'emailNotifications'], sysNotif: ['notifications', 'systemNotifications'],
    twoFA: ['security', 'twoFactorAuth'], accLockout: ['security', 'accountLockout'], failedLoginAlert: ['security', 'failedLoginAlert'],
    auditLogging: ['security', 'auditLogging'], encryptData: ['security', 'encryptSensitiveData'],
    autoBackup: ['backupAndMaintenance', 'automaticBackup'], maintenanceMode: ['backupAndMaintenance', 'maintenanceMode'],
  };

  const handleToggle = (key) => {
    const [section, field] = toggleMap[key];
    update(section, field, !toggles[key]);
  };

  const updateField = (field, value) => {
    if (!selectedSetting) return;
    setSettingForms((current) => ({
      ...current,
      [selectedSetting]: {
        ...current[selectedSetting],
        [field]: value,
      },
    }));
  };

  const updateCheckboxGroup = (group, field, value) => {
    if (!selectedSetting) return;
    setSettingForms((current) => ({
      ...current,
      [selectedSetting]: {
        ...current[selectedSetting],
        [group]: {
          ...current[selectedSetting][group],
          [field]: value,
        },
      },
    }));
  };

  const saveSelectedSetting = () => {
    if (!selectedSetting) return;
    const label = selectedSetting.charAt(0).toUpperCase() + selectedSetting.slice(1);
    setMessage(`${label} settings saved successfully.`);
    setSelectedSetting(null);
  };

  const renderDetailForm = () => {
    if (!selectedSetting) return null;
    const form = settingForms[selectedSetting];

    switch (selectedSetting) {
      case 'general':
        return (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">General Settings</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">Edit University and System Information</h3>
              </div>
              <button type="button" onClick={() => setSelectedSetting(null)} className="text-sm font-medium text-slate-500 hover:text-slate-700">Close</button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="University Name"><input value={form.universityName} onChange={(e) => updateField('universityName', e.target.value)} /></Field>
              <Field label="System Name"><input value={form.systemName} onChange={(e) => updateField('systemName', e.target.value)} /></Field>
              <Field label="Contact Email"><input type="email" value={form.contactEmail} onChange={(e) => updateField('contactEmail', e.target.value)} /></Field>
              <Field label="Contact Phone"><input value={form.contactPhone} onChange={(e) => updateField('contactPhone', e.target.value)} /></Field>
              <Field label="Language"><select value={form.language} onChange={(e) => updateField('language', e.target.value)}><option>English</option><option>Amharic</option></select></Field>
              <Field label="Time Zone"><select value={form.timeZone} onChange={(e) => updateField('timeZone', e.target.value)}><option>Africa/Addis_Ababa</option><option>UTC</option></select></Field>
              <Field label="Date Format"><select value={form.dateFormat} onChange={(e) => updateField('dateFormat', e.target.value)}><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></select></Field>
              <div className="md:col-span-2">
                <Field label="System Description"><textarea value={form.systemDescription} onChange={(e) => updateField('systemDescription', e.target.value)} rows={3} /></Field>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button type="button" onClick={() => setSelectedSetting(null)} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={saveSelectedSetting} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Save Changes</button>
            </div>
          </section>
        );

      case 'clearance':
        return (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Clearance Settings</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">Configure Clearance Workflow</h3>
              </div>
              <button type="button" onClick={() => setSelectedSetting(null)} className="text-sm font-medium text-slate-500 hover:text-slate-700">Close</button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Required Clearance Offices</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(form.requiredOffices).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <input type="checkbox" checked={value} onChange={(e) => updateCheckboxGroup('requiredOffices', key, e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      {key === 'hr' ? 'HR Office' : key === 'library' ? 'Library' : key === 'finance' ? 'Finance' : 'Department'}
                    </label>
                  ))}
                </div>
              </div>

              <Field label="Clearance Workflow"><input value={form.workflow} onChange={(e) => updateField('workflow', e.target.value)} /></Field>
              <ToggleField label="Request Enable / Disable" checked={form.requestEnabled} onToggle={(value) => updateField('requestEnabled', value)} />
              <ToggleField label="Allow Resubmission" checked={form.allowResubmission} onToggle={(value) => updateField('allowResubmission', value)} />
              <ToggleField label="Rejection Comment Required" checked={form.rejectionCommentRequired} onToggle={(value) => updateField('rejectionCommentRequired', value)} />
              <ToggleField label="Auto Complete When All Offices Cleared" checked={form.autoCompleteWhenCleared} onToggle={(value) => updateField('autoCompleteWhenCleared', value)} />
            </div>

            <div className="mt-5 flex justify-end border-t border-slate-200 pt-4">
              <button type="button" onClick={() => setSelectedSetting(null)} className="mr-3 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={saveSelectedSetting} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Save Changes</button>
            </div>
          </section>
        );

      case 'notification':
        return (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Notification Settings</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">Configure Notification Rules</h3>
              </div>
              <button type="button" onClick={() => setSelectedSetting(null)} className="text-sm font-medium text-slate-500 hover:text-slate-700">Close</button>
            </div>

            <div className="space-y-4">
              <ToggleField label="New Request Notification" checked={form.newRequest} onToggle={(value) => updateField('newRequest', value)} />
              <ToggleField label="Cleared Notification" checked={form.requestCleared} onToggle={(value) => updateField('requestCleared', value)} />
              <ToggleField label="Rejected Notification" checked={form.requestRejected} onToggle={(value) => updateField('requestRejected', value)} />
              <ToggleField label="Clearance Completed Notification" checked={form.clearanceCompleted} onToggle={(value) => updateField('clearanceCompleted', value)} />
              <ToggleField label="Certificate Available Notification" checked={form.certificateAvailable} onToggle={(value) => updateField('certificateAvailable', value)} />
              <ToggleField label="Email Notification Enable / Disable" checked={form.emailNotification} onToggle={(value) => updateField('emailNotification', value)} />
              <ToggleField label="In-App Notification Enable / Disable" checked={form.inAppNotification} onToggle={(value) => updateField('inAppNotification', value)} />
            </div>

            <div className="mt-5 flex justify-end border-t border-slate-200 pt-4">
              <button type="button" onClick={() => setSelectedSetting(null)} className="mr-3 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={saveSelectedSetting} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Save Changes</button>
            </div>
          </section>
        );

      case 'certificate':
        return (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-700">Certificate Settings</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">Configure Clearance Certificate</h3>
              </div>
              <button type="button" onClick={() => setSelectedSetting(null)} className="text-sm font-medium text-slate-500 hover:text-slate-700">Close</button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Certificate Prefix"><input value={form.certificatePrefix} onChange={(e) => updateField('certificatePrefix', e.target.value)} /></Field>
              <Field label="Certificate Template"><select value={form.template} onChange={(e) => updateField('template', e.target.value)}><option>BDU Standard Certificate</option><option>Academic Certificate</option><option>Professional Certificate</option></select></Field>
              <Field label="Authorized Signatory"><input value={form.authorizedSignatory} onChange={(e) => updateField('authorizedSignatory', e.target.value)} /></Field>
              <Field label="Certificate Number Format"><input value={form.certificateNumberFormat} onChange={(e) => updateField('certificateNumberFormat', e.target.value)} /></Field>
              <div className="md:col-span-2">
                <ToggleField label="Auto Generate Certificate" checked={form.autoGenerate} onToggle={(value) => updateField('autoGenerate', value)} />
                <div className="mt-3">
                  <ToggleField label="Enable QR Verification" checked={form.qrVerification} onToggle={(value) => updateField('qrVerification', value)} />
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end border-t border-slate-200 pt-4">
              <button type="button" onClick={() => setSelectedSetting(null)} className="mr-3 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={saveSelectedSetting} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Save Changes</button>
            </div>
          </section>
        );

      case 'security':
        return (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700">Security Settings</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">Configure Security Rules</h3>
              </div>
              <button type="button" onClick={() => setSelectedSetting(null)} className="text-sm font-medium text-slate-500 hover:text-slate-700">Close</button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Minimum Password Length"><input type="number" value={form.minimumPasswordLength} onChange={(e) => updateField('minimumPasswordLength', Number(e.target.value))} /></Field>
              <Field label="Max Failed Attempts"><input type="number" value={form.maxFailedAttempts} onChange={(e) => updateField('maxFailedAttempts', Number(e.target.value))} /></Field>
              <Field label="Account Lock Duration"><input value={form.accountLockDuration} onChange={(e) => updateField('accountLockDuration', e.target.value)} /></Field>
              <Field label="Session Timeout"><input value={form.sessionTimeout} onChange={(e) => updateField('sessionTimeout', e.target.value)} /></Field>
              <div className="md:col-span-2">
                <ToggleField label="Require Password Change on First Login" checked={form.passwordChangeOnFirstLogin} onToggle={(value) => updateField('passwordChangeOnFirstLogin', value)} />
                <div className="mt-3"><ToggleField label="Require Uppercase / Number / Special Character" checked={form.requireUppercase} onToggle={(value) => updateField('requireUppercase', value)} /></div>
              </div>
            </div>

            <div className="mt-5 flex justify-end border-t border-slate-200 pt-4">
              <button type="button" onClick={() => setSelectedSetting(null)} className="mr-3 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={saveSelectedSetting} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Save Changes</button>
            </div>
          </section>
        );

      case 'backup':
        return (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Backup & Maintenance</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">Backup and Maintenance Settings</h3>
              </div>
              <button type="button" onClick={() => setSelectedSetting(null)} className="text-sm font-medium text-slate-500 hover:text-slate-700">Close</button>
            </div>

            <div className="space-y-5">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">Database Backup</p>
                <button type="button" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Create Backup</button>
              </div>

              <Field label="Automatic Backup Schedule"><select value={form.backupSchedule} onChange={(e) => updateField('backupSchedule', e.target.value)}><option>Daily</option><option>Weekly</option><option>Monthly</option></select></Field>

              <div className="rounded-lg border border-slate-200 p-4">
                <p className="mb-2 text-sm font-semibold text-slate-700">Backup History</p>
                <div className="space-y-2">
                  {form.backupHistory.map((item) => (
                    <div key={item} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <span>{item}</span>
                      <button type="button" className="text-xs font-medium text-blue-700 hover:text-blue-900">Restore</button>
                    </div>
                  ))}
                </div>
              </div>

              <ToggleField label="Maintenance Mode" checked={form.maintenanceMode} onToggle={(value) => updateField('maintenanceMode', value)} />
            </div>

            <div className="mt-5 flex justify-end border-t border-slate-200 pt-4">
              <button type="button" onClick={() => setSelectedSetting(null)} className="mr-3 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={saveSelectedSetting} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Save Changes</button>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 text-xs font-sans pb-10">
      {loading && <div className="px-6 py-2 bg-blue-50 text-blue-700">Loading settings...</div>}
      {message && <div className="px-6 py-2 bg-emerald-50 text-emerald-700">{message}</div>}

      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <button type="button" className="rounded-md p-2 text-slate-700 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800">System Settings</h1>
            <p className="text-[11px] text-slate-400">Configure and manage the system settings and preferences</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <BellRing size={18} className="text-slate-600" />
            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">8</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white">SA</div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-800">System Admin</p>
              <p className="text-[10px] text-slate-400">System Administrator</p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-6 py-6">
        <div className="grid gap-5 xl:grid-cols-3">
          <SettingCard
            icon={<Settings size={16} className="text-blue-600" />}
            title="General Settings"
            description="Configure basic information about the university and system."
            featureList={['University information', 'System name and logo', 'Contact information', 'Date, time and language settings']}
            buttonLabel="Manage Settings"
            buttonClassName="bg-blue-600 hover:bg-blue-700 text-white"
            accent="blue"
            onClick={() => setSelectedSetting('general')}
          />

          <SettingCard
            icon={<FileCheck size={16} className="text-emerald-600" />}
            title="Clearance Settings"
            description="Configure employee clearance process and workflow."
            featureList={['Required clearance offices', 'Clearance workflow order', 'Request & approval settings', 'Auto-complete options']}
            buttonLabel="Manage Settings"
            buttonClassName="border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"
            accent="emerald"
            onClick={() => setSelectedSetting('clearance')}
          />

          <SettingCard
            icon={<Bell size={16} className="text-amber-500" />}
            title="Notification Settings"
            description="Configure system notifications and email preferences."
            featureList={['Email notifications', 'In-app notifications', 'Notification templates', 'Alert preferences']}
            buttonLabel="Manage Settings"
            buttonClassName="bg-blue-600 hover:bg-blue-700 text-white"
            accent="amber"
            onClick={() => setSelectedSetting('notification')}
          />

          <SettingCard
            icon={<FileCheck size={16} className="text-pink-600" />}
            title="Certificate Settings"
            description="Manage clearance certificate templates and options."
            featureList={['Certificate template', 'Logo and signature', 'Certificate number format', 'QR code / verification options']}
            buttonLabel="Manage Settings"
            buttonClassName="border border-pink-300 bg-white text-pink-700 hover:bg-pink-50"
            accent="pink"
            onClick={() => setSelectedSetting('certificate')}
          />

          <SettingCard
            icon={<Shield size={16} className="text-red-500" />}
            title="Security Settings"
            description="Configure security policies and authentication rules."
            featureList={['Password policy', 'Login attempt limits', 'Session timeout', 'First login password change']}
            buttonLabel="Manage Settings"
            buttonClassName="border border-red-300 bg-white text-red-700 hover:bg-red-50"
            accent="red"
            onClick={() => setSelectedSetting('security')}
          />

          <SettingCard
            icon={<Database size={16} className="text-cyan-600" />}
            title="Backup & Maintenance"
            description="Manage database backup and system maintenance."
            featureList={['Create database backup', 'Backup history', 'Restore backup', 'Maintenance mode']}
            buttonLabel="Manage Settings"
            buttonClassName="bg-blue-600 hover:bg-blue-700 text-white"
            accent="cyan"
            onClick={() => setSelectedSetting('backup')}
          />
        </div>

        {renderDetailForm()}

        <div className="mt-6 rounded-xl border border-slate-200 bg-amber-50 px-4 py-3 text-sm text-slate-700 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5m0 4h.01" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-slate-800">Note</p>
              <p className="mt-1 text-xs text-slate-600">System settings apply across the entire system. Please update these settings carefully.</p>
            </div>
          </div>
        </div>
      </main>

      <button
        type="button"
        aria-label="Back to top"
        className="fixed bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-white shadow-lg transition hover:bg-slate-700"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 19V5m0 0l-6 6m6-6l6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

function SettingCard({ icon, title, description, featureList, buttonLabel, buttonClassName, accent, onClick }) {
  const accentColors = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    pink: 'bg-pink-50 text-pink-700',
    red: 'bg-red-50 text-red-700',
    cyan: 'bg-cyan-50 text-cyan-700',
  };

  return (
    <div className="flex min-h-[260px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <div className="mb-3 flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentColors[accent] || accentColors.blue}`}>
            {icon}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">{title}</h2>
          </div>
        </div>

        <p className="mb-3 text-xs text-slate-500">{description}</p>

        <ul className="space-y-2">
          {featureList.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={onClick}
        className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition ${buttonClassName}`}
      >
        {buttonLabel}
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function ToggleField({ label, checked, onToggle }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <button
        type="button"
        onClick={() => onToggle(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}
        aria-label={label}
      >
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}

function ToggleRow({ label, enabled, onToggle }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-slate-600">{label}</span>
      <button
        type="button"
        onClick={onToggle}
        className={`w-8 h-4 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
      >
        <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${enabled ? 'translate-x-4' : ''}`} />
      </button>
    </div>
  );
}

function PermissionItem({ text }) {
  return (
    <div className="flex items-center space-x-1.5 text-emerald-600">
      <CheckCircle size={11} className="shrink-0" />
      <span className="text-slate-700 text-[10px]">{text}</span>
    </div>
  );
}

function OrgRow({ label, val }) {
  return (
    <div className="flex items-center justify-between py-0.5 border-b border-slate-50">
      <span className="text-slate-600">{label}</span>
      <div className="flex items-center space-x-3">
        <span className="font-bold text-slate-800">{val}</span>
        <button className="border border-slate-200 px-2 py-0.5 rounded text-[9px] font-semibold text-slate-600 hover:bg-slate-50">Manage</button>
      </div>
    </div>
  );
}

function StatusConfigRow({ color, label }) {
  return (
    <div className="flex justify-between items-center py-0.5 border-b border-slate-50">
      <div className="flex items-center space-x-1.5">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-slate-700">{label}</span>
      </div>
      <div className="flex gap-1 text-slate-400">
        <Edit size={10} className="hover:text-blue-600 cursor-pointer" />
        <Trash2 size={10} className="hover:text-red-500 cursor-pointer" />
      </div>
    </div>
  );
}