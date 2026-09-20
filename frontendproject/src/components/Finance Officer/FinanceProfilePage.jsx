import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  User,
  Briefcase,
  ShieldCheck,
  KeyRound,
  Edit3,
  Lock,
  X,
  Camera,
} from "lucide-react";

// =========================================================
// 1. INLINE API SERVICE HANDLERS
// =========================================================
const API_URL = "http://localhost:3000/api/finance/profile";

const getAuthConfig = () => {
  const token = localStorage.getItem("token");
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
};

const apiGetFinanceProfile = async () => {
  const res = await axios.get(`${API_URL}/`, getAuthConfig());
  return res.data;
};

const apiUpdateFinanceProfile = async (data) => {
  const res = await axios.put(`${API_URL}/edit`, data, getAuthConfig());
  return res.data;
};

const apiChangePassword = async (data) => {
  const res = await axios.put(`${API_URL}/change-password`, data, getAuthConfig());
  return res.data;
};

// =========================================================
// 2. MAIN PROFILE COMPONENT
// =========================================================
const FinanceProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    phoneNumber: "",
    alternativePhone: "",
    email: "",
    profilePhoto: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState({ type: "", text: "" });

  const safeText = (value, fallback = "N/A") => {
    if (value === null || value === undefined || value === "") return fallback;
    return value;
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await apiGetFinanceProfile();
      const user = res?.data || {};
      setProfile(user);
      setEditForm({
        phoneNumber: user.phoneNumber || "",
        alternativePhone: user.alternativePhone || "",
        email: user.email || "",
        profilePhoto: user.profileImage || user.profilePhoto || "",
      });
    } catch (error) {
      console.error("Failed to load profile:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Profile could not be loaded.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        phoneNumber: editForm.phoneNumber,
        alternativePhone: editForm.alternativePhone,
        email: editForm.email,
        profilePhoto: editForm.profilePhoto,
      };

      const res = await apiUpdateFinanceProfile(payload);
      setProfile(res.data || profile);
      setMessage({ type: "success", text: "Profile updated successfully." });
      setIsEditOpen(false);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Unable to update profile.",
      });
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }

    try {
      await apiChangePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setMessage({ type: "success", text: "Password updated successfully." });
      setIsPasswordOpen(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Unable to change password.",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-500 shadow-sm">
          Loading finance profile information...
        </div>
      </div>
    );
  }

  const displayName = safeText(profile?.name || profile?.fullName, "Abebe Kebede");
  const department = safeText(profile?.department, "Finance");
  const position = safeText(profile?.position, "Finance Officer");
  const employeeId = safeText(profile?.employeeId, "EMP-2023-1025");
  const role = safeText(profile?.role, "Finance Officer");
  const status = safeText(profile?.status || profile?.accountStatus, "Active");
  const username = safeText(profile?.username, "finance.officer");
  const campus = safeText(profile?.campus, "Main Campus");

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-800">
      <div className="mx-auto max-w-6xl">
        {/* Top Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="text-blue-600" size={24} />
            <h1 className="text-xl font-bold text-slate-800">My Profile</h1>
          </div>
          <span className="text-xs text-slate-500">Home &gt; Profile</span>
        </div>

        {message.text && (
          <div
            className={`mb-4 flex items-center justify-between rounded-lg border p-4 text-sm font-medium ${
              message.type === "success"
                ? "border-green-200 bg-green-100 text-green-800"
                : "border-red-200 bg-red-100 text-red-800"
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage({ type: "", text: "" })}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* Main Grid Layout matching the image */}
        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          {/* Left Sidebar Profile Card */}
          <aside className="h-fit rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-inner">
                {profile?.profileImage || profile?.profilePhoto ? (
                  <img
                    src={profile.profileImage || profile.profilePhoto}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User size={56} className="text-slate-400" />
                )}
              </div>
              <h2 className="mt-4 text-base font-bold text-slate-900">{displayName}</h2>
              <p className="text-xs text-slate-500">{position}</p>
              
              <button 
                onClick={() => setIsEditOpen(true)} 
                className="mt-4 flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
              >
                <Camera size={14} /> Change Photo
              </button>

              <div className="mt-6 w-full rounded-lg bg-blue-50/60 p-3.5 text-left text-xs italic leading-relaxed text-slate-600 border border-blue-100">
                &ldquo;Committed to transparent and efficient financial clearance process.&rdquo;
              </div>
            </div>
          </aside>

          {/* Right Content Sections */}
          <div className="space-y-4">
            {/* 1. Personal Information */}
            <section className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between bg-slate-50 px-4 py-3 border-b border-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <User size={16} className="text-blue-600" />
                  <span className="text-sm">Personal Information</span>
                </div>
                <button 
                  onClick={() => setIsEditOpen(true)} 
                  className="flex items-center gap-1 rounded border border-blue-300 bg-white px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition"
                >
                  <Edit3 size={12} /> Edit
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 p-4 text-xs">
                <div className="flex justify-between md:justify-start gap-4">
                  <span className="w-28 text-slate-500">Full Name:</span>
                  <span className="font-semibold text-slate-800">{displayName}</span>
                </div>
                <div className="flex justify-between md:justify-start gap-4">
                  <span className="w-28 text-slate-500">Employee ID:</span>
                  <span className="font-semibold text-slate-800">{employeeId}</span>
                </div>
                <div className="flex justify-between md:justify-start gap-4">
                  <span className="w-28 text-slate-500">Email:</span>
                  <span className="font-semibold text-slate-800">{safeText(profile?.email, "N/A")}</span>
                </div>
                <div className="flex justify-between md:justify-start gap-4">
                  <span className="w-28 text-slate-500">Phone Number:</span>
                  <span className="font-semibold text-slate-800">{safeText(profile?.phoneNumber, "N/A")}</span>
                </div>
              </div>
            </section>

            {/* 2. Work Information */}
            <section className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-slate-800">
                <Briefcase size={16} className="text-blue-600" />
                <span className="text-sm">Work Information</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 p-4 text-xs">
                <div className="flex justify-between md:justify-start gap-4">
                  <span className="w-28 text-slate-500">Role:</span>
                  <span className="font-semibold text-slate-800">{role}</span>
                </div>
                <div className="flex justify-between md:justify-start gap-4">
                  <span className="w-28 text-slate-500">Department:</span>
                  <span className="font-semibold text-slate-800">{department}</span>
                </div>
                <div className="flex justify-between md:justify-start gap-4">
                  <span className="w-28 text-slate-500">Position:</span>
                  <span className="font-semibold text-slate-800">{position}</span>
                </div>
                <div className="flex justify-between md:justify-start gap-4">
                  <span className="w-28 text-slate-500">Campus:</span>
                  <span className="font-semibold text-slate-800">{campus}</span>
                </div>
                <div className="flex justify-between md:justify-start gap-4 items-center">
                  <span className="w-28 text-slate-500">Status:</span>
                  <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-semibold text-green-700">
                    {status}
                  </span>
                </div>
              </div>
            </section>

            {/* 3. Account Information */}
            <section className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-slate-800">
                <KeyRound size={16} className="text-blue-600" />
                <span className="text-sm">Account Information</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 p-4 text-xs">
                <div className="flex justify-between md:justify-start gap-4">
                  <span className="w-28 text-slate-500">Username:</span>
                  <span className="font-semibold text-slate-800">{username}</span>
                </div>
                <div className="flex justify-between md:justify-start gap-4">
                  <span className="w-28 text-slate-500">Email:</span>
                  <span className="font-semibold text-slate-800">{safeText(profile?.email, "N/A")}</span>
                </div>
                <div className="flex justify-between md:justify-start gap-4">
                  <span className="w-28 text-slate-500">Role:</span>
                  <span className="font-semibold text-slate-800">{role}</span>
                </div>
                <div className="flex justify-between md:justify-start gap-4 items-center">
                  <span className="w-28 text-slate-500">Account Status:</span>
                  <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-semibold text-green-700">
                    {status}
                  </span>
                </div>
              </div>
            </section>

            {/* 4. Security Section */}
            <section className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between bg-slate-50 px-4 py-3 border-b border-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <ShieldCheck size={16} className="text-blue-600" />
                  <span className="text-sm">Security</span>
                </div>
                <button
                  onClick={() => setIsPasswordOpen(true)}
                  className="flex items-center gap-1.5 rounded border border-blue-300 bg-white px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition"
                >
                  <Lock size={12} /> Change Password
                </button>
              </div>
              <div className="flex items-center justify-between p-4 text-xs">
                <span className="text-slate-500">Password:</span>
                <span className="font-semibold tracking-widest text-slate-700">********</span>
              </div>
            </section>

            {/* Bottom Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setIsEditOpen(true)} 
                className="flex items-center gap-1.5 rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
              >
                <Edit3 size={14} /> Edit Profile
              </button>
              <button 
                onClick={fetchProfile} 
                className="rounded bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">Edit Profile</h3>
              <button onClick={() => setIsEditOpen(false)}>
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Phone Number</label>
                <input
                  type="text"
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Alternative Phone</label>
                <input
                  type="text"
                  value={editForm.alternativePhone}
                  onChange={(e) => setEditForm({ ...editForm, alternativePhone: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Email Address</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Profile Photo URL</label>
                <input
                  type="text"
                  value={editForm.profilePhoto}
                  onChange={(e) => setEditForm({ ...editForm, profilePhoto: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="https://example.com/photo.jpg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">Change Password</h3>
              <button onClick={() => setIsPasswordOpen(false)}>
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceProfilePage;