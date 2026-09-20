import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/authContext';
import {
  Bell,
  Monitor,
  Globe,
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
    returnedResubmitted: true,
    clearanceStatusUpdate: true,
    reportRequest: true
  });

  const [displayPreferences, setDisplayPreferences] = useState({
    itemsPerPage: 10,
    defaultRequestFilter: 'Pending'
  });

  const [language, setLanguage] = useState('English');

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
          setNotificationPreferences(res.data.notificationPreferences || {
            newClearanceRequest: true,
            returnedResubmitted: true,
            clearanceStatusUpdate: true,
            reportRequest: true
          });
          setDisplayPreferences(res.data.displayPreferences || {
            itemsPerPage: 10,
            defaultRequestFilter: 'Pending'
          });
          setLanguage(res.data.language || 'English');
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

  // Save Settings Handler
  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      await axios.put(`http://localhost:3000/api/library-settings/${userId}`, {
        notificationPreferences,
        displayPreferences,
        language
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
              { id: 'returnedResubmitted', label: 'Returned / Resubmitted' },
              { id: 'clearanceStatusUpdate', label: 'Clearance Status Update' },
              { id: 'reportRequest', label: 'Report Request' }
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
        </div>

        {/* 2. Display Preferences */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center space-x-2">
            <Monitor size={16} className="text-teal-700" />
            <h2 className="font-bold text-slate-900 text-xs">Display Preferences</h2>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                Items Per Page
              </label>
              <select
                value={displayPreferences.itemsPerPage}
                onChange={(e) =>
                  setDisplayPreferences((prev) => ({
                    ...prev,
                    itemsPerPage: Number(e.target.value)
                  }))
                }
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg p-2 font-medium focus:ring-1 focus:ring-teal-600 focus:outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                Default Request Filter
              </label>
              <select
                value={displayPreferences.defaultRequestFilter}
                onChange={(e) =>
                  setDisplayPreferences((prev) => ({
                    ...prev,
                    defaultRequestFilter: e.target.value
                  }))
                }
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg p-2 font-medium focus:ring-1 focus:ring-teal-600 focus:outline-none"
              >
                <option value="All">All</option>
                <option value="Pending">Pending</option>
                <option value="Under Review">Under Review</option>
                <option value="Approved">Approved</option>
                <option value="Returned">Returned</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Language Preferences */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center space-x-2">
            <Globe size={16} className="text-teal-700" />
            <h2 className="font-bold text-slate-900 text-xs">Language</h2>
          </div>
          <div className="p-5">
            <div className="max-w-xs">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                System Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg p-2 font-medium focus:ring-1 focus:ring-teal-600 focus:outline-none"
              >
                <option value="English">English</option>
                <option value="Amharic">አማርኛ (Amharic)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveChanges}
            disabled={saving}
            className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold flex items-center space-x-2 shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}