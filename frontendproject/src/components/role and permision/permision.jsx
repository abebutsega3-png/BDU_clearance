import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Bell, BookOpen, Building2, Check, ChevronRight, ClipboardList, DollarSign, FileCheck2, LayoutDashboard, MoreVertical, Pencil, Plus, Search, Settings, ShieldCheck, Trash2, UserRound, Users, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const roles = [
	{ name: 'System Admin', users: 1, color: 'blue', system: true },
	{ name: 'HR Officer', users: 4, color: 'blue' },
	{ name: 'Finance Officer', users: 2, color: 'amber' },
	{ name: 'Property Officer', users: 2, color: 'orange' },
	{ name: 'IT Officer', users: 2, color: 'violet' },
	{ name: 'Department Manager', users: 3, color: 'teal' },
];

const modules = [
	['Dashboard', LayoutDashboard], ['Users', Users], ['Roles', ShieldCheck], ['Permissions', ShieldCheck],
	['Employees', UserRound], ['Departments', Building2], ['Clearance Requests', ClipboardList], ['Finance Clearance', DollarSign],
	['Property Clearance', FileCheck2], ['ICT Clearance', Settings], ['Department Clearance', Building2], ['Library Clearance', BookOpen],
	['Final HR Clearance', ShieldCheck], ['Reports', BarChart3], ['Notifications', Bell], ['Audit Logs', ClipboardList],
	['System Settings', Settings], ['Backup & Maintenance', Settings],
];

const permissionLabels = ['View', 'Create', 'Edit', 'Delete', 'Approve', 'Reject', 'Export'];
const colorClasses = {
	blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600',
	sky: 'bg-sky-50 text-sky-600', violet: 'bg-violet-50 text-violet-600', teal: 'bg-teal-50 text-teal-600',
	orange: 'bg-orange-50 text-orange-600', pink: 'bg-pink-50 text-pink-600', slate: 'bg-slate-100 text-slate-600',
};

function PermissionState({ allowed }) {
	return allowed ? <span className="mx-auto flex h-4 w-4 items-center justify-center rounded-full border border-emerald-500 text-emerald-600"><Check size={11} strokeWidth={3} /></span> : <span className="mx-auto flex h-4 w-4 items-center justify-center rounded-full border border-rose-300 text-rose-400"><X size={10} strokeWidth={2.5} /></span>;
}

