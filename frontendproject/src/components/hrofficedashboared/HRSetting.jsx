import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bell, Check, LockKeyhole, Save, Settings, ShieldCheck, UserRound } from 'lucide-react';

const API_URL = 'http://localhost:3000/api/settings';
const defaults = {
	requiredOffices: { departmentHead: true, finance: true, property: true, ict: true, library: true },
	finalHrClearanceEnabled: true,
	generateCertificateAfterApproval: true,
	notifications: { newClearanceRequest: true, clearanceProgressUpdated: true, clearanceResubmitted: true, allOfficesApproved: true, clearanceCompleted: true, certificateGenerated: true },
	certificate: { generation: 'Automatic (Recommended)', trigger: 'After HR Approval', numberPrefix: 'BDU-CLR', format: 'PDF' },
	security: { sessionTimeout: '30 minutes', notifyOnNewLogin: true },
};

const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
const mergeSettings = (incoming = {}) => ({ ...defaults, ...incoming, requiredOffices: { ...defaults.requiredOffices, ...(incoming.requiredOffices || {}) }, notifications: { ...defaults.notifications, ...(incoming.notifications || {}) }, certificate: { ...defaults.certificate, ...(incoming.certificate || {}) }, security: { ...defaults.security, ...(incoming.security || {}) } });

