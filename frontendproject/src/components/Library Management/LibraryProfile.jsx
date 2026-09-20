import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/authContext';
import {
  User,
  Briefcase,
  Phone,
  Lock,
  Camera,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  ShieldAlert
} from 'lucide-react';

const formatDate = (value) => {
  if (!value) return 'Not provided';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB');
};

export default function LibraryProfile() {
  const { user } = useAuth();
  const userId = user?._id || user?.id || localStorage.getItem('userId') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [toast, setToast] = useState({ type: '', message: '' });

  // Read-only + Editable State
  const [profile, setProfile] = useState({
    fullName: user?.name || 'Library Officer',
    employeeId: user?.employeeId || 'Not assigned',
    gender: 'Not provided',
    dateOfBirth: 'Not provided',
    department: user?.department || 'Library',
    position: user?.role || 'Library Officer',
    campus: 'Main (Peda) Campus',
    employeeStatus: 'Active',
    employmentDate: 'Not provided',
    email: user?.email || '',
    phoneNumber: '',
    alternativePhone: '',
    profilePhoto: ''
  });

  // Security (Password Change) State
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Fetch Profile Info
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await axios.get(`http://localhost:3000/api/profile/${userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
        });
        const userData = res.data?.data || res.data || {};

        setProfile((prev) => ({
          ...prev,
          fullName: userData.name || prev.fullName,
          employeeId: userData.employeeId || prev.employeeId,
          gender: userData.gender || prev.gender,
          dateOfBirth: userData.dateOfBirth ? formatDate(userData.dateOfBirth) : prev.dateOfBirth,
          department: userData.department || prev.department,
          position: userData.position || user?.role || prev.position,
          campus: userData.campus || prev.campus,
          employeeStatus: userData.status || prev.employeeStatus,
          employmentDate: userData.dateJoined ? formatDate(userData.dateJoined) : prev.employmentDate,
          email: userData.email || prev.email,
          phoneNumber: userData.phoneNumber || prev.phoneNumber,
          alternativePhone: userData.alternativePhone || prev.alternativePhone,
          profilePhoto: userData.profileImage || userData.profilePhoto || prev.profilePhoto
        }));
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, user?.role]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: '', message: '' }), 4000);
  };

  // Image Upload Handler
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((prev) => ({ ...prev, profilePhoto: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Profile Form Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name: profile.fullName,
        email: profile.email,
        phoneNumber: profile.phoneNumber,
        alternativePhone: profile.alternativePhone,
        gender: profile.gender,
        dateOfBirth: profile.dateOfBirth,
        profileImage: profile.profilePhoto,
        campus: profile.campus
      };

      await axios.put(`http://localhost:3000/api/profile/${userId}`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
      });
      showToast('success', 'Profile information updated successfully!');
    } catch (err) {
      showToast('error', err.response?.data?.message || err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  // Password Change Handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      showToast('error', 'New passwords do not match!');
      return;
    }

    try {
      setChangingPass(true);
      await axios.patch(`http://localhost:3000/api/profile/${userId}/password`, passwords, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
      });
      showToast('success', 'Password updated successfully!');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to change password.');
    } finally {
      setChangingPass(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-500">
        <Loader2 className="animate-spin mr-2" size={20} />
        <span>Loading Profile...</span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-xs text-slate-700">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header Toast Notification */}
        {toast.message && (
          <div
            className={`p-3 rounded-xl border flex items-center space-x-2 font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* 📷 Profile Photo Header Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-teal-600 flex items-center justify-center overflow-hidden shadow-inner">
              {profile.profilePhoto ? (
                <img src={profile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-slate-400" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-full cursor-pointer shadow-md transition-colors">
              <Camera size={14} />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>

          <div className="text-center sm:text-left space-y-1">
            <h1 className="text-lg font-bold text-slate-900">{profile.fullName}</h1>
            <p className="text-xs font-semibold text-teal-700">{profile.position}</p>
            <p className="text-[11px] text-slate-500">{profile.department} • {profile.campus}</p>
          </div>
        </div>

        {/* 1. 👤 Personal Information (Read-Only) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center space-x-2">
            <User size={16} className="text-teal-700" />
            <h2 className="font-bold text-slate-900">Personal Information</h2>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 font-medium mb-1">Full Name</label>
              <input type="text" value={profile.fullName} disabled className="w-full bg-slate-100 border border-slate-200 text-slate-600 rounded-lg p-2 cursor-not-allowed font-medium" />
            </div>
            <div>
              <label className="block text-slate-500 font-medium mb-1">Employee ID</label>
              <input type="text" value={profile.employeeId} disabled className="w-full bg-slate-100 border border-slate-200 text-slate-600 rounded-lg p-2 cursor-not-allowed font-medium" />
            </div>
            <div>
              <label className="block text-slate-500 font-medium mb-1">Gender</label>
              <input type="text" value={profile.gender} disabled className="w-full bg-slate-100 border border-slate-200 text-slate-600 rounded-lg p-2 cursor-not-allowed font-medium" />
            </div>
            <div>
              <label className="block text-slate-500 font-medium mb-1">Date of Birth</label>
              <input type="text" value={profile.dateOfBirth} disabled className="w-full bg-slate-100 border border-slate-200 text-slate-600 rounded-lg p-2 cursor-not-allowed font-medium" />
            </div>
          </div>
        </div>

        {/* 2. 💼 Employment Information (Read-Only) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center space-x-2">
            <Briefcase size={16} className="text-teal-700" />
            <h2 className="font-bold text-slate-900">Employment Information</h2>
            <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 flex items-center space-x-1 ml-auto">
              <ShieldAlert size={12} />
              <span>Managed by HR / Admin</span>
            </span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-500 font-medium mb-1">Department</label>
              <input type="text" value={profile.department} disabled className="w-full bg-slate-100 border border-slate-200 text-slate-600 rounded-lg p-2 cursor-not-allowed font-medium" />
            </div>
            <div>
              <label className="block text-slate-500 font-medium mb-1">Position</label>
              <input type="text" value={profile.position} disabled className="w-full bg-slate-100 border border-slate-200 text-slate-600 rounded-lg p-2 cursor-not-allowed font-medium" />
            </div>
            <div>
              <label className="block text-slate-500 font-medium mb-1">Campus</label>
              <input type="text" value={profile.campus} disabled className="w-full bg-slate-100 border border-slate-200 text-slate-600 rounded-lg p-2 cursor-not-allowed font-medium" />
            </div>
            <div>
              <label className="block text-slate-500 font-medium mb-1">Employee Status</label>
              <input type="text" value={profile.employeeStatus} disabled className="w-full bg-slate-100 border border-slate-200 text-emerald-700 font-semibold rounded-lg p-2 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-slate-500 font-medium mb-1">Employment Date</label>
              <input type="text" value={profile.employmentDate} disabled className="w-full bg-slate-100 border border-slate-200 text-slate-600 rounded-lg p-2 cursor-not-allowed font-medium" />
            </div>
          </div>
        </div>

        {/* 3. 📞 Contact Information (Editable) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Phone size={16} className="text-teal-700" />
              <h2 className="font-bold text-slate-900">Contact Information</h2>
            </div>
            <span className="text-[10px] text-teal-700 font-semibold">Editable</span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Phone Number *</label>
              <input
                type="text"
                value={profile.phoneNumber}
                onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Email Address *</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Alternative Phone</label>
              <input
                type="text"
                value={profile.alternativePhone}
                onChange={(e) => setProfile({ ...profile, alternativePhone: e.target.value })}
                className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>
          </div>
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold flex items-center space-x-2 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              <span>Save Contact Changes</span>
            </button>
          </div>
        </div>

        {/* 🔐 4. Security / Change Password */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center space-x-2">
            <Lock size={16} className="text-teal-700" />
            <h2 className="font-bold text-slate-900">Security - Change Password</h2>
          </div>
          <form onSubmit={handleChangePassword} className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Current Password *</label>
                <input
                  type="password"
                  required
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Confirm Password *</label>
                <input
                  type="password"
                  required
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={changingPass}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold flex items-center space-x-2 transition-colors disabled:opacity-50"
              >
                {changingPass ? <Loader2 className="animate-spin" size={14} /> : <Lock size={14} />}
                <span>Update Password</span>
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}