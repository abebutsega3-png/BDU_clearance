import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  Activity,
  Bell,
  Building2,
  ChevronRight,
  Clock3,
  FileCheck2,
  LoaderCircle,
  LogOut,
  Shield,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/authContext';

const settingsUrl = 'http://localhost:3000/api/department-head/settings';
const defaultPreferences = {
  newClearanceRequest: true,
  requestResubmitted: true,
  approvalNotifications: true,
};

const getAuthConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
});

const errorMessage = (error) => error.response?.data?.message
  || error.message
  || 'Unable to complete this action.';

const formatDate = (value) => {
  if (!value) return 'No sign-in recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const browserName = (userAgent = '') => {
  if (/Edg\//i.test(userAgent)) return 'Microsoft Edge';
  if (/Firefox\//i.test(userAgent)) return 'Firefox';
  if (/Chrome\//i.test(userAgent)) return 'Google Chrome';
  if (/Safari\//i.test(userAgent) && !/Chrome/i.test(userAgent)) return 'Safari';
  return userAgent ? 'Other browser' : 'Unknown browser';
};

function NotificationSwitch({ label, description, checked, disabled, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 border-b border-slate-100 px-4 py-3.5 last:border-0">
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <FileCheck2 size={17} />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-slate-800">{label}</span>
          <span className="mt-0.5 block text-[10px] text-slate-500">{description}</span>
        </span>
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="peer sr-only"
      />
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600 ${checked ? 'bg-blue-600' : 'bg-slate-300'} ${disabled ? 'opacity-50' : ''}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
    </label>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold text-slate-600">{label}</label>
      <div className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
        <span className="truncate">{value || 'Not available'}</span>
        <Shield size={12} className="shrink-0 text-slate-400" aria-label="Read only" />
      </div>
    </div>
  );
}

export default function DepartmentSettings() {
  const { logout } = useAuth();
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [departmentInfo, setDepartmentInfo] = useState({});
  const [security, setSecurity] = useState({ lastLogin: null, activity: [] });
  const [loading, setLoading] = useState(true);
  const [savingPreference, setSavingPreference] = useState('');
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    axios.get(settingsUrl, getAuthConfig())
      .then(({ data }) => {
        if (!active) return;
        const settings = data.settings || {};
        const savedPreferences = settings.notificationPreferences || {};
        setPreferences({
          newClearanceRequest: savedPreferences.newClearanceRequest !== false,
          requestResubmitted: savedPreferences.requestResubmitted !== false,
          approvalNotifications: savedPreferences.approvalNotifications !== false,
        });
        setDepartmentInfo(settings.departmentInformation || {});
        setSecurity(settings.security || { lastLogin: null, activity: [] });
      })
      .catch((requestError) => {
        if (active) setError(errorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const updatePreference = async (key) => {
    const nextValue = !preferences[key];
    const nextPreferences = { ...preferences, [key]: nextValue };
    setPreferences(nextPreferences);
    setSavingPreference(key);
    setError('');
    setMessage('');
    try {
      await axios.put(settingsUrl, {
        notificationPreferences: nextPreferences,
      }, getAuthConfig());
      setMessage('Notification preferences saved.');
    } catch (requestError) {
      setPreferences((current) => ({ ...current, [key]: !nextValue }));
      setError(errorMessage(requestError));
    } finally {
      setSavingPreference('');
    }
  };

  const logoutAllDevices = async () => {
    if (!window.confirm('Sign out your account from all devices? You will need to sign in again on this device.')) return;
    setLoggingOutAll(true);
    setError('');
    try {
      await axios.post(`${settingsUrl}/logout-all-devices`, {}, getAuthConfig());
      logout();
    } catch (requestError) {
      setError(errorMessage(requestError));
      setLoggingOutAll(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-700">Department Head</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">Settings</h1>
          <p className="mt-1 text-xs text-slate-500">Manage notifications and review your department and account security information.</p>
        </header>

        {error && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button>
          </div>
        )}
        {message && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">{message}</div>}

        <section className="overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm">
          <header className="border-b border-blue-100 bg-blue-50/70 px-4 py-3">
            <h2 className="flex items-center gap-2 text-xs font-bold text-slate-800"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">2</span><Bell size={15} className="text-blue-700" />Notification Settings</h2>
            <p className="mt-1 pl-7 text-[10px] text-slate-500">Choose which notifications you want to receive.</p>
          </header>
          {loading ? (
            <div role="status" className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500"><LoaderCircle size={15} className="animate-spin" />Loading settings...</div>
          ) : (
            <>
              <NotificationSwitch
                label="Clearance Request Notifications"
                description="Get notified when a new clearance request is submitted."
                checked={preferences.newClearanceRequest}
                disabled={Boolean(savingPreference)}
                onChange={() => updatePreference('newClearanceRequest')}
              />
              <NotificationSwitch
                label="Return/Resubmission Notifications"
                description="Get notified when a request is returned or resubmitted by an employee."
                checked={preferences.requestResubmitted}
                disabled={Boolean(savingPreference)}
                onChange={() => updatePreference('requestResubmitted')}
              />
              <NotificationSwitch
                label="Approval Notifications"
                description="Get notified when a request is approved by the next office or HR."
                checked={preferences.approvalNotifications}
                disabled={Boolean(savingPreference)}
                onChange={() => updatePreference('approvalNotifications')}
              />
            </>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm">
          <header className="border-b border-blue-100 bg-blue-50/70 px-4 py-3">
            <h2 className="flex items-center gap-2 text-xs font-bold text-slate-800"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">3</span><Building2 size={15} className="text-blue-700" />Department Information</h2>
            <p className="mt-1 pl-7 text-[10px] text-slate-500">Your department details (read only).</p>
          </header>
          <div className="grid gap-3 p-4 sm:grid-cols-3">
            <ReadOnlyField label="Department Name" value={departmentInfo.departmentName} />
            <ReadOnlyField label="Department Head" value={departmentInfo.departmentHead} />
            <ReadOnlyField label="Position" value={departmentInfo.position} />
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm">
          <header className="border-b border-blue-100 bg-blue-50/70 px-4 py-3">
            <h2 className="flex items-center gap-2 text-xs font-bold text-slate-800"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">4</span><Shield size={15} className="text-blue-700" />Security</h2>
            <p className="mt-1 pl-7 text-[10px] text-slate-500">Monitor your account activity and manage your session.</p>
          </header>
          <div className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto] md:items-center">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700"><Clock3 size={15} /></span>
              <div><p className="text-[10px] font-semibold text-slate-700">Last Login</p><p className="mt-1 text-[11px] text-slate-600">{loading ? 'Loading...' : formatDate(security.lastLogin)}</p><p className="mt-0.5 text-[9px] text-slate-400">{security.activity?.[0]?.ipAddress ? `From ${security.activity[0].ipAddress}` : 'Your recent sign-in information'}</p></div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700"><Activity size={15} /></span>
              <div>
                <p className="text-[10px] font-semibold text-slate-700">Login Activity</p>
                <button type="button" onClick={() => setShowActivity((shown) => !shown)} className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 hover:underline">
                  {showActivity ? 'Hide Activity' : 'View Activity'} <ChevronRight size={12} className={showActivity ? 'rotate-90' : ''} />
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={logoutAllDevices}
              disabled={loggingOutAll || loading}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-red-300 px-3 py-2 text-left text-red-600 transition hover:bg-red-50 disabled:opacity-50 md:min-w-44"
            >
              {loggingOutAll ? <LoaderCircle size={14} className="animate-spin" /> : <LogOut size={14} />}
              <span><span className="block text-[10px] font-semibold">Logout from all devices</span><span className="block text-[8px]">This will log you out from all active sessions.</span></span>
            </button>
          </div>
          {showActivity && (
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
              <h3 className="mb-2 text-[10px] font-semibold text-slate-700">Recent sign-ins</h3>
              {security.activity?.length ? (
                <ul className="space-y-2">
                  {security.activity.map((entry, index) => (
                    <li key={`${entry.date}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 bg-white px-3 py-2 text-[10px]">
                      <span className="font-medium text-slate-700">{formatDate(entry.date)}</span>
                      <span className="text-slate-500">{browserName(entry.userAgent)}{entry.ipAddress ? ` · ${entry.ipAddress}` : ''}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-[10px] text-slate-500">No login activity has been recorded yet.</p>}
            </div>
          )}
        </section>

        <div className="flex justify-end">
          <Link to="/department-head/change-password" className="inline-flex items-center gap-2 text-[11px] font-semibold text-blue-700 hover:underline">
            Change Password <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </main>
  );
}
