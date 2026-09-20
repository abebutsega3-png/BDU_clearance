import React, { useState } from 'react';
import { BarChart3, BookOpen, Building2, Check, ChevronDown, ChevronRight, ClipboardList, DollarSign, FileCheck2, LayoutDashboard, Save, Settings, ShieldCheck, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const permissionLabels = ['View', 'Create', 'Edit', 'Delete', 'Approve', 'Reject', 'Export'];
const moduleNames = [
	['Dashboard', LayoutDashboard, [true, false, false, false, false, false, false]], ['Users', UserRound, [true, true, true, true, false, false, false]],
	['Roles', ShieldCheck, [true, true, true, true, false, false, false]], ['Permissions', ShieldCheck, [true, true, true, false, false, false, false]],
	['Employees', UserRound, [true, true, true, true, false, false, true]], ['Departments', Building2, [true, true, true, true, false, false, false]],
	['Clearance Requests', ClipboardList, [true, false, false, false, true, false, true]], ['Finance Clearance', DollarSign, [true, false, false, false, false, false, false]],
	['Property Clearance', FileCheck2, [true, false, false, false, false, false, false]], ['ICT Clearance', Settings, [true, false, false, false, false, false, false]],
	['Department Clearance', Building2, [true, false, false, false, false, false, false]], ['Library Clearance', BookOpen, [true, false, false, false, false, false, false]],
	['Final HR Clearance', ShieldCheck, [true, false, false, false, true, false, false]], ['Reports', BarChart3, [true, false, false, false, false, false, true]],
	['Notifications', ClipboardList, [true, false, false, true, false, false, false]], ['Audit Logs', ClipboardList, [true, false, false, true, false, false, false]],
	['System Settings', Settings, [true, false, true, false, false, false, false]], ['Backup & Maintenance', Settings, [true, true, false, false, false, false, false]],
];

export default function AddRole() {
	const navigate = useNavigate();
	const [roleName, setRoleName] = useState('');
	const [description, setDescription] = useState('');
	const [status, setStatus] = useState('Active');
	const [permissions, setPermissions] = useState(moduleNames.map(([, , values]) => values));
	const [message, setMessage] = useState('');
	const [saving, setSaving] = useState(false);
	const [step, setStep] = useState(1);

	const updatePermission = (moduleIndex, permissionIndex) => {
		setPermissions((current) => current.map((module, currentModuleIndex) => currentModuleIndex === moduleIndex
			? module.map((allowed, currentPermissionIndex) => currentPermissionIndex === permissionIndex ? !allowed : allowed)
			: module));
	};

	const setAllPermissions = (allowed) => setPermissions((current) => current.map((module) => module.map(() => allowed)));

	const handleSubmit = async (event) => {
		event.preventDefault();
		if (!roleName.trim()) {
			setMessage('Role name is required.');
			return;
		}
		if (step < 3) {
			setMessage('');
			setStep((currentStep) => currentStep + 1);
			return;
		}
		try {
			setSaving(true);
			const payload = {
				name: roleName.trim(), description, status,
				permissions: moduleNames.map(([module], moduleIndex) => ({
					module,
					actions: permissionLabels.filter((_, permissionIndex) => permissions[moduleIndex][permissionIndex]).map((action) => action.toLowerCase()),
				})),
			};
			await axios.post('http://localhost:3000/api/roles', payload, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
			setMessage(`Role "${roleName.trim()}" was saved successfully.`);
			setTimeout(() => navigate('/admin/roles-permissions'), 700);
		} catch (error) {
			setMessage(error.response?.data?.message || (error.request ? 'Unable to reach the server. Please make sure the backend is running.' : 'Unable to save role. Please try again.'));
		} finally {
			setSaving(false);
		}
	};
	const selectedPermissionCount = permissions.flat().filter(Boolean).length;

	return <main className="min-h-[calc(100vh-3rem)] bg-slate-50 text-slate-800">
		<div className="border-b border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 sm:px-8"><button onClick={() => navigate('/admin/roles-permissions')} className="font-semibold text-blue-600 hover:underline">Dashboard</button><ChevronRight className="mx-1 inline" size={13} /> <button onClick={() => navigate('/admin/roles-permissions')} className="font-semibold text-blue-600 hover:underline">Role &amp; Permissions</button><ChevronRight className="mx-1 inline" size={13} /> Add New Role</div>
		<form onSubmit={handleSubmit} className="mx-auto max-w-[1500px] space-y-2 p-4 sm:p-6">
			<div className="grid grid-cols-3 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">{[['Add Role', 'Create new role information'], ['Set Permissions', 'Assign permissions to this role'], ['Review & Save', 'Review and save the role']].map(([label, detail], index) => <button type="button" key={label} onClick={() => index + 1 < step && setStep(index + 1)} className={`flex items-center gap-3 border-b-2 px-4 py-3 text-left ${step === index + 1 ? 'border-blue-500' : step > index + 1 ? 'border-emerald-500' : 'border-slate-200'}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white ${step === index + 1 ? 'bg-blue-600' : step > index + 1 ? 'bg-emerald-600' : 'bg-slate-400'}`}>{index + 1}</span><span><strong className="block text-xs text-slate-700">{label}</strong><small className="text-[10px] text-slate-500">{detail}</small></span></button>)}</div>
			{step === 1 && <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-800"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">1</span> Add Role Information</h2><div className="mt-4 grid gap-5 md:grid-cols-[1fr_1fr]">
				<label className="text-xs font-semibold text-slate-700">Role Name <span className="text-rose-500">*</span><input value={roleName} onChange={(event) => setRoleName(event.target.value)} placeholder="Enter role name" className="mt-1.5 block w-full rounded border border-slate-300 px-3 py-2.5 text-xs font-normal outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200" required /><span className="mt-1.5 block text-[10px] font-normal text-slate-500">Enter a unique name for the role.</span></label>
				<label className="text-xs font-semibold text-slate-700">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Enter role description (optional)" rows="3" className="mt-1.5 block w-full resize-none rounded border border-slate-300 px-3 py-2.5 text-xs font-normal outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200" /><span className="mt-1.5 block text-[10px] font-normal text-slate-500">Briefly describe what this role is responsible for.</span></label>
				<label className="text-xs font-semibold text-slate-700">Status <span className="text-rose-500">*</span><span className="relative mt-1.5 block"><select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full appearance-none rounded border border-slate-300 px-3 py-2.5 text-xs font-normal outline-none focus:border-blue-500"><option>Active</option><option>Inactive</option></select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-2.5 text-slate-500" /></span><span className="mt-1.5 block text-[10px] font-normal text-slate-500">Select role status.</span></label>
			</div></section>}
			{step === 2 && <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="flex items-center gap-2 text-sm font-bold text-slate-800"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">2</span> Set Permissions</h2><p className="mt-1 text-[11px] text-slate-500">Select the permissions that this role will have.</p></div><div className="flex gap-2"><button type="button" onClick={() => setAllPermissions(true)} className="rounded border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50">Select All</button><button type="button" onClick={() => setAllPermissions(false)} className="rounded border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">Deselect All</button></div></div>
				<div className="mt-4 overflow-x-auto rounded border border-slate-200"><table className="w-full min-w-[920px] border-collapse text-[10px]"><thead><tr className="bg-slate-50 text-left font-bold text-slate-600"><th className="px-3 py-3 sm:px-4">Module / Feature</th>{permissionLabels.map((label) => <th key={label} className="px-2 py-3 text-center">{label}</th>)}</tr></thead><tbody>{moduleNames.map(([name, Icon], moduleIndex) => <tr key={name} className="border-t border-slate-100"><td className="px-3 py-2.5 sm:px-4"><div className="flex items-center gap-2"><Icon size={14} className="shrink-0 text-blue-600" /><strong className="text-slate-700">{name}</strong></div></td>{permissionLabels.map((label, permissionIndex) => <td key={label} className="px-2 py-2.5 text-center"><input type="checkbox" aria-label={`${name} ${label}`} checked={permissions[moduleIndex][permissionIndex]} onChange={() => updatePermission(moduleIndex, permissionIndex)} className="h-3.5 w-3.5 cursor-pointer accent-blue-600" /></td>)}</tr>)}</tbody></table></div>
				<div className="mt-3 flex flex-wrap items-center gap-6 text-[10px] text-slate-500"><span className="inline-flex items-center gap-2"><Check size={13} className="text-blue-600" /> Allowed</span><span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded border border-slate-300" /> Not Allowed</span><span className="text-slate-400">- &nbsp; Not Applicable</span></div>
			</section>}
			{step === 3 && <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-800"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">3</span> Review &amp; Save</h2><div className="mt-4 grid gap-3 rounded border border-slate-200 bg-slate-50 p-4 text-xs sm:grid-cols-3"><div><span className="block text-[10px] text-slate-500">Role Name</span><strong className="text-slate-800">{roleName || 'Not provided'}</strong></div><div><span className="block text-[10px] text-slate-500">Status</span><strong className={status === 'Active' ? 'text-emerald-600' : 'text-slate-600'}>{status}</strong></div><div><span className="block text-[10px] text-slate-500">Permissions</span><strong className="text-slate-800">{selectedPermissionCount} selected</strong></div></div><div className="mt-4"><span className="text-[10px] font-semibold text-slate-500">Description</span><p className="mt-1 text-xs text-slate-700">{description.trim() || 'No description provided.'}</p></div><div className="mt-4 border-t border-slate-200 pt-4"><span className="text-[10px] font-semibold text-slate-500">Selected permissions</span><div className="mt-2 flex flex-wrap gap-2">{moduleNames.flatMap(([name], moduleIndex) => permissionLabels.filter((_, permissionIndex) => permissions[moduleIndex][permissionIndex]).map((action) => <span key={`${name}-${action}`} className="rounded bg-blue-50 px-2 py-1 text-[10px] text-blue-700">{name}: {action}</span>))}</div></div></section>}
			<div className="flex flex-col-reverse items-stretch justify-between gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center"><div>{message && <p role="status" className={`text-xs ${message.startsWith('Role') ? 'text-emerald-600' : 'text-rose-600'}`}>{message}</p>}</div><div className="flex justify-end gap-2"><button type="button" onClick={() => step === 1 ? navigate('/admin/roles-permissions') : setStep((currentStep) => currentStep - 1)} className="rounded border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">{step === 1 ? 'Cancel' : 'Back'}</button><button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"><Save size={14} /> {saving ? 'Saving...' : step === 3 ? 'Save Role' : 'Next: Review & Save'} <ChevronRight size={14} /></button></div></div>
		</form>
	</main>;
}