function Section({ title, icon: Icon, children, className = '' }) { return <section className={`rounded-md border border-slate-200 bg-white shadow-sm ${className}`}><div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 text-[11px] font-bold text-blue-700"><Icon size={14} />{title}</div><div className="p-3">{children}</div></section>; }
function Toggle({ checked, onChange, label }) { return <label className="flex cursor-pointer items-center gap-2 text-[10px] text-slate-700"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-3.5 w-3.5 accent-blue-600" />{label}</label>; }
function Field({ label, children }) { return <label className="block text-[10px] font-semibold text-slate-600"><span className="mb-1 block">{label}</span>{children}</label>; }
const inputClass = 'w-full rounded border border-slate-200 px-2 py-1.5 text-[10px] text-slate-700 outline-none focus:border-blue-500';

export default function HRSetting() {
	const [settings, setSettings] = useState(defaults);
	const [profile, setProfile] = useState({});
	const [editingProfile, setEditingProfile] = useState(false);
	const [profileDraft, setProfileDraft] = useState({ name: '', email: '', phoneNumber: '' });
	const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState('');

	useEffect(() => {
		Promise.allSettled([axios.get(API_URL, auth()), axios.get('http://localhost:3000/api/auth/profile', auth())]).then(([settingsResult, profileResult]) => {
			if (settingsResult.status === 'fulfilled') setSettings(mergeSettings(settingsResult.value.data.settings?.hrSettings));
			if (profileResult.status === 'fulfilled') {
				const loadedProfile = profileResult.value.data.user || profileResult.value.data.profile || profileResult.value.data.data || profileResult.value.data;
				setProfile(loadedProfile);
				setProfileDraft({ name: loadedProfile.name || loadedProfile.fullName || '', email: loadedProfile.email || '', phoneNumber: loadedProfile.phoneNumber || loadedProfile.phone || '' });
			}
		}).finally(() => setLoading(false));
	}, []);

	const update = (section, key, value) => setSettings((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));
	const saveSettings = async () => { setSaving(true); setMessage(''); try { await axios.put(`${API_URL}/hrSettings`, settings, auth()); setMessage('Settings saved successfully.'); } catch (error) { setMessage(error.response?.data?.message || 'Unable to save settings.'); } finally { setSaving(false); } };
	const saveProfile = async () => { setSaving(true); setMessage(''); try { const response = await axios.put(`http://localhost:3000/api/profile/${profile._id || profile.id}`, profileDraft, auth()); const updatedProfile = response.data.data || response.data; setProfile((current) => ({ ...current, ...updatedProfile })); setEditingProfile(false); setMessage('Profile updated successfully.'); } catch (error) { setMessage(error.response?.data?.message || 'Unable to update profile.'); } finally { setSaving(false); } };
	const changePassword = async (event) => { event.preventDefault(); if (password.newPassword !== password.confirmPassword) return setMessage('New passwords do not match.'); try { await axios.patch(`http://localhost:3000/api/profile/${profile._id || profile.id}/password`, password, auth()); setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' }); setMessage('Password changed successfully.'); } catch (error) { setMessage(error.response?.data?.message || 'Unable to change password.'); } };

	if (loading) return <div className="p-6 text-center text-xs text-slate-500">Loading settings...</div>;
	return <div className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-5"><div className="mx-auto max-w-5xl">
		<div className="mb-3 flex items-center justify-between"><div><h1 className="text-base font-bold text-slate-900">Settings</h1><p className="text-[10px] text-slate-500">Configure HR clearance workflow, notifications, certificates, and account security.</p></div>{message && <span className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-semibold text-blue-700">{message}</span>}</div>
		<div className="mb-3 flex gap-1 overflow-x-auto rounded border border-slate-200 bg-white p-1 text-[10px] font-semibold text-slate-500"><span className="rounded bg-blue-50 px-3 py-2 text-blue-700">Workflow</span><span className="px-3 py-2">Notifications</span><span className="px-3 py-2">Certificate</span><span className="px-3 py-2">Account</span><span className="px-3 py-2">Security</span></div>
		<div className="grid gap-3 lg:grid-cols-3">
			<Section title="1. Clearance Workflow Settings" icon={Settings}><p className="mb-2 text-[9px] font-bold text-slate-500">REQUIRED CLEARANCE OFFICES</p><div className="space-y-2">{Object.entries({ departmentHead: 'Department Head', finance: 'Finance Office', property: 'Property / Asset Office', ict: 'ICT Office', library: 'Library' }).map(([key, label]) => <Toggle key={key} label={label} checked={settings.requiredOffices[key]} onChange={(value) => update('requiredOffices', key, value)} />)}</div><div className="my-3 border-t border-slate-100" /><Toggle label="Final HR Clearance" checked={settings.finalHrClearanceEnabled} onChange={(value) => setSettings((current) => ({ ...current, finalHrClearanceEnabled: value }))} /><Toggle label="Generate after Final HR Approval" checked={settings.generateCertificateAfterApproval} onChange={(value) => setSettings((current) => ({ ...current, generateCertificateAfterApproval: value }))} /></Section>
			<Section title="2. Notification Settings" icon={Bell}><div className="space-y-2">{Object.entries({ newClearanceRequest: 'New Clearance Request', clearanceProgressUpdated: 'Clearance Progress Updated', clearanceResubmitted: 'Clearance Request Resubmitted', allOfficesApproved: 'All Offices Approved', clearanceCompleted: 'Clearance Completed', certificateGenerated: 'Certificate Generated' }).map(([key, label]) => <Toggle key={key} label={label} checked={settings.notifications[key]} onChange={(value) => update('notifications', key, value)} />)}</div><div className="mt-3 border-t border-slate-100 pt-3"><Toggle label="Enable Email Notifications" checked={settings.notifications.newClearanceRequest} onChange={(value) => update('notifications', 'newClearanceRequest', value)} /></div></Section>
			<Section title="3. Certificate Settings" icon={Check}><div className="space-y-3"><Field label="CERTIFICATE GENERATION"><select className={inputClass} value={settings.certificate.generation} onChange={(e) => update('certificate', 'generation', e.target.value)}><option>Automatic (Recommended)</option><option>Manual</option></select></Field><Field label="GENERATE CERTIFICATE WHEN"><select className={inputClass} value={settings.certificate.trigger} onChange={(e) => update('certificate', 'trigger', e.target.value)}><option>After HR Approval</option><option>After All Offices Approved</option></select></Field><Field label="CERTIFICATE NUMBER"><input className={inputClass} value={settings.certificate.numberPrefix} onChange={(e) => update('certificate', 'numberPrefix', e.target.value)} /></Field><Field label="CERTIFICATE FORMAT"><select className={inputClass} value={settings.certificate.format} onChange={(e) => update('certificate', 'format', e.target.value)}><option>PDF</option><option>PDF and QR Code</option></select></Field></div></Section>
			<Section title="4. Account Settings" icon={UserRound}><div className="space-y-3"><Field label="FULL NAME"><input className={inputClass} readOnly={!editingProfile} value={editingProfile ? profileDraft.name : (profile.fullName || profile.name || '')} onChange={(e) => setProfileDraft((current) => ({ ...current, name: e.target.value }))} /></Field><Field label="EMAIL"><input className={inputClass} readOnly={!editingProfile} value={editingProfile ? profileDraft.email : (profile.email || '')} onChange={(e) => setProfileDraft((current) => ({ ...current, email: e.target.value }))} /></Field><Field label="PHONE NUMBER"><input className={inputClass} readOnly={!editingProfile} value={editingProfile ? profileDraft.phoneNumber : (profile.phone || profile.phoneNumber || '')} onChange={(e) => setProfileDraft((current) => ({ ...current, phoneNumber: e.target.value }))} /></Field>{editingProfile ? <div className="flex gap-2"><button type="button" disabled={saving} onClick={saveProfile} className="rounded bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white">{saving ? 'Saving...' : 'Save Profile'}</button><button type="button" onClick={() => setEditingProfile(false)} className="rounded border border-slate-300 px-3 py-1.5 text-[10px] font-semibold text-slate-600">Cancel</button></div> : <button type="button" onClick={() => setEditingProfile(true)} className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white"><UserRound size={12} />Update Profile</button>}</div></Section>
			<Section title="5. Change Password" icon={LockKeyhole}><form className="space-y-3" onSubmit={changePassword}>{[['currentPassword', 'CURRENT PASSWORD'], ['newPassword', 'NEW PASSWORD'], ['confirmPassword', 'CONFIRM NEW PASSWORD']].map(([key, label]) => <Field key={key} label={label}><input required type="password" className={inputClass} value={password[key]} onChange={(e) => setPassword((current) => ({ ...current, [key]: e.target.value }))} /></Field>)}<button type="submit" className="rounded bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white">Change Password</button></form></Section>
			<Section title="6. Security Settings" icon={ShieldCheck}><Field label="SESSION TIMEOUT"><select className={inputClass} value={settings.security.sessionTimeout} onChange={(e) => update('security', 'sessionTimeout', e.target.value)}><option>15 minutes</option><option>30 minutes</option><option>60 minutes</option></select></Field><div className="mt-3"><Toggle label="Notify me about new login" checked={settings.security.notifyOnNewLogin} onChange={(value) => update('security', 'notifyOnNewLogin', value)} /></div><div className="mt-4 flex gap-2 rounded border border-blue-100 bg-blue-50 p-2 text-[9px] text-blue-700"><ShieldCheck size={14} /><span>This security setting helps keep your account and data secure.</span></div></Section>
		</div><div className="mt-3 flex justify-end"><button type="button" disabled={saving} onClick={saveSettings} className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-[10px] font-bold text-white disabled:opacity-60"><Save size={13} />{saving ? 'Saving...' : 'Save All Changes'}</button></div>
	</div></div>;
}
