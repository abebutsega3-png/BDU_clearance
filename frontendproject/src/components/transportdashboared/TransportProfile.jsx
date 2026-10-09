import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LoaderCircle, Upload } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import UniversitySeal from '../UniversitySeal';

const profileUrl = (userId) => `http://localhost:3000/api/profile/${userId}`;
const authConfig = () => ({
  headers: { Authorization: `******'token') || ''}` },
});

export default function TransportProfile() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState({ name: '', email: '', phoneNumber: '' });
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      if (!user?._id) {
        setMessage({ type: 'error', text: 'Unable to identify the signed-in Transport Officer.' });
        setLoading(false);
        return;
      }
      try {
        const response = await axios.get(profileUrl(user._id), authConfig());
        const loadedProfile = response.data?.data || response.data?.user;
        if (!loadedProfile) throw new Error('No profile data was returned.');
        if (!active) return;
        setProfile(loadedProfile);
        setDraft({
          name: loadedProfile.name || '',
          email: loadedProfile.email || '',
          phoneNumber: loadedProfile.phoneNumber || '',
        });
        setPhotoPreview(loadedProfile.profileImage || '');
        updateUser(loadedProfile);
      } catch (error) {
        if (active) setMessage({
          type: 'error',
          text: error.response?.data?.message || error.message || 'Unable to load profile.',
        });
      } finally {
        if (active) setLoading(false);
      }
    };
    loadProfile();
    return () => { active = false; };
  }, [user?._id, updateUser]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await axios.put(profileUrl(profile._id), draft, authConfig());
      const updatedProfile = response.data?.data || response.data?.user;
      if (!updatedProfile) throw new Error('The profile update returned no data.');
      setProfile((current) => ({ ...current, ...updatedProfile }));
      setDraft({
        name: updatedProfile.name || draft.name,
        email: updatedProfile.email || draft.email,
        phoneNumber: updatedProfile.phoneNumber || draft.phoneNumber,
      });
      updateUser(updatedProfile);
      setMessage({ type: 'success', text: 'Profile changes saved.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || error.message || 'Unable to update profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      setMessage({ type: 'error', text: 'Choose a JPG, PNG, or GIF image.' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'The profile image must be smaller than 2 MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const image = String(reader.result);
      setPhotoSaving(true);
      setMessage(null);
      try {
        const response = await axios.put(profileUrl(profile._id), { profileImage: image }, authConfig());
        const updatedProfile = response.data?.data || response.data?.user;
        if (!updatedProfile) throw new Error('The profile photo update returned no data.');
        const profileImage = updatedProfile.profileImage || image;
        setProfile((current) => ({ ...current, ...updatedProfile, profileImage }));
        setPhotoPreview(profileImage);
        updateUser({ ...updatedProfile, profileImage });
        setMessage({ type: 'success', text: 'Profile photo updated.' });
      } catch (error) {
        setMessage({
          type: 'error',
          text: error.response?.data?.message || error.message || 'Unable to update profile photo.',
        });
      } finally {
        setPhotoSaving(false);
      }
    };
    reader.onerror = () => setMessage({ type: 'error', text: 'Unable to read the selected image.' });
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center text-sm text-slate-500">
        <LoaderCircle size={18} className="mr-2 animate-spin" />Loading profile...
      </div>
    );
  }

  if (!profile) {
    return <p role="alert" className="rounded-lg border border-rose-200 bg-white p-4 text-sm text-rose-700">{message?.text || 'Unable to load profile.'}</p>;
  }

  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-slate-100 bg-white p-5 text-slate-800 shadow-sm sm:p-8">
      <header className="border-b border-slate-100 pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Account</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Your authenticated Transport Officer account details.</p>
      </header>

      <form onSubmit={saveProfile} className="pt-6">
        <div className="mb-7 flex flex-wrap items-center gap-4 border-b border-slate-100 pb-6">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-100 bg-white">
            {photoPreview
              ? <img src={photoPreview} alt="Profile" className="h-full w-full object-cover" />
              : <UniversitySeal className="h-16 w-16" />}
          </div>
          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 ${photoSaving ? 'pointer-events-none opacity-60' : ''}`}>
            <Upload size={15} />{photoSaving ? 'Uploading...' : 'Change Profile Photo'}
            <input type="file" accept="image/jpeg,image/png,image/gif" onChange={uploadPhoto} className="sr-only" disabled={photoSaving} />
          </label>
        </div>

        <div className="space-y-4">
          <ProfileField label="Full Name" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} required />
          <ProfileField label="Email Address" type="email" value={draft.email} onChange={(value) => setDraft((current) => ({ ...current, email: value }))} required />
          <ProfileField label="Role / Title" value={profile.position || profile.role || 'Transport Officer'} readOnly />
          <ProfileField label="Department" value={profile.department || 'Not assigned'} readOnly />
          <ProfileField label="Phone Number" type="tel" value={draft.phoneNumber} onChange={(value) => setDraft((current) => ({ ...current, phoneNumber: value }))} placeholder="Enter phone number" />
        </div>

        {message && (
          <p role="status" className={`mt-4 rounded-lg px-3 py-2.5 text-sm ${message.type === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {message.text}
          </p>
        )}
        <button type="submit" disabled={saving || photoSaving} className="mt-6 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">
          {saving ? 'Saving Profile...' : 'Save Profile Changes'}
        </button>
      </form>
    </section>
  );
}

function ProfileField({ label, value, onChange, type = 'text', placeholder, readOnly = false, required = false }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        className={`mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 ${readOnly ? 'bg-slate-100 text-slate-500' : 'bg-white text-slate-800'}`}
      />
    </label>
  );
}
