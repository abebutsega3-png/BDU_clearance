import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  FiBell,
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
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

        const response = await axios.get('http://localhost:3000/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.success) {
          setProfile(response.data.user);
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
  }, []);

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
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
              <FiBell className="text-lg text-slate-600" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-semibold text-white">
                8
              </span>
            </div>

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
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#1e2d45] to-transparent opacity-20" />
                  <span className="relative text-[42px] font-bold text-white">{initials}</span>
                </div>

                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <FiUpload className="text-xs" />
                  Change Photo
                </button>
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
