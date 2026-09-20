import React, { useEffect, useState } from 'react';
import axios from 'axios';

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function PropertyProfile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ email: '', phoneNumber: '', alternativePhone: '', profileImage: '' });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/property/profile/me', { headers: { Authorization: `Bearer ${token}` } });
      const data = response.data.profile;
      setProfile(data);
      setForm({
        email: data.email || '',
        phoneNumber: data.phoneNumber || data.phone || '',
        alternativePhone: data.alternativePhone || '',
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
      setEditing(false);
      setMessage('Profile updated successfully.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const value = (field, fallback = 'N/A') => profile?.[field] || fallback;
  const profileImage = profile?.profileImage || profile?.photo || '';
  const profileInitial = (profile?.fullName || profile?.name || 'P').charAt(0).toUpperCase();

  if (loading) return <div className="p-8 text-center text-slate-500 text-xs">Loading profile...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-xs text-slate-800">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">My Profile</h1>
            <p className="text-slate-500">Property / Asset Officer account and employee information</p>
          </div>
          <button type="button" onClick={() => setEditing(!editing)} className="rounded bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800">
            {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        </header>

        {message && <div className="rounded border border-teal-200 bg-teal-50 p-3 font-semibold text-teal-800">{message}</div>}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-teal-100 text-2xl font-bold text-teal-800">
              {profileImage ? <img src={profileImage} alt="Profile" className="h-full w-full object-cover" /> : profileInitial}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{value('fullName', value('name'))}</h2>
              <p className="font-semibold text-teal-700">{value('position', 'Property / Asset Officer')}</p>
              <p className="text-slate-500">Employee ID: {value('employeeId')}</p>
            </div>
          </div>
        </section>

        <form onSubmit={saveProfile} className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 border-b border-slate-100 pb-2 text-sm font-bold">Personal Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnly label="Full Name" value={value('fullName', value('name'))} />
              <ReadOnly label="Employee ID" value={value('employeeId')} />
              <ReadOnly label="Gender" value={value('gender')} />
              <Editable label="Phone Number" value={form.phoneNumber} editing={editing} onChange={(value) => setForm({ ...form, phoneNumber: value })} />
              <Editable label="Alternative Phone" value={form.alternativePhone} editing={editing} onChange={(value) => setForm({ ...form, alternativePhone: value })} />
              <Editable label="Email Address" value={form.email} editing={editing} onChange={(value) => setForm({ ...form, email: value })} />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 border-b border-slate-100 pb-2 text-sm font-bold">Employee Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnly label="Department" value={value('department')} />
              <ReadOnly label="Position" value={value('position')} />
              <ReadOnly label="Employment Type" value={value('employmentType')} />
              <ReadOnly label="Employment Date" value={formatDate(value('employmentDate', value('hireDate', '')))} />
              <ReadOnly label="Status" value={value('status')} />
              <ReadOnly label="Campus" value={value('campus')} />
              <ReadOnly label="Qualification" value={value('educationLevel', value('qualification'))} />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-4 border-b border-slate-100 pb-2 text-sm font-bold">Account Information</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <ReadOnly label="Username" value={value('username', value('email'))} />
              <ReadOnly label="Role" value={value('role')} />
              <ReadOnly label="Account Status" value={value('status')} />
              <ReadOnly label="Last Login" value={formatDate(value('lastLogin', ''))} />
            </div>
            {editing && <div className="mt-5 text-right"><button disabled={saving} className="rounded bg-teal-700 px-5 py-2 font-semibold text-white hover:bg-teal-800">{saving ? 'Saving...' : 'Save Changes'}</button></div>}
          </section>
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
