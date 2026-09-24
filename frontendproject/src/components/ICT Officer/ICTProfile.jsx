import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertCircle, Briefcase, Edit3, Key, Lock, Mail, Phone, Save, Shield, Upload, User } from 'lucide-react';

const API_URL = 'http://localhost:3000/api/ict/profile';
const getAuthConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });

const formatDateTime = (value) => {
  if (!value) return 'Not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not provided' : date.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });
};

export default function ICTProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editForm, setEditForm] = useState({ name: '', phoneNumber: '', alternativePhone: '', email: '', profileImage: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_URL, getAuthConfig());
      const user = response.data?.user || response.data?.data || {};
      setProfile(user);
      setEditForm({ name: user.name || '', phoneNumber: user.phoneNumber || '', alternativePhone: user.alternativePhone || '', email: user.email || '', profileImage: user.profileImage || '' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to load ICT profile information.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const updateEditField = (event) => setEditForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const updatePasswordField = (event) => setPasswordForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Choose an image smaller than 2 MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setUploadingPhoto(true);
        const response = await axios.put(API_URL, { profileImage: reader.result }, getAuthConfig());
        const updatedUser = response.data?.user || {};
        setProfile((current) => ({ ...current, ...updatedUser, profileImage: updatedUser.profileImage || reader.result }));
        setEditForm((current) => ({ ...current, profileImage: updatedUser.profileImage || reader.result }));
        setMessage({ type: 'success', text: 'Profile photo uploaded successfully.' });
      } catch (error) {
        setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to upload profile photo.' });
      } finally {
        setUploadingPhoto(false);
        event.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.put(API_URL, editForm, getAuthConfig());
      const updatedUser = response.data?.user || profile;
      setProfile(updatedUser);
      setEditForm((current) => ({ ...current, profileImage: updatedUser?.profileImage || current.profileImage }));
      setEditing(false);
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to update profile information.' });
    }
  };

  const handleSavePassword = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }
    try {
      await axios.put(`${API_URL}/change-password`, { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }, getAuthConfig());
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setProfile((current) => ({ ...current, passwordChangedAt: new Date().toISOString() }));
      setChangingPassword(false);
      setMessage({ type: 'success', text: 'Password updated successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to change password.' });
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Loading ICT profile...</div>;

  const profileName = profile?.name || 'ICT Officer';
  const role = profile?.role || 'ICT Officer';
  const department = profile?.department || 'ICT';
  const campus = profile?.campus || 'Main Campus';
  const status = profile?.status || 'Active';
  const employeeId = profile?.employeeId || 'Not assigned';
  const phone = profile?.phoneNumber || 'Not provided';
  const email = profile?.email || 'Not provided';
  const username = profile?.username || profile?.email || 'Not provided';
  const photo = editForm.profileImage || profile?.profileImage;

  return (
    <div className="min-h-screen bg-[#f3f8fc] p-4 text-slate-800 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-center gap-2 text-sm text-slate-500"><span className="text-blue-600">Home</span><span>/</span><span>Profile</span></div>
        <div className="mb-5"><h1 className="text-2xl font-bold text-slate-900">My Profile</h1><p className="text-sm text-blue-700">View and manage your profile information</p></div>

        {message.text && <div className={`mb-5 flex items-center gap-2 rounded-lg border p-3 text-sm font-medium ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}><AlertCircle size={16} />{message.text}</div>}

        <section className="mb-5 rounded-xl border border-blue-100 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-5">
              <div className="flex shrink-0 flex-col items-center">
                <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-slate-100 bg-slate-100 shadow-inner">
                {photo ? <img src={photo} alt={profileName} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-blue-600">{profileName.charAt(0).toUpperCase()}</div>}
                </div>
                <label className={`mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 ${uploadingPhoto ? 'cursor-wait opacity-60' : ''}`}>
                  <Upload size={15} /> {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
                  <input type="file" accept="image/jpeg,image/png,image/gif" onChange={handlePhotoChange} disabled={uploadingPhoto} className="hidden" />
                </label>
                <p className="mt-2 whitespace-nowrap text-xs text-slate-500">JPG, PNG or GIF. Max size 2MB</p>
              </div>
              <div><h2 className="text-xl font-bold text-slate-900">{profileName}</h2><p className="mt-1 text-sm text-blue-700">{role}</p><p className="mt-1 text-sm text-slate-500">Bahir Dar University</p><div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600"><span className="inline-flex items-center gap-1.5"><Phone size={14} className="text-blue-600" />{phone}</span><span className="inline-flex items-center gap-1.5"><Mail size={14} className="text-blue-600" />{email}</span></div></div>
            </div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setEditing((current) => !current)} className="inline-flex items-center gap-2 rounded-lg border border-blue-500 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"><Edit3 size={15} />{editing ? 'Close Edit Profile' : 'Edit Profile'}</button><button type="button" onClick={() => setChangingPassword((current) => !current)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Lock size={15} />{changingPassword ? 'Close Security' : 'Change Password'}</button></div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <InfoSection icon={<User size={18} />} title="Personal Information">
            <InfoRow label="Full Name" value={profileName} /><InfoRow label="Employee ID" value={employeeId} /><InfoRow label="Phone Number" value={phone} /><InfoRow label="Email Address" value={email} />
          </InfoSection>
          <InfoSection icon={<Briefcase size={18} />} title="Work Information">
            <InfoRow label="Role" value={role} /><InfoRow label="Office" value="ICT Office" /><InfoRow label="Department" value={department} /><InfoRow label="Campus" value={campus} /><InfoRow label="Status" value={status} badge />
          </InfoSection>
          <InfoSection icon={<Shield size={18} />} title="Security Information">
            <InfoRow label="Username" value={username} /><InfoRow label="Last Login" value={formatDateTime(profile?.lastLogin)} /><InfoRow label="Password" value="**************" /><InfoRow label="Password Last Changed" value={formatDateTime(profile?.passwordChangedAt)} /><InfoRow label="Two-Factor Authentication" value={profile?.twoFactorEnabled ? 'Enabled' : 'Not enabled'} />
          </InfoSection>
        </div>

        {editing && <form onSubmit={handleSaveProfile} className="mt-5 rounded-xl border border-blue-200 bg-white p-5 shadow-sm"><h2 className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3 text-sm font-bold text-slate-900"><Save size={17} className="text-blue-600" /> Edit Profile</h2><div className="grid gap-4 md:grid-cols-2"><InputField label="Full Name" name="name" value={editForm.name} onChange={updateEditField} /><InputField label="Phone Number" name="phoneNumber" value={editForm.phoneNumber} onChange={updateEditField} /><InputField label="Alternative Phone" name="alternativePhone" value={editForm.alternativePhone} onChange={updateEditField} /><InputField label="Email Address" name="email" type="email" value={editForm.email} onChange={updateEditField} /></div><p className="mt-3 text-xs text-slate-500">Use the camera button on the profile photo to replace it.</p><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button><button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"><Save size={15} />Save Changes</button></div></form>}

        {changingPassword && <form onSubmit={handleSavePassword} className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3 text-sm font-bold text-slate-900"><Key size={17} className="text-blue-600" /> Change Password</h2><div className="grid gap-4 md:grid-cols-3"><InputField label="Current Password" name="currentPassword" type="password" value={passwordForm.currentPassword} onChange={updatePasswordField} /><InputField label="New Password" name="newPassword" type="password" value={passwordForm.newPassword} onChange={updatePasswordField} /><InputField label="Confirm Password" name="confirmPassword" type="password" value={passwordForm.confirmPassword} onChange={updatePasswordField} /></div><div className="mt-4 flex justify-end"><button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"><Key size={15} />Change Password</button></div></form>}
      </div>
    </div>
  );
}

function InfoSection({ icon, title, children }) {
  return <section className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm"><h2 className="mb-2 flex items-center gap-2 border-b border-slate-200 pb-3 text-sm font-bold text-blue-700">{icon}{title}</h2><div>{children}</div></section>;
}

function InfoRow({ label, value, badge = false }) {
  return <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 text-sm last:border-b-0"><span className="text-slate-500">{label}</span>{badge ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{value}</span> : <span className="text-right font-medium text-slate-700">{value}</span>}</div>;
}

function InputField({ label, name, value, onChange, type = 'text' }) {
  return <label className="text-xs font-semibold text-slate-600">{label}<input type={type} name={name} value={value} onChange={onChange} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>;
}
