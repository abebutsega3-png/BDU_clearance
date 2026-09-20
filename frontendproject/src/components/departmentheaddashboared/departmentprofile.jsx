import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/authContext';
import { changeMyPassword, fetchMyProfile, getMyProfileHeaders, updateMyProfile } from '../../until/MyprofileHelper';
import { BriefcaseBusiness, Camera, KeyRound, Mail, Phone, ShieldCheck, User, UserRound } from 'lucide-react';
import axios from 'axios';

const value = (item, fallback = 'Not provided') => item || fallback;

export default function DepartmentProfile() {
	const { user, login } = useAuth();
	const [profile, setProfile] = useState({});
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState('');
	const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
	const [passwordMessage, setPasswordMessage] = useState('');
	const [passwordSaving, setPasswordSaving] = useState(false);

	useEffect(() => {
		if (!user?._id) return;
		fetchMyProfile(user._id).then((data) => setProfile(data)).catch(() => setMessage('Unable to load profile information.'));
	}, [user?._id]);

	const current = { ...user, ...profile };
	const update = (field, nextValue) => setProfile((previous) => ({ ...previous, [field]: nextValue }));
	const save = async () => {
		setSaving(true);
		try {
			const response = await updateMyProfile(user._id, { name: profile.name, email: profile.email, phoneNumber: profile.phoneNumber, gender: profile.gender });
			const updated = response.data || response;
			setProfile(updated); login({ ...user, ...updated }); setEditing(false); setMessage('Profile updated successfully.');
		} catch (error) { setMessage(error.response?.data?.message || 'Unable to update profile.'); } finally { setSaving(false); }
	};
	const changePassword = async (event) => {
		event.preventDefault(); setPasswordMessage('');
		if (passwords.newPassword !== passwords.confirmPassword) return setPasswordMessage('New passwords do not match.');
		setPasswordSaving(true);
		try { const response = await changeMyPassword(user._id, passwords); setPasswordMessage(response.message || 'Password changed successfully.'); setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' }); }
		catch (error) { setPasswordMessage(error.response?.data?.message || 'Unable to change password.'); } finally { setPasswordSaving(false); }
	};
	const changePhoto = async (event) => {
		const file = event.target.files?.[0];
		if (!file || !file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) return setMessage('Choose an image up to 2MB.');
		const reader = new FileReader(); reader.onload = async () => { try { const response = await axios.put(`http://localhost:3000/api/profile/${user._id}`, { profileImage: reader.result }, { headers: getMyProfileHeaders() }); const updated = response.data.data || response.data; setProfile(updated); login({ ...user, ...updated }); setMessage('Profile photo updated successfully.'); } catch (error) { setMessage(error.response?.data?.message || 'Unable to update profile photo.'); } }; reader.readAsDataURL(file);
	};

	return <div className="space-y-5 text-slate-700">
		<header><p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Department Head Portal</p><h1 className="mt-1 text-2xl font-bold text-slate-900">My Profile</h1><p className="mt-1 text-sm text-slate-500">Manage your personal and account information.</p></header>
		{message && <p className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">{message}</p>}
		<div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
			<div className="space-y-5">
				<section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><SectionTitle icon={<User size={17} />} title="Personal Information"><div className="flex flex-col gap-5 sm:flex-row"><div className="flex shrink-0 flex-col items-center gap-2"><div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-teal-100 bg-teal-50 text-teal-700">{current.profileImage ? <img src={current.profileImage} alt="Profile" className="h-full w-full object-cover" /> : <UserRound size={42} />}</div><label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-teal-500"><Camera size={14} /> Change Photo<input type="file" accept="image/png,image/jpeg,image/gif" onChange={changePhoto} className="hidden" /></label></div><div className="grid flex-1 gap-4 sm:grid-cols-2"><Editable label="Full Name" value={current.name} editing={editing} onChange={(next) => update('name', next)} /><ReadOnly label="Employee ID" value={value(current.employeeId)} /><ReadOnly label="Gender" value={value(current.gender)} /><Editable label="Phone Number" value={current.phoneNumber} editing={editing} onChange={(next) => update('phoneNumber', next)} icon={<Phone size={14} />} /><Editable label="Email Address" value={current.email} editing={editing} onChange={(next) => update('email', next)} icon={<Mail size={14} />} /></div></div></SectionTitle><div className="mt-5 flex justify-end gap-2">{editing && <button type="button" onClick={() => setEditing(false)} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold">Cancel</button>}<button type="button" onClick={editing ? save : () => setEditing(true)} disabled={saving} className="rounded-md bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800">{editing ? (saving ? 'Saving...' : 'Save Profile') : 'Edit Profile'}</button></div></section>
				<section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><SectionTitle icon={<BriefcaseBusiness size={17} />} title="Work Information"><div className="mt-4 grid gap-4 sm:grid-cols-2"><ReadOnly label="Department" value={value(current.department)} /><ReadOnly label="Position" value={value(current.position, 'Department Head')} /><ReadOnly label="Role" value={value(current.role, 'Department Head')} /><ReadOnly label="Employee Status" value={value(current.status, 'Active')} /><ReadOnly label="Date Joined" value={current.dateJoined ? new Date(current.dateJoined).toLocaleDateString() : 'Not provided'} /></div><p className="mt-4 text-xs text-slate-500">Work information is managed by HR Officer or System Admin.</p></SectionTitle></section>
			</div>
			<div className="space-y-5"><section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><SectionTitle icon={<ShieldCheck size={17} />} title="Account Information"><div className="mt-4 space-y-3"><ReadOnly label="Username" value={value(current.username, current.email)} /><ReadOnly label="Email" value={value(current.email)} /><ReadOnly label="Last Login" value={current.lastLogin ? new Date(current.lastLogin).toLocaleString() : 'Not provided'} /></div></SectionTitle></section><form onSubmit={changePassword} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><SectionTitle icon={<KeyRound size={17} />} title="Change Password"><div className="mt-4 space-y-3">{[['currentPassword', 'Current Password'], ['newPassword', 'New Password'], ['confirmPassword', 'Confirm New Password']].map(([field, label]) => <label key={field} className="block text-xs font-semibold text-slate-500">{label}<input required minLength={field === 'currentPassword' ? undefined : 6} type="password" value={passwords[field]} onChange={(event) => setPasswords((previous) => ({ ...previous, [field]: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-teal-600" /></label>)}</div><button type="submit" disabled={passwordSaving} className="mt-4 inline-flex items-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"><KeyRound size={14} /> {passwordSaving ? 'Changing...' : 'Change Password'}</button>{passwordMessage && <p className="mt-2 text-xs text-slate-600">{passwordMessage}</p>}</SectionTitle></form></div>
		</div>
	</div>;
}

function SectionTitle({ icon, title, children }) { return <><div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-bold text-slate-900"><span className="text-teal-600">{icon}</span>{title}</div>{children}</>; }
function ReadOnly({ label, value: fieldValue }) { return <div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{fieldValue}</p></div>; }
function Editable({ label, value: fieldValue, editing, onChange, icon }) { return <label className="block text-xs text-slate-500">{label}<span className="relative mt-1 block">{icon && <span className="absolute left-3 top-2.5 text-slate-400">{icon}</span>}<input value={fieldValue || ''} readOnly={!editing} onChange={(event) => onChange(event.target.value)} className={`w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-600 ${icon ? 'pl-9' : ''} ${!editing ? 'border-transparent bg-slate-50' : ''}`} /></span></label>; }
