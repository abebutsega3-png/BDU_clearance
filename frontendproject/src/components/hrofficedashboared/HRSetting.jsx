import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Bell, Check, Save, Settings, ShieldCheck } from 'lucide-react';

const API_URL = 'http://localhost:3000/api/hr/settings';
const defaults = {
	requiredOffices: { departmentHead: true, finance: true, property: true, ict: true, library: true, transport: true },
	finalHrClearanceEnabled: true,
	generateCertificateAfterApproval: true,
	notifications: {
		newClearanceRequest: true,
		clearanceProgressUpdated: true,
		clearanceResubmitted: true,
		allOfficesApproved: true,
		clearanceCompleted: true,
		certificateGenerated: true,
		emailEnabled: true,
		systemNotificationsEnabled: true,
	},
	certificate: { generation: 'Automatic (Recommended)', trigger: 'After HR Approval', numberPrefix: 'BDU-CLR', format: 'PDF' },
	security: { sessionTimeout: '30 minutes', notifyOnNewLogin: true },
};

const auth = () => ({ headers: { Authorization: `******'token') || ''}` } });
const mergeSettings = (incoming = {}) => ({
	...defaults,
	...incoming,
	requiredOffices: { ...defaults.requiredOffices, ...(incoming.requiredOffices || {}) },
	notifications: { ...defaults.notifications, ...(incoming.notifications || {}) },
	certificate: { ...defaults.certificate, ...(incoming.certificate || {}) },
	security: { ...defaults.security, ...(incoming.security || {}) },
});

function Section({ id, title, icon: Icon, children, className = '' }) {
	return <section id={id} className={`scroll-mt-24 rounded-md border border-slate-200 bg-white shadow-sm ${className}`}><div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 text-[11px] font-bold text-blue-700"><Icon size={14} />{title}</div><div className="p-3">{children}</div></section>;
}
function Toggle({ checked, onChange, label }) {
	return <label className="flex cursor-pointer items-center gap-2 text-[10px] text-slate-700"><input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} className="h-3.5 w-3.5 accent-blue-600" />{label}</label>;
}
function Field({ label, children }) {
	return <label className="block text-[10px] font-semibold text-slate-600"><span className="mb-1 block">{label}</span>{children}</label>;
}
const inputClass = 'w-full rounded border border-slate-200 px-2 py-1.5 text-[10px] text-slate-700 outline-none focus:border-blue-500';

