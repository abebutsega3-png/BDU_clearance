import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  User,
  Shield,
  Key,
  Save,
  Lock,
  CheckCircle2,
  AlertCircle,
  Phone,
  Briefcase,
  MapPin,
  Activity,
} from 'lucide-react';

const API_URL = 'http://localhost:3000/api/ict/profile';

const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric' });
};

const ICTProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phoneNumber: '',
    email: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_URL, getAuthConfig());
      const user = response.data?.user || response.data?.data || {};
      setProfile(user);
      setEditForm({
        name: user.name || user.fullName || '',
        phoneNumber: user.phoneNumber || '',
        email: user.email || '',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Unable to load ICT profile information.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(API_URL, editForm, getAuthConfig());
      const updatedUser = response.data?.user || response.data?.data || profile;
      setProfile(updatedUser);
      setEditing(false);
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Unable to update profile information.',
      });
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New password and confirm password do not match.' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    try {
      await axios.put(`${API_URL}/change-password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }, getAuthConfig());

      setMessage({ type: 'success', text: 'Password updated successfully.' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Unable to change password.',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-500 shadow-sm">
          Loading ICT profile...
        </div>
      </div>
    );
  }

  const profileName = profile?.name || 'ICT Officer';
  const role = profile?.role || 'ICT Officer';
  const department = profile?.department || 'ICT';
  const position = profile?.position || 'ICT Officer';
  const campus = profile?.campus || 'Main Campus';
  const status = profile?.status || 'Active';
  const employeeId = profile?.employeeId || 'N/A';
  const accountStatus = status;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#d9f8f3,_transparent_32%),linear-gradient(135deg,_#eef4f8_0%,_#f8fafc_55%,_#e7f8f7_100%)] p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        {message.text && (
          <div className={`mb-5 flex items-center gap-2 rounded-xl border p-4 text-sm font-semibold ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur md:flex-row md:items-center md:px-6">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-teal-600">Account workspace</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">ICT Officer Profile</h1>
            <p className="mt-1 text-sm text-slate-500">Manage your identity, contact details, and account security.</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-700">
            <Activity size={18} />
            <div><p className="text-[10px] font-bold uppercase tracking-wide">Account status</p><p className="text-sm font-bold">{accountStatus}</p></div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="h-24 bg-[linear-gradient(120deg,_#0f766e,_#0e7490_55%,_#2563eb)]" />
              <div className="px-6 pb-6">
              <div className="relative mx-auto -mt-14 mb-4 h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-teal-50 shadow-lg">
                {profile?.profileImage ? (
                  <img src={profile.profileImage} alt={profileName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-teal-50 text-3xl font-bold text-teal-700">
                    {profileName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <h2 className="text-center text-xl font-bold text-slate-800">{profileName}</h2>
              <div className="mt-3 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                  <CheckCircle2 size={13} />
                  {position}
                </span>
              </div>

              <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm">
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5"><User size={15} className="text-teal-600" />
                  <span className="text-slate-500">Employee ID</span><span className="ml-auto font-semibold text-slate-800">{employeeId}</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5"><Briefcase size={15} className="text-teal-600" />
                  <span className="text-slate-500">Department</span>
                  <span className="ml-auto font-semibold text-slate-800">{department}</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5"><MapPin size={15} className="text-teal-600" />
                  <span className="text-slate-500">Campus</span><span className="ml-auto text-right font-semibold text-slate-800">{campus}</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-3 py-2.5"><Activity size={15} className="text-emerald-600" />
                  <span className="text-emerald-700">Status</span><span className="ml-auto rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    {accountStatus}
                  </span>
                </div>
              </div>
              </div>
            </div>
          </aside>

          <div className="grid gap-6 md:grid-cols-2 lg:col-span-1">
            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
              <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3 text-base font-bold text-slate-800">
                <User className="text-blue-600" size={18} /> Personal Information
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Profile Photo" value={profile?.profileImage ? 'Available' : 'Not added'} readOnly />
                <Field label="Full Name" value={profileName} readOnly />
                <Field label="Employee ID" value={employeeId} readOnly />
                <Field label="Gender" value={profile?.gender || 'N/A'} readOnly />
                <Field label="Date of Birth" value={formatDate(profile?.dateOfBirth)} readOnly />
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3 text-base font-bold text-slate-800">
                <Phone className="text-blue-600" size={18} /> Contact Information
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Email" value={profile?.email || 'N/A'} readOnly />
                <Field label="Phone Number" value={profile?.phoneNumber || 'N/A'} readOnly />
                <Field label="Alternative Phone" value={profile?.alternativePhone || 'N/A'} readOnly />
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3 text-base font-bold text-slate-800">
                <Briefcase className="text-blue-600" size={18} /> Work Information
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Position" value={position} readOnly />
                <Field label="Department" value={department} readOnly />
                <Field label="Campus" value={campus} readOnly />
                <Field label="Employment Type" value={profile?.employmentType || 'Permanent'} readOnly />
                <Field label="Employee Status" value={accountStatus} readOnly />
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
              <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3 text-base font-bold text-slate-800">
                <Shield className="text-blue-600" size={18} /> Account Information
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Username / Email" value={profile?.username || profile?.email || 'N/A'} readOnly />
                <Field label="Role" value={role} readOnly />
                <Field label="Account Status" value={accountStatus} readOnly />
                <Field label="Last Login" value={formatDate(profile?.lastLogin)} readOnly />
                <Field label="Account Created Date" value={formatDate(profile?.createdAt)} readOnly />
              </div>
            </section>

            {editing && <form onSubmit={handleSaveProfile} className="rounded-[1.5rem] border border-blue-200 bg-blue-50/40 p-6 shadow-sm md:col-span-2">
              <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3 text-base font-bold text-slate-800">
                <Save className="text-blue-600" size={18} /> Edit Profile
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  label="Full Name"
                  name="name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  placeholder="Full name"
                />
                <InputField
                  label="Phone Number"
                  name="phoneNumber"
                  value={editForm.phoneNumber}
                  onChange={handleEditChange}
                  placeholder="0911234567"
                />
                <div className="md:col-span-2">
                  <InputField
                    label="Email"
                    name="email"
                    type="email"
                    value={editForm.email}
                    onChange={handleEditChange}
                    placeholder="ict.officer@bdu.edu.et"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <div className="flex gap-3"><button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button type="submit" className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"><Save size={16} /> Save Changes</button></div>
              </div>
            </form>}

            <form onSubmit={handleSavePassword} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
              <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3 text-base font-bold text-slate-800">
                <Lock className="text-blue-600" size={18} /> Change Password
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <InputField
                  label="Current Password"
                  name="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Current password"
                />
                <InputField
                  label="New Password"
                  name="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="New password"
                />
                <InputField
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Confirm password"
                />
              </div>

              <div className="mt-5 flex justify-end">
                <button type="submit" className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700">
                  <Key size={16} /> Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, value, readOnly }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</label>
    <div className={`text-sm font-medium ${readOnly ? 'text-slate-700' : 'text-slate-800'}`}>
      {value || 'N/A'}
    </div>
  </div>
);

const InputField = ({ label, name, type = 'text', value, onChange, placeholder }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
    />
  </div>
);

export default ICTProfile;