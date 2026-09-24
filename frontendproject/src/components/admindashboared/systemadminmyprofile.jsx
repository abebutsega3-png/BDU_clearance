import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/authContext';
import AdminNotificationBell from './AdminNotificationBell';
import {
  FiEdit3,
  FiLock,
  FiUpload,
  FiUser,
  FiShield,
  FiChevronRight,
  FiCheckCircle,
  FiClock,
  FiInfo,
  FiArrowUp,
  FiLoader,
} from 'react-icons/fi';

export default function SystemAdminMyProfile() {
  const { user, login } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ name: '', email: '', phoneNumber: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const authConfig = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No authentication token found');
          setLoading(false);
          return;
        }

        if (!user?._id) {
          setError('Unable to identify the signed-in administrator.');
          setLoading(false);
          return;
        }

        const response = await axios.get(`http://localhost:3000/api/profile/${user._id}`, authConfig());

        if (response.data.success) {
          const loadedProfile = response.data.data || response.data.user;
          setProfile(loadedProfile);
          setProfileDraft({
            name: loadedProfile.name || '',
            email: loadedProfile.email || '',
            phoneNumber: loadedProfile.phoneNumber || '',
          });
          setPhotoPreview(loadedProfile.profileImage || '');
          setError(null);
        } else {
          setError('Failed to fetch profile');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?._id]);

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setMessage('');
    try {
      const response = await axios.put(`http://localhost:3000/api/profile/${profile._id}`, profileDraft, authConfig());
      const updatedProfile = response.data.data || response.data.user;
      setProfile((current) => ({ ...current, ...updatedProfile }));
      login({ ...user, ...updatedProfile });
      setEditingProfile(false);
      setMessage('Profile updated successfully.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Unable to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage('New passwords do not match.');
      return;
    }
    setChangingPassword(true);
    setMessage('');
    try {
      const response = await axios.patch(`http://localhost:3000/api/profile/${profile._id}/password`, {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      }, authConfig());
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage(response.data.message || 'Password changed successfully.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Unable to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      setMessage('Please choose a JPG, PNG, or GIF image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage('The profile image must be smaller than 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const image = String(reader.result);
      setPhotoPreview(image);
      setPhotoSaving(true);
      setMessage('');
      try {
        const response = await axios.put(`http://localhost:3000/api/profile/${profile._id}`, { profileImage: image }, authConfig());
        const updatedProfile = response.data.data || response.data.user;
        setProfile((current) => ({ ...current, ...updatedProfile }));
        login({ ...user, ...updatedProfile, profileImage: image });
        setMessage('Profile photo updated successfully.');
      } catch (err) {
        setMessage(err.response?.data?.message || 'Unable to update profile photo.');
        setPhotoPreview(profile.profileImage || '');
      } finally {
        setPhotoSaving(false);
      }
    };
    reader.onerror = () => setMessage('Unable to read the selected image.');
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef2f7]">
        <div className="flex items-center gap-2 text-lg text-slate-700">
          <FiLoader className="animate-spin" />
          Loading profile...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef2f7]">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef2f7]">
        <div className="text-slate-700">No profile data available</div>
      </div>
    );
  }

  const initials = profile.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'A';

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-[#eef2f7] px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1190px]">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-slate-800">My Profile</h1>
            <p className="mt-1 text-sm text-slate-500">View and manage your account information and security settings.</p>
          </div>

          <div className="flex items-center gap-4">
            <AdminNotificationBell />

            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#edf1fa] text-xs font-bold text-slate-700">
                {initials}
              </div>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[11px] font-semibold text-slate-700">System Administrator</span>
                <span className="text-[10px] text-slate-500">{profile.email}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-5 flex items-center gap-2 text-xs text-slate-500">
          <span className="cursor-pointer hover:text-blue-600">Dashboard</span>
          <FiChevronRight className="text-[11px] text-slate-400" />
          <span className="font-medium text-slate-700">My Profile</span>
        </div>

        <div className="mb-6 flex w-full items-center gap-3 rounded-xl border border-[#dfe7f1] bg-[#eaf2ff] px-4 py-3 text-sm text-[#2f6fcc]">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#dfeeff] text-[#1f5fd0]">
            <FiInfo className="text-[12px]" />
          </div>
          <span>Keep your profile information up to date. This information will be used for system notifications and official communications.</span>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_1.15fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf4ff] text-[#2b6fe9]">
                <FiUser className="text-lg" />
              </div>
              <h2 className="text-[18px] font-semibold text-slate-800">Personal Information</h2>
            </div>

            <div className="flex flex-col items-center gap-5 md:flex-row md:items-start">
              <div className="flex flex-col items-center">
                <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-gradient-to-br from-[#d3e0f4] via-[#b1b7c8] to-[#5d6a7e] shadow-[0_10px_20px_rgba(15,23,42,0.12)]">
                  {photoPreview ? <img src={photoPreview} alt="System Admin profile" className="h-full w-full object-cover" /> : <>
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#1e2d45] to-transparent opacity-20" />
                    <span className="relative text-[42px] font-bold text-white">{initials}</span>
                  </>}
                </div>

                <label className={`mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 ${photoSaving ? 'pointer-events-none opacity-60' : ''}`}>
                  <FiUpload className="text-xs" />
                  {photoSaving ? 'Uploading...' : 'Change Photo'}
                  <input type="file" accept="image/jpeg,image/png,image/gif" onChange={handlePhotoChange} className="sr-only" disabled={photoSaving} />
                </label>
              </div>

              <div className="w-full">
                <div className="space-y-3">
                  <FieldRow label="Full Name" value={profile.name || 'N/A'} />
                  <FieldRow label="Username" value={profile.username || 'N/A'} />
                  <FieldRow label="Email Address" value={profile.email || 'N/A'} />
                  <FieldRow label="Phone Number" value={profile.phoneNumber || 'N/A'} />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setProfileDraft({ name: profile.name || '', email: profile.email || '', phoneNumber: profile.phoneNumber || '' });
                    setEditingProfile(true);
                    setMessage('');
                  }}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1d6ee8] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#165cc4]"
                >
                  <FiEdit3 className="text-sm" />
                  Edit Profile
                </button>
              </div>
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf4ff] text-[#2b6fe9]">
                  <FiShield className="text-lg" />
                </div>
                <h2 className="text-[18px] font-semibold text-slate-800">Account Information</h2>
              </div>

              <div className="space-y-0 overflow-hidden rounded-lg border border-slate-200">
                <InfoRow label="Employee ID" value={profile.employeeId || 'N/A'} />
                <InfoRow
                  label="Role"
                  value={
                    <span className="rounded-full bg-[#eaf1ff] px-2.5 py-1 text-xs font-medium text-[#2563eb]">
                      {profile.role || 'N/A'}
                    </span>
                  }
                />
                <InfoRow
                  label="Account Status"
                  value={
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#eafaf1] px-2.5 py-1 text-xs font-medium text-[#1e9a5a]">
                      <span className="h-2 w-2 rounded-full bg-[#27ae60]" />
                      {profile.status || 'Active'}
                    </span>
                  }
                />
                <InfoRow label="Last Login" value={formatDate(profile.lastLogin)} />
                <InfoRow label="Account Created" value={formatDate(profile.createdAt)} />
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf4ff] text-[#2b6fe9]">
                  <FiLock className="text-lg" />
                </div>
                <h2 className="text-[18px] font-semibold text-slate-800">Security</h2>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-[#f8fafc] px-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-700">Password</span>
                  <span className="text-sm text-slate-400">••••••••••</span>
                </div>

                <button
                  type="button"
                  onClick={() => document.getElementById('admin-change-password')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#cfe0ff] bg-white px-3 py-2 text-[12px] font-medium text-[#1d6ee8] transition hover:bg-blue-50"
                >
                  <FiLock className="text-xs" />
                  Change Password
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-[#f8fafc] px-3 py-3">
                <div className="flex items-center gap-3">
                  <FiCheckCircle className="text-[#22c55e]" />
                  <span className="text-sm font-medium text-slate-700">Two-Factor Authentication</span>
                </div>
                <span className="text-xs text-slate-500">Not enabled</span>
              </div>

              <button
                type="button"
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-[#dfe7f1] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <FiShield className="text-sm" />
                Enable 2FA
              </button>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-3 border-b border-slate-200 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf4ff] text-[#2b6fe9]">
                  <FiClock className="text-lg" />
                </div>
                <h2 className="text-[18px] font-semibold text-slate-800">Recent Activity</h2>
              </div>

              <div className="space-y-3 text-sm">
                <ActivityRow
                  icon={<span className="h-2.5 w-2.5 rounded-full bg-[#1d6ee8]" />}
                  text="Logged in to the system"
                  time={formatDate(profile.lastLogin)}
                />
                <ActivityRow
                  icon={<span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />}
                  text="Account created"
                  time={formatDate(profile.createdAt)}
                />
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                >
                  View Full Activity
                </button>
              </div>
            </section>
          </div>
        </div>

        {message && <p className="mt-5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</p>}

        {editingProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <form onSubmit={handleProfileSave} className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Edit Profile</h2>
                <button type="button" onClick={() => setEditingProfile(false)} className="text-sm text-slate-500 hover:text-slate-800">Close</button>
              </div>
              <div className="space-y-3">
                {[
                  ['name', 'Full Name'],
                  ['email', 'Email'],
                  ['phoneNumber', 'Phone'],
                ].map(([field, label]) => (
                  <label key={field} className="block text-sm font-medium text-slate-600">
                    {label}
                    <input required={field !== 'phoneNumber'} value={profileDraft[field]} onChange={(event) => setProfileDraft((current) => ({ ...current, [field]: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500" />
                  </label>
                ))}
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setEditingProfile(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
                <button type="submit" disabled={savingProfile} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{savingProfile ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        )}

        <form id="admin-change-password" onSubmit={handlePasswordChange} className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-3">
            <FiLock className="text-lg text-[#2b6fe9]" />
            <h2 className="text-[18px] font-semibold text-slate-800">Change Password</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ['currentPassword', 'Current Password'],
              ['newPassword', 'New Password'],
              ['confirmPassword', 'Confirm New Password'],
            ].map(([field, label]) => (
              <label key={field} className="text-sm font-medium text-slate-600">
                {label}
                <input id={field === 'currentPassword' ? 'current-password' : undefined} type="password" required minLength={field === 'currentPassword' ? 1 : 6} value={passwords[field]} onChange={(event) => setPasswords((current) => ({ ...current, [field]: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500" />
              </label>
            ))}
          </div>
          <button type="submit" disabled={changingPassword} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">{changingPassword ? 'Changing Password...' : 'Change Password'}</button>
        </form>

        <button
          type="button"
          className="fixed bottom-6 right-7 flex h-14 w-14 items-center justify-center rounded-full bg-[#1d6ee8] text-2xl text-white shadow-lg shadow-blue-200 transition hover:bg-[#165cc4]"
          aria-label="Scroll to top"
        >
          <FiArrowUp />
        </button>
      </div>
    </div>
  );
}

function FieldRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1.5 py-1">
      <span className="text-[13px] font-medium text-slate-500">{label}</span>
      <span className="text-[15px] font-medium text-slate-800">{value}</span>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-3 text-sm last:border-b-0">
      <span className="w-32 text-sm font-medium text-slate-500">{label}</span>
      <span className="flex-1 text-right text-sm font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function ActivityRow({ icon, text, time }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <span className="flex h-4 w-4 items-center justify-center">{icon}</span>
        <span className="text-sm text-slate-700">{text}</span>
      </div>
      <span className="text-right text-[11px] text-slate-500">{time}</span>
    </div>
  );
}