export default function Permissions() {
	const [activeRole, setActiveRole] = useState(roles[0]);
	const [activeTab, setActiveTab] = useState('roles');
	const [search, setSearch] = useState('');
	const [roleList, setRoleList] = useState(roles);
	const [message, setMessage] = useState('');
	const [deleting, setDeleting] = useState(false);
	const navigate = useNavigate();
	useEffect(() => {
		const loadRoles = async () => {
			try {
				const response = await axios.get('http://localhost:3000/api/roles', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
				if (response.data.roles) {
					const loadedRoles = response.data.roles.map((role) => ({ ...role, users: role.userCount || 0, color: 'blue', system: false }));
					setRoleList(loadedRoles);
					if (loadedRoles.length) setActiveRole(loadedRoles[0]);
				}
			} catch (error) {
				console.error('Unable to load roles:', error);
			}
		};
		loadRoles();
	}, []);
	const filteredRoles = useMemo(() => roleList.filter((role) => role.name.toLowerCase().includes(search.toLowerCase())), [roleList, search]);
	const activePermissions = modules.map(([name, Icon]) => [name, Icon, ...permissionLabels.map((label) => {
		const permission = activeRole.permissions?.find((item) => item.module === name || (name === 'Clearance Requests' && item.module === 'Clearance Request'));
		return permission?.actions?.includes(label.toLowerCase()) || false;
	})]);
	const handleDelete = async () => {
		if (!activeRole._id || activeRole.system || !window.confirm(`Delete the role "${activeRole.name}"?`)) return;
		setDeleting(true);
		setMessage('');
		try {
			await axios.delete(`http://localhost:3000/api/roles/${activeRole._id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
			const remainingRoles = roleList.filter((role) => role._id !== activeRole._id);
			setRoleList(remainingRoles);
			setActiveRole(remainingRoles[0] || roles[0]);
			setMessage('Role deleted successfully.');
		} catch (error) {
			setMessage(error.response?.data?.message || 'Unable to delete role. Please try again.');
		} finally {
			setDeleting(false);
		}
	};

	return <main className="min-h-[calc(100vh-3rem)] bg-slate-50 text-slate-800">
		<div className="border-b border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 sm:px-8"><span className="text-blue-600">Dashboard</span><ChevronRight className="mx-1 inline" size={13} /> Role &amp; Permissions</div>
		<section className="mx-auto max-w-[1500px] p-4 sm:p-8">
			<div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center"><div><h1 className="text-xl font-bold text-slate-900">Role &amp; Permissions</h1><p className="mt-1 text-xs text-slate-500">Manage user roles and their permissions in the system.</p></div><Link to="/admin/roles-permissions/add" className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"><Plus size={16} /> Add New Role</Link></div>
			<div className="flex gap-8 border-b border-slate-200">{[['roles', 'Roles', ShieldCheck], ['permissions', 'Permissions', Users]].map(([tab, label, Icon]) => <button key={tab} onClick={() => setActiveTab(tab)} className={`inline-flex items-center gap-2 border-b-2 px-2 py-4 text-xs font-semibold ${activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500'}`}><Icon size={15} /> {label}</button>)}</div>
			{activeTab === 'roles' ? <div className="mt-4 flex flex-col gap-4 lg:flex-row">
				<div className="w-full shrink-0 rounded-md border border-slate-200 bg-white p-3 lg:w-64"><div className="mb-3 px-1 text-xs font-bold text-slate-600">Roles ({roleList.length})</div><div className="relative mb-3"><Search className="absolute left-2.5 top-2 text-slate-400" size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search roles..." className="w-full rounded border border-slate-200 py-1.5 pl-8 pr-2 text-[10px] outline-none focus:border-blue-400" /></div><div className="space-y-1">{filteredRoles.map((role) => <button key={role.name} onClick={() => setActiveRole(role)} className={`flex w-full items-center gap-2 rounded-md p-2 text-left transition ${activeRole.name === role.name ? 'bg-blue-50' : 'hover:bg-slate-50'}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${colorClasses[role.color] || colorClasses.blue}`}><Users size={14} /></span><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-semibold text-slate-700">{role.name}</span><span className="block text-[9px] text-slate-400">{role.users} {role.users === 1 ? 'user' : 'users'}</span></span><span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600">Active</span></button>)}</div><Link to="/admin/roles-permissions/add" className="mt-3 flex w-full items-center justify-center gap-1 rounded border border-blue-200 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"><Plus size={14} /> Add New Role</Link></div>
				<div className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white">
					<div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-start"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm"><ShieldCheck size={23} /></span><div><h2 className="text-sm font-bold text-slate-800">Role Details</h2><div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-700">{activeRole.name}<span className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-600">Active</span></div><p className="mt-1 text-[10px] text-slate-500">Description: Manage employee information and clearance requests.</p><p className="mt-1 text-[10px] text-slate-500"><Users className="mr-1 inline" size={11} /> Users with this role: {activeRole.users}</p></div></div><div className="flex gap-2"><button onClick={() => activeRole._id && navigate(`/admin/roles-permissions/edit/${activeRole._id}`)} disabled={!activeRole._id} className="inline-flex items-center gap-1 rounded border border-slate-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"><Pencil size={13} /> Edit Role</button>{activeRole._id && !activeRole.system && <button onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-1 rounded border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 size={13} /> {deleting ? 'Deleting...' : 'Delete Role'}</button>}<button aria-label="More role actions" className="rounded border border-slate-200 p-1.5 text-slate-500"><MoreVertical size={14} /></button></div></div>
					<div className="flex gap-6 border-b border-slate-200 px-4"><button className="border-b-2 border-blue-500 py-3 text-xs font-semibold text-blue-600">Permissions ({modules.length * permissionLabels.length})</button><button className="py-3 text-xs font-semibold text-slate-500">Users with this role ({activeRole.users})</button></div>
					<div className="overflow-x-auto"><table className="w-full min-w-[850px] border-collapse text-[10px]"><thead><tr className="bg-slate-50 text-left font-bold text-slate-600"><th className="px-4 py-3">Module / Feature</th>{permissionLabels.map((label) => <th key={label} className="px-2 py-3 text-center">{label}</th>)}</tr></thead><tbody>{activePermissions.map(([name, Icon, ...permissions]) => <tr key={name} className="border-t border-slate-100"><td className="px-4 py-2.5 font-medium text-slate-700"><Icon className="mr-2 inline text-blue-600" size={14} />{name}</td>{permissions.map((allowed, index) => <td key={`${name}-${index}`} className="px-2 py-2.5 text-center"><PermissionState allowed={allowed} /></td>)}</tr>)}</tbody></table></div>
					<div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500"><span>Showing 1 to {activePermissions.length} of {activePermissions.length} modules</span><span className="flex gap-4"><span className="inline-flex items-center gap-1"><PermissionState allowed /> Allowed</span><span className="inline-flex items-center gap-1"><PermissionState allowed={false} /> Denied</span></span></div>{message && <p className={`border-t px-4 py-3 text-xs ${message.includes('successfully') ? 'border-emerald-100 text-emerald-600' : 'border-rose-100 text-rose-600'}`}>{message}</p>}
				</div>
			</div> : <div className="mt-4 rounded-md border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Select a role to manage its permissions.</div>}
		</section>
	</main>;
}
