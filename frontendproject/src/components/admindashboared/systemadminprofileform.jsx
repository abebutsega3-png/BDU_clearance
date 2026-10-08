import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ChevronRight, LoaderCircle, Upload } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import UniversitySeal from '../UniversitySeal';
import { useAdminLanguage } from './AdminLanguage';

const profileUrl = (id) => `http://localhost:3000/api/profile/${id}`;
const authConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
});

export default function SystemAdminProfileForm() {
  const { t } = useAdminLanguage();
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
    const fetchProfile = async () => {
      if (!user?._id) {
        setMessage({ type: 'error', text: 'Unable to identify the signed-in administrator.' });
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(profileUrl(user._id), authConfig());
        const loadedProfile = response.data.data || response.data.user;
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
        setMessage(null);
      } catch (error) {
        if (active) setMessage({ type: 'error', text: error.response?.data?.message || error.message || 'Unable to load profile.' });
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchProfile();
    return () => { active = false; };
  }, [user?._id, updateUser]);

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await axios.put(profileUrl(profile._id), draft, authConfig());
      const updatedProfile = response.data.data || response.data.user;
      if (!updatedProfile) throw new Error('The profile update returned no data.');
      setProfile((current) => ({ ...current, ...updatedProfile }));
      updateUser(updatedProfile);
      setDraft({
        name: updatedProfile.name || draft.name,
        email: updatedProfile.email || draft.email,
        phoneNumber: updatedProfile.phoneNumber || draft.phoneNumber,
      });
      setMessage({ type: 'success', text: 'Profile changes saved.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = (event) => {
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
      setPhotoPreview(image);
      setPhotoSaving(true);
      setMessage(null);
      try {
        const response = await axios.put(profileUrl(profile._id), { profileImage: image }, authConfig());
        const updatedProfile = response.data.data || response.data.user;
        const profileImage = updatedProfile?.profileImage || image;
        setProfile((current) => ({ ...current, ...updatedProfile, profileImage }));
        updateUser({ ...updatedProfile, profileImage });
        setMessage({ type: 'success', text: 'Profile photo updated.' });
      } catch (error) {
        setPhotoPreview(profile.profileImage || '');
        setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to update profile photo.' });
      } finally {
        setPhotoSaving(false);
      }
    };
    reader.onerror = () => setMessage({ type: 'error', text: 'Unable to read the selected image.' });
    reader.readAsDataURL(file);
  };

  if (loading) {
    return <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-slate-50 text-sm text-slate-600"><LoaderCircle size={18} className="mr-2 animate-spin" />{t('Loading profile...')}</div>;
  }

  if (!profile) {
    return <div className="mx-auto mt-10 max-w-md rounded-lg border border-red-200 bg-white p-5 text-sm text-red-700">{t(message?.text || 'Unable to load profile.')}</div>;
  }

  const roleTitle = profile.position || (profile.role?.toLowerCase() === 'admin' ? 'System Administrator' : profile.role || 'Not assigned');

  return (
    <main className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-md rounded-xl border border-slate-100 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="border-b border-slate-100 pb-4">
          <p className="text-[10px] font-bold uppercase text-indigo-600">{t('Account')}</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">{t('Profile')}</h1>
          <p className="mt-1 text-xs text-slate-500">{t('Your authenticated account details.')}</p>
        </div>

        <form onSubmit={handleProfileSave} className="pt-4">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-slate-100 bg-white">
              {photoPreview ? <img src={photoPreview} alt={t('Profile')} className="h-full w-full object-cover" /> : <UniversitySeal className="h-12 w-12" />}
            </div>
            <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-800 hover:bg-blue-100 ${photoSaving ? 'pointer-events-none opacity-60' : ''}`}>
              <Upload size={13} />{t(photoSaving ? 'Uploading...' : 'Change Profile Photo')}
              <input type="file" accept="image/jpeg,image/png,image/gif" onChange={handlePhotoChange} className="sr-only" disabled={photoSaving} />
            </label>
          </div>

          <div className="space-y-3.5">
            <ProfileField label="Full Name" name="name" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} required />
            <ProfileField label="Email Address" name="email" type="email" value={draft.email} onChange={(value) => setDraft((current) => ({ ...current, email: value }))} required />
            <ProfileField label="Role / Title" value={t(roleTitle)} readOnly />
            <ProfileField label="Department" value={t(profile.department || 'Not assigned')} readOnly />
            <ProfileField label="Phone Number" name="phoneNumber" type="tel" value={draft.phoneNumber} onChange={(value) => setDraft((current) => ({ ...current, phoneNumber: value }))} placeholder={t('Enter phone number')} />
          </div>

          {message && <p role="status" className={`mt-4 rounded-md px-3 py-2 text-xs ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{t(message.text)}</p>}

          <button type="submit" disabled={saving || photoSaving} className="mt-5 inline-flex items-center justify-center rounded-md bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">
            {t(saving ? 'Saving Profile...' : 'Save Profile Changes')}
          </button>
        </form>
      </div>

      <div className="mx-auto mt-4 max-w-md text-xs text-slate-500">
        <Link to="/admin" className="inline-flex items-center gap-1 hover:text-indigo-700">{t('Dashboard')} <ChevronRight size={12} /> {t('Profile')}</Link>
      </div>
    </main>
  );
}

function ProfileField({ label, name, value, onChange, type = 'text', placeholder, readOnly = false, required = false }) {
  const { t } = useAdminLanguage();
  return (
    <label className="block text-[11px] font-semibold text-slate-700">
      {t(label)}
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        className={`mt-1 block h-9 w-full rounded-md border px-3 text-xs font-medium text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 ${readOnly ? 'border-slate-100 bg-slate-100 text-slate-500' : 'border-slate-300 bg-white'}`}
      />
    </label>
  );
}