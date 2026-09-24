import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/authContext';
import {
  Bell,
  ClipboardCheck,
  Mail,
  Save,
  CheckCircle,
  Settings as SettingsIcon,
  Loader2
} from 'lucide-react';

export default function LibrarySettings() {
  const { user } = useAuth();
  const userId = user?._id || user?.id || localStorage.getItem('userId') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Settings State
  const [notificationPreferences, setNotificationPreferences] = useState({
    newClearanceRequest: true,
    resubmittedClearance: true,
    verificationRequired: true,
    clearanceApproved: true,
    clearanceReturned: true,
    employeeInformationUpdated: true,
    systemNotifications: true
  });

  const [clearanceChecklist, setClearanceChecklist] = useState({
    borrowedBooksChecked: true,
    unreturnedBooksChecked: true,
    outstandingMaterialsChecked: true,
    lostDamagedMaterialsChecked: true,
    libraryAccountChecked: true
  });
  const [deliveryPreferences, setDeliveryPreferences] = useState({ inSystemNotifications: true, emailNotifications: true });

  // Settings መረጃ መሳብ
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        if (!userId) {
          setLoading(false);
          return;
        }

        const res = await axios.get(`http://localhost:3000/api/library-settings/${userId}`);
        if (res.data) {
          setNotificationPreferences((current) => ({ ...current, ...(res.data.notificationPreferences || {}) }));
          setClearanceChecklist((current) => ({ ...current, ...(res.data.clearanceChecklist || {}) }));
          setDeliveryPreferences((current) => ({ ...current, ...(res.data.deliveryPreferences || {}) }));
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [userId]);

  // Toggle Handler for Notifications
  const handleToggle = (key) => {
    setNotificationPreferences((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleToggleChecklist = (key) => {
    setClearanceChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Save Settings Handler
  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      await axios.put(`http://localhost:3000/api/library-settings/${userId}`, {
        notificationPreferences,
        clearanceChecklist,
        deliveryPreferences
      });
      setToastMessage('Settings saved successfully!');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-500">
        <Loader2 className="animate-spin mr-2" size={20} />
        <span>Loading Settings...</span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-xs text-slate-700">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-teal-50 rounded-lg text-teal-700">
              <SettingsIcon size={20} />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">Settings</h1>
              <p className="text-[11px] text-slate-500">
                Manage your personal workspace preferences and notification alerts.
              </p>
            </div>
          </div>

          {toastMessage && (
            <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 font-semibold animate-fade-in">
              <CheckCircle size={14} />
              <span>{toastMessage}</span>
            </div>
          )}
        </div>

        {/* 1. Notification Preferences */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center space-x-2">
            <Bell size={16} className="text-teal-700" />
            <h2 className="font-bold text-slate-900 text-xs">Notification Preferences</h2>
          </div>
          <div className="p-5 space-y-4">
            {[
              { id: 'newClearanceRequest', label: 'New Clearance Request' },
              { id: 'resubmittedClearance', label: 'Employee Resubmitted Request' },
              { id: 'verificationRequired', label: 'Library Verification Required' },
              { id: 'clearanceApproved', label: 'Clearance Approved' },
              { id: 'clearanceReturned', label: 'Clearance Returned' },
              { id: 'employeeInformationUpdated', label: 'Employee Updated Information' },
              { id: 'systemNotifications', label: 'System Notifications' }
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between py-1">
                <span className="font-medium text-slate-700">{item.label}</span>
                <button
                  onClick={() => handleToggle(item.id)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    notificationPreferences[item.id] ? 'bg-teal-700' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${
                      notificationPreferences[item.id] ? 'translate-x-4.5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-end border-t border-slate-100 px-5 py-3"><SaveButton label="Save Changes" saving={saving} onClick={handleSaveChanges} /></div>
        </div>

        <SettingsSection icon={ClipboardCheck} title="Library Clearance Checklist" description="Choose the checks Library Officers must complete during library clearance review.">
          <div className="space-y-1">{[
            ['borrowedBooksChecked', 'Borrowed Books Checked'],
            ['unreturnedBooksChecked', 'Unreturned Books Checked'],
            ['outstandingMaterialsChecked', 'Outstanding Materials Checked'],
            ['lostDamagedMaterialsChecked', 'Lost / Damaged Materials Checked'],
            ['libraryAccountChecked', 'Library Account Checked']
          ].map(([key, label]) => <ToggleRow key={key} label={label} checked={clearanceChecklist[key]} onChange={() => handleToggleChecklist(key)} />)}</div>
          <SaveButton label="Save Checklist" saving={saving} onClick={handleSaveChanges} />
        </SettingsSection>

        <SettingsSection icon={Mail} title="Notification Delivery" description="Choose where Library Officer notifications are delivered.">
          <div className="space-y-1">{[
            ['inSystemNotifications', 'In-System Notification'],
            ['emailNotifications', 'Email Notification']
          ].map(([key, label]) => <ToggleRow key={key} label={label} checked={deliveryPreferences[key]} onChange={() => setDeliveryPreferences((current) => ({ ...current, [key]: !current[key] }))} />)}</div>
          <SaveButton label="Save Changes" saving={saving} onClick={handleSaveChanges} />
        </SettingsSection>

      </div>
    </div>
  );
}

function SettingsSection({ icon: Icon, title, description, children }) {
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/70 px-5 py-3.5"><Icon size={16} className="text-teal-700" /><div><h2 className="text-xs font-bold text-slate-900">{title}</h2><p className="mt-1 text-[10px] text-slate-500">{description}</p></div></div><div className="p-5">{children}</div></section>;
}

function ToggleRow({ label, checked, onChange }) {
  return <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0"><span className="font-medium text-slate-700">{label}</span><button type="button" role="switch" aria-checked={Boolean(checked)} onClick={onChange} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-teal-700' : 'bg-slate-300'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>;
}

function SaveButton({ label, saving, onClick }) {
  return <button type="button" onClick={onClick} disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white shadow-sm transition-colors hover:bg-teal-800 disabled:opacity-50">{saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}{saving ? 'Saving...' : label}</button>;
}