import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Camera, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound, X } from "lucide-react";
import { useAuth } from "../../context/authContext";

const API_URL = "http://localhost:3000/api/finance/profile";
const MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024;

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

const FinanceProfilePage = () => {
  const [searchParams] = useSearchParams();
  const { updateUser } = useAuth();
  const photoInputRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [editForm, setEditForm] = useState({
    phoneNumber: "",
    alternativePhone: "",
    email: "",
    profileImage: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState({ type: "", text: "" });
  const isChangePasswordPage = searchParams.get("action") === "change-password";

  useEffect(() => {
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
          profileImage: user.profileImage || user.profilePhoto || "",
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

    fetchProfile();
  }, []);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Choose a valid image file." });
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      setMessage({ type: "error", text: "Choose an image smaller than 2 MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setEditForm((current) => ({ ...current, profileImage: reader.result }));
        setMessage({ type: "", text: "" });
      } else {
        setMessage({ type: "error", text: "The selected image could not be read." });
      }
    };
    reader.onerror = () => {
      setMessage({ type: "error", text: "The selected image could not be read." });
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await apiUpdateFinanceProfile({
        phoneNumber: editForm.phoneNumber,
        alternativePhone: editForm.alternativePhone,
        email: editForm.email,
        profileImage: editForm.profileImage,
      });
      const updatedProfile = res?.data || { ...profile, ...editForm };
      setProfile(updatedProfile);
      updateUser({
        email: updatedProfile.email,
        profileImage: updatedProfile.profileImage,
        profilePhoto: updatedProfile.profileImage,
      });
      setMessage({ type: "success", text: "Profile changes saved successfully." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Unable to save profile changes.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-500 shadow-sm">
          Loading finance profile information...
        </div>
      </div>
    );
  }

  const displayName = profile?.name || profile?.fullName || "Finance Officer";
  const role = profile?.position || profile?.role || "Finance Officer";
  const department = profile?.department || "Finance";

  if (isChangePasswordPage) {
    const passwordFields = [
      { key: "currentPassword", label: "Current Password", placeholder: "Enter current password" },
      { key: "newPassword", label: "New Password", placeholder: "Enter new password" },
      { key: "confirmPassword", label: "Confirm New Password", placeholder: "Confirm new password" },
    ];

    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-slate-50 px-4 py-8">
        <section className="w-full max-w-md rounded-xl border border-slate-100 bg-white p-6 shadow-lg sm:p-8">
          <Link
            to="/finance-office"
            className="mb-5 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 transition hover:text-indigo-600"
          >
            <ArrowLeft size={13} /> Back to Dashboard
          </Link>

          <div className="mb-5 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <ShieldCheck size={21} />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Change Password</h1>
            <p className="mt-1 text-[11px] text-slate-500">You must update your password before continuing.</p>
          </div>

          {message.text && (
            <div
              role={message.type === "error" ? "alert" : "status"}
              className={`mb-4 rounded-lg border px-3 py-2 text-[11px] font-medium ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            {passwordFields.map(({ key, label, placeholder }) => {
              const FieldIcon = passwordVisible[key] ? EyeOff : Eye;
              return (
                <label key={key} className="block text-[10px] font-semibold text-slate-700">
                  {label}
                  <span className="mt-1 flex items-center rounded-md border border-slate-200 px-2.5 transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
                    <LockKeyhole size={13} className="shrink-0 text-slate-400" />
                    <input
                      type={passwordVisible[key] ? "text" : "password"}
                      value={passwordForm[key]}
                      onChange={(event) => setPasswordForm((current) => ({ ...current, [key]: event.target.value }))}
                      placeholder={placeholder}
                      autoComplete={key === "currentPassword" ? "current-password" : "new-password"}
                      className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-[11px] font-normal text-slate-700 outline-none placeholder:text-slate-400"
                      required
                    />
                    <button
                      type="button"
                      aria-label={`${passwordVisible[key] ? "Hide" : "Show"} ${label.toLowerCase()}`}
                      onClick={() => setPasswordVisible((current) => ({ ...current, [key]: !current[key] }))}
                      className="shrink-0 p-1 text-slate-400 transition hover:text-slate-600"
                    >
                      <FieldIcon size={14} />
                    </button>
                  </span>
                </label>
              );
            })}

            <button
              type="submit"
              className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Update Password
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-50 px-4 py-8 text-slate-800 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleProfileSubmit} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-500">Account</p>
            <h1 className="mt-1 text-xl font-bold text-slate-900">Profile</h1>
            <p className="mt-1 text-xs text-slate-500">Your authenticated finance office account details.</p>
          </div>

          <div className="space-y-4 px-6 py-5 sm:px-8">
            {message.text && (
              <div
                role="status"
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-xs font-medium ${
                  message.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                <span>{message.text}</span>
                <button type="button" aria-label="Dismiss message" onClick={() => setMessage({ type: "", text: "" })}>
                  <X size={15} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                {editForm.profileImage ? (
                  <img src={editForm.profileImage} alt={`${displayName} profile`} className="h-full w-full object-cover" />
                ) : (
                  <UserRound size={28} className="text-slate-400" />
                )}
              </div>
              <div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="sr-only"
                  aria-label="Choose profile photo"
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  <Camera size={13} /> Change Profile Photo
                </button>
                <p className="mt-1 text-[10px] text-slate-400">Image files up to 2 MB</p>
              </div>
            </div>

            <label className="block text-[11px] font-semibold text-slate-700">
              Full Name
              <input
                type="text"
                value={displayName}
                readOnly
                className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-700 outline-none"
              />
            </label>

            <label className="block text-[11px] font-semibold text-slate-700">
              Email Address
              <input
                type="email"
                required
                value={editForm.email}
                onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
                className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </label>

            <label className="block text-[11px] font-semibold text-slate-700">
              Role / Title
              <input
                type="text"
                value={role}
                readOnly
                className="mt-1 block w-full rounded-md border border-slate-100 bg-slate-100 px-3 py-2 text-xs font-normal text-slate-500 outline-none"
              />
            </label>

            <label className="block text-[11px] font-semibold text-slate-700">
              Department
              <input
                type="text"
                value={department}
                readOnly
                className="mt-1 block w-full rounded-md border border-slate-100 bg-slate-100 px-3 py-2 text-xs font-normal text-slate-500 outline-none"
              />
            </label>

            <label className="block text-[11px] font-semibold text-slate-700">
              Phone Number
              <input
                type="tel"
                value={editForm.phoneNumber}
                onChange={(event) => setEditForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                placeholder="Enter phone number"
                className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-indigo-600 px-4 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Profile Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FinanceProfilePage;
