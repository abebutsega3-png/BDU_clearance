import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Search, UserPlus } from 'lucide-react';
import axios from 'axios';
import { fetchEmployees } from '../../until/EmployeeHelper';
import { createUser } from '../../until/UserHelper';

const inputClass = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const roleOptions = [
	'Administrator',
	'Department Head',
	'Library Officer',
	'Finance Officer',
	'Asset Officer',
	'ICT Officer',
	'HR Officer',
];
const rolesApiUrl = 'http://localhost:3000/api/roles';

export default function AddUser() {
	const navigate = useNavigate();
	const [employees, setEmployees] = useState([]);
	const [roles, setRoles] = useState(roleOptions);
	const [employeeId, setEmployeeId] = useState('');
	const [employeeSearch, setEmployeeSearch] = useState('');
	const [loadingEmployees, setLoadingEmployees] = useState(true);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);
	const [loadingRoles, setLoadingRoles] = useState(true);
	const [selectedRole, setSelectedRole] = useState('');

	const loadEmployees = async () => {
		setLoadingEmployees(true);
		setError('');
		try {
			const employeeList = await fetchEmployees();
			setEmployees(employeeList);
			setEmployeeId((currentId) => employeeList.some((item) => item.employeeId === currentId)
				? currentId
				: employeeList[0]?.employeeId || '');
		} catch (requestError) {
			setError(requestError.response?.data?.message || 'Unable to load employees from the database.');
		} finally {
			setLoadingEmployees(false);
		}
	};

	useEffect(() => {
		loadEmployees();
		const loadRoles = async () => {
			try {
				const response = await axios.get(rolesApiUrl, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
				const activeRoles = (response.data.roles || []).filter((role) => role.isActive !== false).map((role) => role.name).filter(Boolean);
				if (activeRoles.length) setRoles(activeRoles);
			} catch (requestError) {
				setError(requestError.response?.data?.message || 'Unable to load roles from the database.');
			} finally {
				setLoadingRoles(false);
			}
		};
		loadRoles();
	}, []);

	useEffect(() => {
		setSelectedRole((currentRole) => roles.includes(currentRole) ? currentRole : roles[0] || '');
	}, [roles]);

	const employee = employees.find((item) => item.employeeId === employeeId);
	const visibleEmployees = employees.filter((item) => `${item.employeeId} ${item.fullName} ${item.department} ${item.phone}`.toLowerCase().includes(employeeSearch.toLowerCase()));

	const handleSubmit = async (event) => {
		event.preventDefault();
		setSaving(true);
		setError('');
		const formData = new FormData(event.currentTarget);
		try {
			const response = await createUser({
				username: formData.get('username'),
				employeeId,
				password: formData.get('password'),
				confirmPassword: formData.get('confirmPassword'),
				role: selectedRole,
				status: formData.get('status'),
			});
			if (!response?.success) {
				throw new Error(response?.message || 'Unable to create user.');
			}
			navigate('/admin/users', { replace: true });
		} catch (requestError) {
			setError(requestError.response?.data?.message || requestError.message || 'Unable to create user.');
		} finally {
			setSaving(false);
		}
	};

	return (
		<main className="min-h-screen bg-white p-3 md:p-5">
			<div className="mx-auto max-w-6xl">
				<div className="mb-4"><p className="text-[11px] text-slate-500"><span className="text-blue-700">Dashboard</span><span className="mx-1">/</span><span className="text-blue-700">User Management</span><span className="mx-1">/</span>Add New User</p><h1 className="mt-1 text-lg font-bold text-slate-900">Add New User</h1></div>
				<form onSubmit={handleSubmit} className="rounded-md border border-slate-200 bg-white shadow-sm">
					<section className="p-3 md:p-4">
						<h2 className="-mx-3 -mt-3 mb-3 bg-blue-50 px-3 py-2 text-[11px] font-bold text-slate-700 md:-mx-4 md:-mt-4 md:px-4">1. Select Employee</h2>
						<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
							<label className="text-[11px] font-semibold text-slate-700">Search Employee<div className="relative mt-1"><Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" /><input value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} placeholder="Search by ID, name or phone..." className={`${inputClass} pl-8 text-xs`} /></div></label>
							<label className="text-[11px] font-semibold text-slate-700">Employee *<select name="employeeId" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} disabled={loadingEmployees || employees.length === 0} required className={`${inputClass} mt-1 text-xs disabled:bg-slate-100`}><option value="">{loadingEmployees ? 'Loading employees...' : employees.length ? 'Select employee' : 'No employees found'}</option>{visibleEmployees.map((item) => <option key={item._id || item.employeeId} value={item.employeeId}>{item.employeeId} - {item.fullName}</option>)}</select></label>
						</div>
						<div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4"><InfoTile label="Employee ID" value={employee?.employeeId || '-'} /><InfoTile label="Full Name" value={employee?.fullName || '-'} /><InfoTile label="Department" value={employee?.department || '-'} /><InfoTile label="Position" value={employee?.position || employee?.jobTitle || '-'} /></div>
					</section>
					<div className="grid grid-cols-1 gap-2 border-t border-slate-200 p-3 md:grid-cols-2 md:p-4">
						<section className="rounded-md border border-slate-200"><h2 className="bg-blue-50 px-3 py-2 text-[11px] font-bold text-slate-700">2. Account Information</h2><div className="space-y-3 p-3"><label className="text-[11px] font-semibold text-slate-700">Username *<input name="username" required placeholder="Enter username" className={`${inputClass} mt-1 text-xs`} /></label><PasswordField label="Temporary Password *" name="password" show={showPassword} onToggle={() => setShowPassword((visible) => !visible)} /><PasswordField label="Confirm Password *" name="confirmPassword" show={showConfirmPassword} onToggle={() => setShowConfirmPassword((visible) => !visible)} /><label className="text-[11px] font-semibold text-slate-700">First Login Password Change<select defaultValue="Required" className={`${inputClass} mt-1 text-xs`}><option>Required</option><option>Not required</option></select></label></div></section>
						<section className="rounded-md border border-slate-200"><h2 className="bg-blue-50 px-3 py-2 text-[11px] font-bold text-slate-700">3. Role &amp; Access</h2><div className="space-y-3 p-3"><label className="text-[11px] font-semibold text-slate-700">Role *<select name="role" value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)} disabled={loadingRoles || roles.length === 0} required className={`${inputClass} mt-1 text-xs disabled:bg-slate-100`}><option value="">{loadingRoles ? 'Loading roles...' : 'Select role'}</option>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label><label className="text-[11px] font-semibold text-slate-700">Account Status *<select name="status" defaultValue="Active" className={`${inputClass} mt-1 text-xs`}><option>Active</option><option>Inactive</option></select></label><label className="flex items-center gap-2 pt-1 text-[11px] font-normal text-slate-600"><input type="checkbox" defaultChecked className="h-4 w-4 accent-blue-600" /> Enable login access for this user</label></div></section>
					</div>
					<section className="flex items-center justify-between border-t border-slate-200 p-3"><button type="button" onClick={() => navigate('/admin/users')} className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Cancel</button>{error && <p className="mx-3 flex-1 text-xs text-red-700">{error}</p>}<button type="submit" disabled={saving || !employee} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><UserPlus className="h-3.5 w-3.5" />{saving ? 'Creating...' : 'Create User'}</button></section>
				</form>
			</div>
		</main>
	);
}

function InfoTile({ label, value }) {
	return <div className="min-h-9 rounded-md bg-slate-50 px-2 py-1.5"><p className="text-[9px] font-semibold text-slate-600">{label}</p><p className="mt-0.5 truncate text-[10px] text-slate-700">{value}</p></div>;
}

function PasswordField({ label, name, show, onToggle }) {
	return <label className="text-[11px] font-semibold text-slate-700">{label}<div className="relative mt-1"><input type={show ? 'text' : 'password'} name={name} required minLength="8" placeholder="**********" className={`${inputClass} pr-9 text-xs`} /><button type="button" onClick={onToggle} title={show ? 'Hide password' : 'Show password'} className="absolute right-2.5 top-2 text-slate-400">{show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button></div></label>;
}
