import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ChevronRight, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import { useAdminLanguage } from './AdminLanguage';

export default function SystemAdminChangePassword() {
  const { t } = useAdminLanguage();
  const { user } = useAuth();
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const response = await axios.patch(`http://localhost:3000/api/profile/${user._id}/password`, {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage({ type: 'success', text: response.data.message || 'Password changed successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to change password.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-md rounded-xl border border-slate-100 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="border-b border-slate-100 pb-4">
          <p className="text-[10px] font-bold uppercase text-indigo-600">{t('Account')}</p>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-bold text-slate-900"><KeyRound size={19} className="text-indigo-600" />{t('Change Password')}</h1>
          <p className="mt-1 text-xs text-slate-500">{t('Update your account password.')}</p>
        </div>

        <form onSubmit={handleSubmit} className="pt-4">
          <div className="space-y-3.5">
            <PasswordField label="Current Password" name="currentPassword" value={passwords.currentPassword} onChange={(value) => setPasswords((current) => ({ ...current, currentPassword: value }))} minLength={1} autoComplete="current-password" />
            <PasswordField label="New Password" name="newPassword" value={passwords.newPassword} onChange={(value) => setPasswords((current) => ({ ...current, newPassword: value }))} minLength={6} autoComplete="new-password" />
            <PasswordField label="Confirm New Password" name="confirmPassword" value={passwords.confirmPassword} onChange={(value) => setPasswords((current) => ({ ...current, confirmPassword: value }))} minLength={6} autoComplete="new-password" />
          </div>

          {message && <p role="status" className={`mt-4 rounded-md px-3 py-2 text-xs ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{t(message.text)}</p>}

          <button type="submit" disabled={saving} className="mt-5 inline-flex items-center justify-center rounded-md bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">
            {t(saving ? 'Changing Password...' : 'Change Password')}
          </button>
        </form>
      </div>

      <div className="mx-auto mt-4 flex max-w-md items-center justify-between text-xs text-slate-500">
        <Link to="/admin/profile" className="inline-flex items-center gap-1 hover:text-indigo-700">{t('Dashboard')} <ChevronRight size={12} /> {t('Profile')}</Link>
      </div>
    </main>
  );
}

function PasswordField({ label, name, value, onChange, minLength, autoComplete }) {
  const { t } = useAdminLanguage();
  return (
    <label className="block text-[11px] font-semibold text-slate-700">
      {t(label)}
      <input
        name={name}
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        className="mt-1 block h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}