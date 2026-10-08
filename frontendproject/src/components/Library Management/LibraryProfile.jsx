import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle, Eye, EyeOff, Loader2, LockKeyhole, Save, ShieldCheck, Upload } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import UniversitySeal from '../UniversitySeal';

const authConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
});

export default function LibraryProfile() {
  const { user, updateUser } = useAuth();
  const location = useLocation();
  const userId = user?._id || user?.id || localStorage.getItem('userId') || '';
  const [profile, setProfile] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    role: user?.position || user?.role || 'Library Officer',
    department: user?.department || 'Library',
    phoneNumber: user?.phoneNumber || '',
    profileImage: user?.profileImage || ''
  });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [visiblePasswords, setVisiblePasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const showSecurity = location.hash === '#security';

  useEffect(() => {
    if (!userId) return undefined;

    let active = true;
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/profile/${userId}`, authConfig());
        const data = response.data?.data || response.data || {};
        if (!active) return;
        setProfile((current) => ({
          ...current,
          fullName: data.name || current.fullName,
          email: data.email || current.email,
          role: data.position || user?.role || current.role,
          department: data.department || current.department,
          phoneNumber: data.phoneNumber || current.phoneNumber,
          profileImage: data.profileImage || data.profilePhoto || current.profileImage
        }));
      } catch (error) {
        if (active) setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to load your profile.' });
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      active = false;
    };
  }, [userId, user?.role]);

  const handlePhotoUpload = (event) => {
    const file = event.currentTarget.files?.[0];
    const input = event.currentTarget;
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select a valid image file.' });
      input.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Profile photo must be smaller than 2 MB.' });
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result !== 'string') {
        setMessage({ type: 'error', text: 'The selected image could not be read.' });
        input.value = '';
        return;
      }

      setUploadingPhoto(true);
      setMessage({ type: '', text: '' });
      try {
        const response = await axios.put(`/api/profile/${userId}`, { profileImage: reader.result }, authConfig());
        const profileImage = response.data?.data?.profileImage || reader.result;
        setProfile((current) => ({ ...current, profileImage }));
        updateUser({ profileImage });
        setMessage({ type: 'success', text: 'Profile photo updated successfully.' });
      } catch (error) {
        setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to update your profile photo.' });
      } finally {
        setUploadingPhoto(false);
        input.value = '';
      }
    };
    reader.onerror = () => {
      setMessage({ type: 'error', text: 'The selected image could not be read.' });
      input.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await axios.put(`/api/profile/${userId}`, {
        name: profile.fullName,
        email: profile.email,
        phoneNumber: profile.phoneNumber,
        profileImage: profile.profileImage
      }, authConfig());
      const updated = response.data?.data || {};
      const updatedProfile = {
        ...profile,
        fullName: updated.name || profile.fullName,
        email: updated.email || profile.email,
        phoneNumber: updated.phoneNumber || profile.phoneNumber,
        profileImage: updated.profileImage || profile.profileImage
      };
      setProfile(updatedProfile);
      updateUser({
        name: updatedProfile.fullName,
        email: updatedProfile.email,
        profileImage: updatedProfile.profileImage
      });
      setMessage({ type: 'success', text: 'Profile changes saved successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to save profile changes.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (passwords.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    setChangingPassword(true);
    setMessage({ type: '', text: '' });
    try {
      await axios.patch(`/api/profile/${userId}/password`, {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      }, authConfig());
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage({ type: 'success', text: 'Password updated successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to change your password.' });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 className="mr-2 animate-spin" size={20} />
        <span>Loading profile...</span>
      </div>
    );
  }

  return (
    <main className="min-h-[calc(100vh-56px)] bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className={`mx-auto ${showSecurity ? 'flex min-h-[calc(100vh-104px)] max-w-5xl items-center justify-center' : 'max-w-2xl'}`}>
        {!showSecurity && <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Account</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Profile</h1>
          <p className="mt-1 text-sm text-slate-500">Your authenticated Library Officer account details.</p>
        </div>}

        {message.text && !showSecurity && (
          <div
            role="status"
            className={`mb-4 flex items-center gap-2 rounded-lg border p-3 text-sm ${
              message.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {message.type === 'success' ? <CheckCircle size={17} /> : <AlertCircle size={17} />}
            <span>{message.text}</span>
          </div>
        )}

        {showSecurity ? (
          <section id="security" className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-lg sm:p-8">
            <Link to="/library-office" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-indigo-700">
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
            <div className="mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <ShieldCheck size={30} />
            </div>
            <h1 className="mt-5 text-center text-2xl font-bold text-slate-900">Change Password</h1>
            <p className="mt-1 text-center text-sm text-slate-500">You must update your password before continuing.</p>
            {message.text && (
              <div role="status" className={`mt-5 flex items-center gap-2 rounded-lg border p-3 text-sm ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
                {message.type === 'success' ? <CheckCircle size={17} /> : <AlertCircle size={17} />}
                <span>{message.text}</span>
              </div>
            )}
            <form onSubmit={handleChangePassword} className="mt-6 space-y-4">
              {[
                ['currentPassword', 'Current Password', 'Enter current password'],
                ['newPassword', 'New Password', 'Enter new password'],
                ['confirmPassword', 'Confirm New Password', 'Confirm new password']
              ].map(([name, label, placeholder]) => (
                <PasswordField
                  key={name}
                  name={name}
                  label={label}
                  placeholder={placeholder}
                  value={passwords[name]}
                  visible={visiblePasswords[name]}
                  onChange={(value) => setPasswords((current) => ({ ...current, [name]: value }))}
                  onToggle={() => setVisiblePasswords((current) => ({ ...current, [name]: !current[name] }))}
                />
              ))}
              <button
                type="submit"
                disabled={changingPassword}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
              >
                {changingPassword && <Loader2 className="animate-spin" size={16} />}
                {changingPassword ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </section>
        ) : (
          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-7 flex flex-wrap items-center gap-4 border-b border-slate-100 pb-6">
              {profile.profileImage ? (
                <img
                  src={profile.profileImage}
                  alt="Profile"
                  className="h-20 w-20 rounded-full border border-slate-200 object-cover"
                />
              ) : (
                <UniversitySeal className="h-20 w-20 border border-slate-200 bg-white p-1" />
              )}
              <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 ${uploadingPhoto ? 'cursor-wait opacity-60' : ''}`}>
                {uploadingPhoto ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                {uploadingPhoto ? 'Uploading...' : 'Change Profile Photo'}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploadingPhoto}
                  onChange={handlePhotoUpload}
                />
              </label>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              <ProfileField
                label="Full Name"
                value={profile.fullName}
                onChange={(value) => setProfile((current) => ({ ...current, fullName: value }))}
                required
              />
              <ProfileField
                label="Email Address"
                type="email"
                value={profile.email}
                onChange={(value) => setProfile((current) => ({ ...current, email: value }))}
                required
              />
              <ProfileField label="Role / Title" value={profile.role} disabled />
              <ProfileField label="Department" value={profile.department} disabled />
              <ProfileField
                label="Phone Number"
                type="tel"
                value={profile.phoneNumber}
                onChange={(value) => setProfile((current) => ({ ...current, phoneNumber: value }))}
              />
              <button
                type="submit"
                disabled={saving || uploadingPhoto}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {saving ? 'Saving Profile...' : 'Save Profile Changes'}
              </button>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}

function ProfileField({ label, value, onChange, type = 'text', disabled = false, required = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled}
        required={required}
        className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 ${
          disabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500'
            : 'border-slate-200 bg-white text-slate-800'
        }`}
      />
    </label>
  );
}

function PasswordField({ name, label, placeholder, value, visible, onChange, onToggle }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <span className="flex items-center rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
        <LockKeyhole size={16} className="shrink-0 text-slate-400" />
        <input
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'}
          required
          className="min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-0"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          className="rounded p-1 text-slate-500 transition hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </span>
    </label>
  );
}
