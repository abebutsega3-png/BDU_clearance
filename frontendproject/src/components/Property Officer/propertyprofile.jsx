import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, Camera, Eye, EyeOff, LockKeyhole, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import UniversitySeal from '../UniversitySeal';
import { usePropertyLanguage } from './propertyLanguage';

const authConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function PropertyProfile() {
  const { t } = usePropertyLanguage();
  const languageTranslator = useRef(t);

  useEffect(() => {
    languageTranslator.current = t;
  }, [t]);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ fullName: '', email: '', phoneNumber: '', profileImage: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [visiblePasswords, setVisiblePasswords] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [message, setMessage] = useState('');
  const photoInputRef = useRef(null);
  const showSecurity = window.location.hash === '#security';

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get('/api/property/profile/me', authConfig());
        const data = response.data.profile;
        setProfile(data);
        setForm({
          fullName: data.fullName || data.name || '',
          email: data.email || '',
          phoneNumber: data.phoneNumber || data.phone || '',
          profileImage: data.profileImage || data.photo || ''
        });
      } catch (error) {
        setMessage(error.response?.data?.message || languageTranslator.current('Unable to load profile.', 'መገለጫውን መጫን አልተቻለም።'));
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await axios.put('/api/property/profile/me', form, authConfig());
      const updatedProfile = response.data.profile;
      setProfile(updatedProfile);
      setForm((current) => ({
        ...current,
        fullName: updatedProfile.fullName || updatedProfile.name || current.fullName,
        email: updatedProfile.email || current.email,
        phoneNumber: updatedProfile.phoneNumber || updatedProfile.phone || current.phoneNumber
      }));
      setMessage(t('Profile updated successfully.', 'መገለጫው በተሳካ ሁኔታ ተዘምኗል።'));
    } catch (error) {
      setMessage(error.response?.data?.message || t('Unable to update profile.', 'መገለጫውን ማዘመን አልተቻለም።'));
    } finally {
      setSaving(false);
    }
  };

  const changePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage(t('Please select an image file.', 'እባክዎ የምስል ፋይል ይምረጡ።'));
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      setPhotoSaving(true);
      setMessage('');
      try {
        const response = await axios.put('/api/property/profile/me', { profileImage: reader.result }, authConfig());
        setProfile(response.data.profile);
        setForm((current) => ({ ...current, profileImage: reader.result }));
        setMessage(t('Profile photo updated successfully.', 'የመገለጫ ፎቶው በተሳካ ሁኔታ ተዘምኗል።'));
      } catch (error) {
        setMessage(error.response?.data?.message || t('Unable to update profile photo.', 'የመገለጫ ፎቶውን ማዘመን አልተቻለም።'));
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
      setMessage(t('New password and confirmation do not match.', 'አዲሱ የይለፍ ቃል እና ማረጋገጫው አይዛመዱም።'));
      return;
    }
    if (passwords.newPassword.length < 6) {
      setMessage(t('New password must be at least 6 characters.', 'አዲሱ የይለፍ ቃል ቢያንስ 6 ቁምፊዎች መሆን አለበት።'));
      return;
    }

    setChangingPassword(true);
    setMessage('');
    try {
      await axios.patch(`/api/profile/${profile?._id}/password`, {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      }, authConfig());
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage(t('Password changed successfully.', 'የይለፍ ቃሉ በተሳካ ሁኔታ ተቀይሯል።'));
    } catch (error) {
      setMessage(error.response?.data?.message || t('Unable to change password.', 'የይለፍ ቃሉን መቀየር አልተቻለም።'));
    } finally {
      setChangingPassword(false);
    }
  };

  const value = (field, fallback = t('N/A', 'አይገኝም')) => profile?.[field] || fallback;
  const profileImage = profile?.profileImage || profile?.photo || '';

  if (loading) return <div className="p-8 text-center text-xs text-slate-500">{t('Loading profile...', 'መገለጫውን በመጫን ላይ...')}</div>;

  if (showSecurity) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f8f9fc] p-4 text-slate-800">
        <section className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-5 shadow-lg sm:p-7">
          <Link to="/property/dashboard" className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-indigo-700">
            <ArrowLeft size={15} />
            {t('Back to Dashboard', 'ወደ ዳሽቦርድ ተመለስ')}
          </Link>

          <div className="mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <Shield size={28} />
          </div>
          <h1 className="mt-4 text-center text-xl font-bold text-slate-900">{t('Change Password', 'የይለፍ ቃል ቀይር')}</h1>
          <p className="mt-1 text-center text-xs text-slate-500">{t('Update your password to keep your account secure.', 'መለያዎን ደህንነቱን ለመጠበቅ የይለፍ ቃልዎን ያዘምኑ።')}</p>

          {message && (
            <div role="status" className={`mt-5 rounded-md border p-3 text-xs font-medium ${message.includes('successfully') || message.includes('በተሳካ') ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
              {message}
            </div>
          )}

          <form onSubmit={changePassword} className="mt-6 space-y-4">
            <PasswordInput
              t={t}
              label="Current Password"
              placeholder="Enter current password"
              value={passwords.currentPassword}
              visible={visiblePasswords.current}
              onToggle={() => setVisiblePasswords((current) => ({ ...current, current: !current.current }))}
              onChange={(value) => setPasswords((current) => ({ ...current, currentPassword: value }))}
            />
            <PasswordInput
              t={t}
              label="New Password"
              placeholder="Enter new password"
              value={passwords.newPassword}
              visible={visiblePasswords.new}
              onToggle={() => setVisiblePasswords((current) => ({ ...current, new: !current.new }))}
              onChange={(value) => setPasswords((current) => ({ ...current, newPassword: value }))}
            />
            <PasswordInput
              t={t}
              label="Confirm New Password"
              placeholder="Confirm new password"
              value={passwords.confirmPassword}
              visible={visiblePasswords.confirm}
              onToggle={() => setVisiblePasswords((current) => ({ ...current, confirm: !current.confirm }))}
              onChange={(value) => setPasswords((current) => ({ ...current, confirmPassword: value }))}
            />
            <button
              type="submit"
              disabled={changingPassword}
              className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
            >
              {changingPassword ? t('Updating Password...', 'የይለፍ ቃሉን በማዘመን ላይ...') : t('Update Password', 'የይለፍ ቃል አዘምን')}
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f8f9fc] p-3 text-xs text-slate-800 sm:p-5">
      <div className="mx-auto max-w-md">
        {message && (
          <div role="status" className="mb-4 rounded border border-teal-200 bg-teal-50 p-3 font-semibold text-teal-800">
            {message}
          </div>
        )}

        <form onSubmit={saveProfile} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="h-2 bg-amber-50" />
          <div className="px-4 py-4 sm:px-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{t('Account', 'መለያ')}</p>
            <h1 className="mt-1 text-lg font-bold text-slate-900">{t('Profile', 'መገለጫ')}</h1>
            <p className="mt-1 text-[10px] text-slate-500">{t('Your authenticated PES account details.', 'የተረጋገጡ የPES መለያ ዝርዝሮችዎ።')}</p>

            <div className="mt-4 flex items-center gap-2.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                {profileImage ? (
                  <img src={profileImage} alt={t('Profile', 'መገለጫ')} className="h-full w-full object-cover" />
                ) : (
                  <UniversitySeal className="h-10 w-10" />
                )}
              </div>
              <label className={`inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[9px] font-semibold text-slate-700 transition hover:bg-slate-100 ${photoSaving ? 'pointer-events-none opacity-60' : ''}`}>
                <Camera size={12} />
                {photoSaving ? t('Uploading...', 'በመጫን ላይ...') : t('Change Profile Photo', 'የመገለጫ ፎቶ ቀይር')}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={changePhoto}
                  disabled={photoSaving}
                  className="hidden"
                />
              </label>
            </div>

            <div className="mt-4 space-y-2">
              <ProfileField label={t('Full Name', 'ሙሉ ስም')}>
                <input
                  value={form.fullName}
                  onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                  autoComplete="name"
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </ProfileField>
              <ProfileField label={t('Email Address', 'የኢሜይል አድራሻ')}>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  autoComplete="email"
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </ProfileField>
              <ProfileField label={t('Role / Title', 'ሚና / ማዕረግ')}>
                <input
                  value={value('position', value('role', t('Property / Asset Officer', 'የንብረት ኦፊሰር')))}
                  readOnly
                  className="w-full rounded-md border border-slate-100 bg-slate-100 px-2.5 py-1.5 text-[10px] text-slate-500"
                />
              </ProfileField>
              <ProfileField label={t('Department', 'የስራ ክፍል')}>
                <input
                  value={value('department', t('Not assigned', 'አልተመደበም'))}
                  readOnly
                  className="w-full rounded-md border border-slate-100 bg-slate-100 px-2.5 py-1.5 text-[10px] text-slate-500"
                />
              </ProfileField>
              <ProfileField label={t('Phone Number', 'ስልክ ቁጥር')}>
                <input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })}
                  autoComplete="tel"
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </ProfileField>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-3 rounded-md bg-indigo-700 px-3 py-1.5 text-[9px] font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? t('Saving...', 'በማስቀመጥ ላይ...') : t('Save Profile', 'መገለጫውን አስቀምጥ')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

function ProfileField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function PasswordInput({ label, placeholder, value, visible, onToggle, onChange, t }) {
  const translations = {
    'Current Password': 'የአሁኑ የይለፍ ቃል',
    'New Password': 'አዲስ የይለፍ ቃል',
    'Confirm New Password': 'አዲሱን የይለፍ ቃል ያረጋግጡ',
    'Enter current password': 'የአሁኑን የይለፍ ቃል ያስገቡ',
    'Enter new password': 'አዲሱን የይለፍ ቃል ያስገቡ',
    'Confirm new password': 'አዲሱን የይለፍ ቃል ያረጋግጡ',
  };
  const visibleLabel = t(label, translations[label]);
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">{visibleLabel}</span>
      <span className="relative block">
        <LockKeyhole size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          placeholder={t(placeholder, translations[placeholder])}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={label === 'Current Password' ? 'current-password' : 'new-password'}
          required
          className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-11 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={`${visible ? t('Hide', 'ደብቅ') : t('Show', 'አሳይ')} ${visibleLabel.toLowerCase()}`}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </span>
    </label>
  );
}
