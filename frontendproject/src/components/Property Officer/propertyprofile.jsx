import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Camera, KeyRound, LockKeyhole } from 'lucide-react';

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function PropertyProfile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ fullName: '', email: '', phoneNumber: '', profileImage: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [message, setMessage] = useState('');
  const photoInputRef = useRef(null);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/property/profile/me', { headers: { Authorization: `Bearer ${token}` } });
      const data = response.data.profile;
      setProfile(data);
      setForm({
        fullName: data.fullName || data.name || '',
        email: data.email || '',
        phoneNumber: data.phoneNumber || data.phone || '',
        profileImage: data.profileImage || data.photo || ''
      });
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put('/api/property/profile/me', form, { headers: { Authorization: `Bearer ${token}` } });
      setProfile(response.data.profile);
      setForm((current) => ({ ...current, fullName: response.data.profile.fullName || response.data.profile.name || '' }));
      setEditing(false);
      setMessage('Profile updated successfully.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const changePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage('Please select an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      setPhotoSaving(true);
      setMessage('');
      try {
        const token = localStorage.getItem('token');
        const response = await axios.put('/api/property/profile/me', { profileImage: reader.result }, { headers: { Authorization: `Bearer ${token}` } });
        setProfile(response.data.profile);
        setForm((current) => ({ ...current, profileImage: reader.result }));
        setMessage('Profile photo updated successfully.');
      } catch (error) {
        setMessage(error.response?.data?.message || 'Unable to update profile photo.');
      } finally {
        setPhotoSaving(false);
        if (photoInputRef.current) photoInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage('New password and confirmation do not match.');
      return;
    }
    if (passwords.newPassword.length < 6) {
      setMessage('New password must be at least 6 characters.');
      return;
    }
    setChangingPassword(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/profile/${profile?._id}/password`, {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      }, { headers: { Authorization: `Bearer ${token}` } });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage('Password changed successfully.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const value = (field, fallback = 'N/A') => profile?.[field] || fallback;
  const profileImage = profile?.profileImage || profile?.photo || '';
  const profileInitial = (profile?.fullName || profile?.name || 'P').charAt(0).toUpperCase();

  if (loading) return <div className="p-8 text-center text-slate-500 text-xs">Loading profile...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-xs text-slate-800 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Property Officer Profile</h1>
            <p className="text-slate-500">Manage your account and personal information</p>
          </div>
          <button type="button" onClick={() => setEditing(!editing)} className="rounded bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800">
            {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        </header>

        {message && <div className="rounded border border-teal-200 bg-teal-50 p-3 font-semibold text-teal-800">{message}</div>}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-teal-100 text-2xl font-bold text-teal-800 ring-4 ring-teal-50">
              {profileImage ? <img src={profileImage} alt="Profile" className="h-full w-full object-cover" /> : profileInitial}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{value('fullName', value('name'))}</h2>
              <p className="font-semibold text-teal-700">Property / Asset Officer</p>
              <p className="text-slate-500">Employee ID: {value('employeeId')}</p>
              <button type="button" onClick={() => photoInputRef.current?.click()} disabled={photoSaving} className="mt-3 inline-flex items-center gap-1.5 rounded border border-teal-200 px-3 py-2 font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-60"><Camera size={14} /> {photoSaving ? 'Uploading...' : 'Change Photo'}</button>
              <input ref={photoInputRef} type="file" accept="image/*" onChange={changePhoto} className="hidden" />
            </div>
          </div>
        </section>

        <form onSubmit={saveProfile} className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 border-b border-slate-100 pb-2 text-sm font-bold">Personal Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Editable label="Full Name" value={form.fullName} editing={editing} onChange={(value) => setForm({ ...form, fullName: value })} />
              <ReadOnly label="Employee ID" value={value('employeeId')} />
              <Editable label="Phone Number" value={form.phoneNumber} editing={editing} onChange={(value) => setForm({ ...form, phoneNumber: value })} />
              <Editable label="Email Address" value={form.email} editing={editing} onChange={(value) => setForm({ ...form, email: value })} />
              <ReadOnly label="Username" value={value('username', value('email'))} />
              <ReadOnly label="Role" value="Property / Asset Officer" />
              <ReadOnly label="Status" value={value('status', 'Active')} />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 border-b border-slate-100 pb-2 text-sm font-bold">Employee Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnly label="Department" value={value('department')} />
              <ReadOnly label="Position" value={value('position', 'Property / Asset Officer')} />
              <ReadOnly label="Campus" value={value('campus')} />
              <ReadOnly label="Department" value={value('department')} />
              <ReadOnly label="Account Status" value={value('status', 'Active')} />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-4 border-b border-slate-100 pb-2 text-sm font-bold">Account Information</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <ReadOnly label="Last Login" value={formatDate(value('lastLogin', ''))} />
              <ReadOnly label="Account Status" value={value('status', 'Active')} />
              <ReadOnly label="Two-Factor Authentication" value={profile?.twoFactorEnabled ? 'Enabled' : 'Not enabled'} />
            </div>
            {editing && <div className="mt-5 text-right"><button disabled={saving} className="rounded bg-teal-700 px-5 py-2 font-semibold text-white hover:bg-teal-800">{saving ? 'Saving...' : 'Save Changes'}</button></div>}
          </section>
        </form>

        <form onSubmit={changePassword} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-2"><LockKeyhole size={17} className="text-teal-700" /><h2 className="text-sm font-bold">Security</h2></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <PasswordInput label="Current Password" value={passwords.currentPassword} onChange={(value) => setPasswords({ ...passwords, currentPassword: value })} />
            <PasswordInput label="New Password" value={passwords.newPassword} onChange={(value) => setPasswords({ ...passwords, newPassword: value })} />
            <PasswordInput label="Confirm New Password" value={passwords.confirmPassword} onChange={(value) => setPasswords({ ...passwords, confirmPassword: value })} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-3"><p className="text-[10px] text-slate-500">Use at least 6 characters for your new password.</p><button type="submit" disabled={changingPassword} className="inline-flex items-center gap-1.5 rounded bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"><KeyRound size={14} /> {changingPassword ? 'Changing...' : 'Change Password'}</button></div>
        </form>
      </div>
    </div>
  );
}

function ReadOnly({ label, value }) {
  return <div><p className="mb-1 text-[10px] font-semibold text-slate-400">{label}</p><p className="font-semibold text-slate-800">{value || 'N/A'}</p></div>;
}

function Editable({ label, value, editing, onChange }) {
  return <div><p className="mb-1 text-[10px] font-semibold text-slate-400">{label}</p>{editing ? <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded border border-slate-300 p-2" /> : <p className="font-semibold text-slate-800">{value || 'N/A'}</p>}</div>;
}

function PasswordInput({ label, value, onChange }) {
  return <label className="block"><span className="mb-1 block text-[10px] font-semibold text-slate-500">{label}</span><input type="password" value={value} onChange={(event) => onChange(event.target.value)} required className="w-full rounded border border-slate-300 p-2 outline-none focus:border-teal-500" /></label>;
}