export default function HRSetting() {
	const [settings, setSettings] = useState(defaults);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState('');
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState('');
	const [saveError, setSaveError] = useState('');
	const successTimer = useRef(null);

	useEffect(() => {
		let active = true;
		axios.get(API_URL, auth())
			.then((response) => {
				if (!active) return;
				const storedSettings = response.data?.settings?.hrSettings || response.data?.settings || {};
				setSettings(mergeSettings(storedSettings));
			})
			.catch((error) => {
				if (active) setLoadError(error.response?.data?.message || error.message || 'Unable to load HR settings.');
			})
			.finally(() => { if (active) setLoading(false); });
		return () => {
			active = false;
			window.clearTimeout(successTimer.current);
		};
	}, []);

	const update = (section, key, value) => {
		setSettings((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));
		setMessage('');
		setSaveError('');
	};
	const updateRoot = (key, value) => {
		setSettings((current) => ({ ...current, [key]: value }));
		setMessage('');
		setSaveError('');
	};

	const saveSettings = async (event) => {
		event.preventDefault();
		setSaving(true);
		setMessage('');
		setSaveError('');
		try {
			const response = await axios.put(API_URL, settings, auth());
			const savedSettings = mergeSettings(response.data?.settings || settings);
			setSettings(savedSettings);
			localStorage.setItem('hrSessionTimeout', savedSettings.security.sessionTimeout);
			window.dispatchEvent(new CustomEvent('hr-session-timeout-updated', {
				detail: savedSettings.security.sessionTimeout,
			}));
			setMessage(response.data?.message || 'HR Settings updated successfully.');
			window.clearTimeout(successTimer.current);
			successTimer.current = window.setTimeout(() => setMessage(''), 3000);
		} catch (error) {
			setSaveError(error.response?.data?.message || error.message || 'Unable to save HR settings.');
		} finally {
			setSaving(false);
		}
	};

	if (loading) return <div role="status" className="p-6 text-center text-xs text-slate-500">Loading HR settings...</div>;
	if (loadError) return <div role="alert" className="m-4 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">{loadError}</div>;

	return <div className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-5"><div className="mx-auto max-w-5xl">
		<form onSubmit={saveSettings}>
			<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
				<div><h1 className="text-base font-bold text-slate-900">HR Officer Settings</h1><p className="text-[10px] text-slate-500">Configure workflow, notifications, certificates, and account security.</p></div>
				{message && <span role="status" className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-semibold text-emerald-700">{message}</span>}
				{saveError && <span role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-semibold text-red-700">{saveError}</span>}
			</div>
			<nav aria-label="HR settings sections" className="mb-3 flex gap-1 overflow-x-auto rounded border border-slate-200 bg-white p-1 text-[10px] font-semibold text-slate-500">
				{[['workflow', 'Workflow'], ['notifications', 'Notifications'], ['certificate', 'Certificate'], ['security', 'Security']].map(([id, label]) => <a key={id} href={`#${id}`} className="rounded px-3 py-2 hover:bg-blue-50 hover:text-blue-700">{label}</a>)}
			</nav>
			<div className="grid gap-3 lg:grid-cols-3">
				<Section id="workflow" title="1. Clearance Workflow Settings" icon={Settings}>
					<p className="mb-2 text-[9px] font-bold text-slate-500">REQUIRED CLEARANCE OFFICES FOR NEW REQUESTS</p>
					<div className="space-y-2">{Object.entries({ departmentHead: 'Department Head', finance: 'Finance Office', property: 'Property / Asset Office', ict: 'ICT Office', library: 'Library', transport: 'Transport Office' }).map(([key, label]) => <Toggle key={key} label={label} checked={settings.requiredOffices[key]} onChange={(value) => update('requiredOffices', key, value)} />)}</div>
					<div className="my-3 border-t border-slate-100" />
					<Toggle label="Final HR Clearance" checked={settings.finalHrClearanceEnabled} onChange={(value) => updateRoot('finalHrClearanceEnabled', value)} />
					<p className="mt-1 text-[9px] text-slate-500">Office changes apply only to requests created after saving.</p>
				</Section>
				<Section id="notifications" title="2. Notification Settings" icon={Bell}>
					<div className="space-y-2">{Object.entries({
						newClearanceRequest: 'New Clearance Request',
						clearanceProgressUpdated: 'Clearance Progress Updated',
						clearanceResubmitted: 'Clearance Request Resubmitted',
						allOfficesApproved: 'All Offices Approved',
						clearanceCompleted: 'Clearance Completed',
						certificateGenerated: 'Certificate Generated',
					}).map(([key, label]) => <Toggle key={key} label={label} checked={settings.notifications[key]} onChange={(value) => update('notifications', key, value)} />)}</div>
					<div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
						<Toggle label="Enable System Notifications" checked={settings.notifications.systemNotificationsEnabled} onChange={(value) => update('notifications', 'systemNotificationsEnabled', value)} />
						<Toggle label="Enable Email Notifications" checked={settings.notifications.emailEnabled} onChange={(value) => update('notifications', 'emailEnabled', value)} />
						<p className="text-[9px] text-slate-500">Email delivery also requires email notifications to be enabled by the system administrator and valid SMTP configuration.</p>
					</div>
				</Section>
				<Section id="certificate" title="3. Certificate Settings" icon={Check}>
					<div className="space-y-3">
						<Field label="CERTIFICATE GENERATION"><select className={inputClass} value={settings.certificate.generation} onChange={(event) => update('certificate', 'generation', event.target.value)}><option>Automatic (Recommended)</option><option>Manual</option></select></Field>
						<Field label="GENERATE CERTIFICATE WHEN"><select className={inputClass} value={settings.certificate.trigger} onChange={(event) => update('certificate', 'trigger', event.target.value)}><option>After HR Approval</option><option>After All Offices Approved</option></select></Field>
						<Field label="CERTIFICATE NUMBER PREFIX"><input required maxLength={20} pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,19}" title="Use up to 20 letters, numbers, hyphens, or underscores." className={inputClass} value={settings.certificate.numberPrefix} onChange={(event) => update('certificate', 'numberPrefix', event.target.value)} /></Field>
						<Field label="CERTIFICATE FORMAT"><select className={inputClass} value={settings.certificate.format} onChange={(event) => update('certificate', 'format', event.target.value)}><option>PDF</option><option>PDF and QR Code</option></select></Field>
					</div>
				</Section>
				<Section id="security" title="4. Security Settings" icon={ShieldCheck}>
					<Field label="SESSION TIMEOUT"><select className={inputClass} value={settings.security.sessionTimeout} onChange={(event) => update('security', 'sessionTimeout', event.target.value)}><option>15 minutes</option><option>30 minutes</option><option>60 minutes</option></select></Field>
					<div className="mt-3"><Toggle label="Notify me about new login" checked={settings.security.notifyOnNewLogin} onChange={(value) => update('security', 'notifyOnNewLogin', value)} /></div>
					<div className="mt-4 flex gap-2 rounded border border-blue-100 bg-blue-50 p-2 text-[9px] text-blue-700"><ShieldCheck size={14} /><span>HR sessions will automatically log out after the selected period of inactivity.</span></div>
				</Section>
			</div>
			<div className="mt-3 flex justify-end"><button type="submit" disabled={saving} className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-[10px] font-bold text-white disabled:opacity-60"><Save size={13} />{saving ? 'Saving...' : 'Save Configuration'}</button></div>
		</form>
	</div></div>;
}
