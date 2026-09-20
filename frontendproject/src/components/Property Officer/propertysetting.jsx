import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/authContext';

export default function PropertySettings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Preferences Local State
  const [preferences, setPreferences] = useState({
    newClearanceRequest: true,
    requestResubmitted: true,
    assetReturn: true,
    actionRequired: true,
    systemNotification: true
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefMessage, setPrefMessage] = useState('');

  // Password Security Local State
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [changingPass, setChangingPass] = useState(false);
  const [passStatus, setPassStatus] = useState({ type: '', text: '' });

  // 1. Fetch User Settings & Profile on Load
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/property/settings/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          setProfile(response.data.profile);
          if (response.data.profile.notificationPreferences) {
            setPreferences({ ...preferences, ...response.data.profile.notificationPreferences });
          }
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [user]);

  // 2. Handle Notification Preference Toggle & Update DB
  const handleTogglePreference = (key) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    setPrefMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put('/api/property/settings/me', {
        notificationPreferences: preferences
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) setPrefMessage('Preferences updated successfully in database.');
    } catch (err) {
      setPrefMessage('❌ Failed to update preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  // 3. Handle Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setChangingPass(true);
    setPassStatus({ type: '', text: '' });

    if (passwords.newPassword !== passwords.confirmNewPassword) {
      setPassStatus({ type: 'error', text: 'New passwords do not match' });
      setChangingPass(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(`/api/profile/${user?._id || user?.id}/password`, {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setPassStatus({ type: 'success', text: 'Password updated successfully!' });
        setPasswords({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to update password';
      setPassStatus({ type: 'error', text: errorMsg });
    } finally {
      setChangingPass(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-slate-500 font-sans text-xs">Loading Settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-50 min-h-screen font-sans text-xs text-slate-800 space-y-6">
      
      {/* Header */}
      <div className="border-b border-slate-200 pb-3">
        <h1 className="text-base font-bold text-slate-900">⚙️ Settings</h1>
        <p className="text-slate-500">Manage your profile view, notification preferences, and account security.</p>
      </div>

      {/* 👤 1. Account / Preferences (Read-Only Organization Controls) */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
          <span>👤 Account Information</span>
          <span className="text-[10px] bg-slate-100 text-slate-500 font-normal px-2 py-0.5 rounded">Retrieved from DB</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Full Name</label>
            <input type="text" readOnly value={profile?.fullName || profile?.name || ''} className="w-full p-2 bg-slate-100 border border-slate-200 rounded font-semibold text-slate-800 cursor-not-allowed" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Email Address</label>
            <input type="text" readOnly value={profile?.email || ''} className="w-full p-2 bg-slate-100 border border-slate-200 rounded font-semibold text-slate-800 cursor-not-allowed" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Phone Number</label>
            <input type="text" readOnly value={profile?.phone || profile?.phoneNumber || 'N/A'} className="w-full p-2 bg-slate-100 border border-slate-200 rounded text-slate-700 cursor-not-allowed" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Assigned Role (View Only)</label>
            <input type="text" readOnly value={profile?.role || ''} className="w-full p-2 bg-amber-50 border border-amber-200 text-amber-950 font-bold rounded cursor-not-allowed" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Department (View Only)</label>
            <input type="text" readOnly value={profile?.department || ''} className="w-full p-2 bg-slate-100 border border-slate-200 rounded text-slate-700 cursor-not-allowed" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Campus (View Only)</label>
            <input type="text" readOnly value={profile?.campus || ''} className="w-full p-2 bg-slate-100 border border-slate-200 rounded text-slate-700 cursor-not-allowed" />
          </div>
        </div>
      </div>

      {/* 🔔 2. Notification Preferences */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b pb-2">🔔 Notification Settings</h2>
        
        {prefMessage && (
          <div className="text-[11px] p-2 rounded bg-slate-100 font-semibold">{prefMessage}</div>
        )}

        <div className="space-y-3">
          {[
            { key: 'newClearanceRequest', label: 'New Clearance Request Notifications' },
            { key: 'requestResubmitted', label: 'Clearance Request Resubmitted Notifications' },
            { key: 'assetReturn', label: 'Asset Return Update Notifications' },
            { key: 'actionRequired', label: 'Action Required Notifications' },
            { key: 'systemNotification', label: 'System Notifications' }
          ].map((item) => (
            <div key={item.key} className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="font-semibold text-slate-700">{item.label}</span>
              <button
                type="button"
                onClick={() => handleTogglePreference(item.key)}
                className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                  preferences[item.key]
                    ? 'bg-teal-700 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {preferences[item.key] ? 'ON' : 'OFF'}
              </button>
            </div>
          ))}
        </div>

        <div className="text-right pt-2">
          <button
            onClick={handleSavePreferences}
            disabled={savingPrefs}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded transition-all shadow-sm"
          >
            {savingPrefs ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>

      {/* 🔐 3. Security (Password Change) */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b pb-2">🔐 Security</h2>
        
        {passStatus.text && (
          <div className={`p-2 rounded text-[11px] font-semibold ${
            passStatus.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
          }`}>
            {passStatus.text}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Current Password *</label>
            <input
              type="password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">New Password *</label>
            <input
              type="password"
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Confirm New Password *</label>
            <input
              type="password"
              value={passwords.confirmNewPassword}
              onChange={(e) => setPasswords({ ...passwords, confirmNewPassword: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded bg-white"
              required
            />
          </div>

          <button
            type="submit"
            disabled={changingPass}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded transition-all shadow-sm"
          >
            {changingPass ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>
      </div>

    </div>
  );
}