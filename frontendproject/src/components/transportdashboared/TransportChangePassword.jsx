import React, { useState } from 'react';
import axios from 'axios';
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/authContext';

const passwordUrl = (userId) => `http://localhost:3000/api/profile/${userId}/password`;
const authConfig = () => ({
  headers: { Authorization: `******'token') || ''}` },
});

const initialForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export default function TransportChangePassword() {
  const { user } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [visibleFields, setVisibleFields] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submitPasswordChange = async (event) => {
    event.preventDefault();
    setMessage(null);
    if (!user?._id) {
      setMessage({ type: 'error', text: 'Unable to identify the signed-in Transport Officer.' });
      return;
    }
    if (form.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setSaving(true);
    try {
      const response = await axios.patch(passwordUrl(user._id), {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      }, authConfig());
      setForm(initialForm);
      setMessage({ type: 'success', text: response.data?.message || 'Password changed successfully.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Unable to update your password.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center py-5">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Link to="/transport-office" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-indigo-700">
          <ArrowLeft size={16} />Back to Dashboard
        </Link>

        <div className="mt-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <Shield size={30} fill="currentColor" className="stroke-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Change Password</h1>
          <p className="mt-1 text-sm text-slate-500">Update your account password to keep it secure.</p>
        </div>

        <form onSubmit={submitPasswordChange} className="mt-6 space-y-4">
          {[
            { name: 'currentPassword', label: 'Current Password', placeholder: 'Enter current password' },
            { name: 'newPassword', label: 'New Password', placeholder: 'Enter new password' },
            { name: 'confirmPassword', label: 'Confirm New Password', placeholder: 'Confirm new password' },
          ].map(({ name, label, placeholder }) => (
            <label key={name} className="block text-sm font-semibold text-slate-700">
              {label}
              <span className="relative mt-2 block">
                <LockKeyhole size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  name={name}
                  type={visibleFields[name] ? 'text' : 'password'}
                  value={form[name]}
                  onChange={updateField}
                  placeholder={placeholder}
                  autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'}
                  required
                  minLength={name === 'currentPassword' ? undefined : 6}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-sm font-normal text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={() => setVisibleFields((current) => ({ ...current, [name]: !current[name] }))}
                  aria-label={visibleFields[name] ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:text-slate-700"
                >
                  {visibleFields[name] ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>
          ))}

          {message && (
            <p role={message.type === 'error' ? 'alert' : 'status'} className={`rounded-lg px-3 py-2.5 text-sm ${message.type === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {message.text}
            </p>
          )}

          <button type="submit" disabled={saving} className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
            {saving ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </section>
    </main>
  );
}
