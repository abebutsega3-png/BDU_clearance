import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Search, Users, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const statusLabel = (status) => status === 'In Progress' ? 'Under Review' : status || 'No Request';
const statusClass = (status) => ({
	Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
	Inactive: 'bg-slate-100 text-slate-600 border-slate-200',
	Pending: 'bg-amber-50 text-amber-700 border-amber-200',
	'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
	Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
	Completed: 'bg-slate-100 text-slate-700 border-slate-200',
	Rejected: 'bg-red-50 text-red-700 border-red-200',
})[status] || 'bg-slate-50 text-slate-600 border-slate-200';

export default function MyDepartment() {
	const [department, setDepartment] = useState({ department: '', departmentHead: '', employees: [] });
	const [selectedEmployee, setSelectedEmployee] = useState(null);
	const [search, setSearch] = useState('');
	const [position, setPosition] = useState('All');
	const [employmentStatus, setEmploymentStatus] = useState('All');
	const [clearanceStatus, setClearanceStatus] = useState('All');
	const [error, setError] = useState('');

	useEffect(() => {
		axios.get('http://localhost:3000/api/employee/department', { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } })
			.then(({ data }) => setDepartment(data))
			.catch(() => setError('Department employees could not be loaded.'));
	}, []);

	const positions = [...new Set(department.employees.map((employee) => employee.position).filter(Boolean))];
	const filteredEmployees = useMemo(() => department.employees.filter((employee) => {
		const clearance = statusLabel(employee.clearance?.status);
		const term = search.toLowerCase();
		return (!term || employee.fullName.toLowerCase().includes(term) || employee.employeeId.toLowerCase().includes(term))
			&& (position === 'All' || employee.position === position)
			&& (employmentStatus === 'All' || employee.status === employmentStatus)
			&& (clearanceStatus === 'All' || clearance === clearanceStatus);
	}), [department.employees, search, position, employmentStatus, clearanceStatus]);
	const active = department.employees.filter((employee) => employee.status === 'Active').length;
	const onClearance = department.employees.filter((employee) => employee.clearance).length;

	return <div className="space-y-5 text-slate-700"><header><p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Department Head Portal</p><h1 className="mt-1 text-2xl font-bold text-slate-900">My Department</h1><p className="mt-1 text-sm text-slate-500">View and monitor employees in your department.</p></header>
		{error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
		<section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-slate-900">Department Information</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Info label="Department Name" value={department.department} /><Info label="Department Head" value={department.departmentHead} /><Info label="Location" value="Main Office" /><Info label="Total Employees" value={department.employees.length} /></div></section>
		<section><h2 className="mb-3 text-base font-bold text-slate-900">Department Statistics</h2><div className="grid gap-4 sm:grid-cols-3"><Stat label="Total Employees" value={department.employees.length} /><Stat label="Active Employees" value={active} /><Stat label="On Clearance" value={onClearance} /></div></section>
		<section className="rounded-lg border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><div className="flex items-center gap-2"><Users size={18} className="text-teal-600" /><h2 className="text-base font-bold text-slate-900">Department Employees</h2></div><div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4"><div className="relative lg:col-span-1"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by Employee Name or ID" className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 pr-9 text-sm outline-none focus:border-teal-600" /><Search size={15} className="absolute right-3 top-2.5 text-slate-400" /></div><Select value={position} onChange={setPosition} options={['All', ...positions]} label="Position" /><Select value={employmentStatus} onChange={setEmploymentStatus} options={['All', 'Active', 'Inactive']} label="Employment Status" /><Select value={clearanceStatus} onChange={setClearanceStatus} options={['All', 'No Request', 'Pending', 'Under Review', 'Approved', 'Completed', 'Rejected']} label="Clearance Status" /></div></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Employee ID</th><th className="px-5 py-3">Employee Name</th><th className="px-5 py-3">Position</th><th className="px-5 py-3">Employment Status</th><th className="px-5 py-3">Clearance Status</th><th className="px-5 py-3 text-center">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredEmployees.length ? filteredEmployees.map((employee) => <tr key={employee._id} className="hover:bg-slate-50"><td className="px-5 py-3 font-semibold">{employee.employeeId}</td><td className="px-5 py-3 font-semibold text-slate-900">{employee.fullName}</td><td className="px-5 py-3">{employee.position}</td><td className="px-5 py-3"><Badge value={employee.status} /></td><td className="px-5 py-3"><Badge value={statusLabel(employee.clearance?.status)} /></td><td className="px-5 py-3 text-center"><button type="button" onClick={() => setSelectedEmployee(employee)} className="text-xs font-semibold text-teal-700 hover:text-teal-900">View</button></td></tr>) : <tr><td colSpan="6" className="px-5 py-8 text-center text-slate-500">No employees match the selected filters.</td></tr>}</tbody></table></div></section>
		<div className="flex gap-2"><button type="button" className="rounded-md bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800">Search</button><button type="button" onClick={() => { setSearch(''); setPosition('All'); setEmploymentStatus('All'); setClearanceStatus('All'); }} className="rounded-md border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Reset</button></div>
		{selectedEmployee && <EmployeeDetails employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />}</div>;
}

function Info({ label, value }) { return <div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-900">{value || 'Not provided'}</p></div>; }
function Stat({ label, value }) { return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-teal-700">{value}</p></div>; }
function Badge({ value }) { return <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${statusClass(value === 'Under Review' ? 'In Progress' : value)}`}>{value}</span>; }
function Select({ label, value, onChange, options }) { return <label className="text-xs font-semibold text-slate-500">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-teal-600">{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
function EmployeeDetails({ employee, onClose }) { const clearance = employee.clearance; return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={onClose}><section role="dialog" aria-modal="true" className="w-full max-w-xl rounded-lg bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b border-slate-100 pb-3"><h2 className="text-base font-bold text-slate-900">Employee Details</h2><button type="button" aria-label="Close employee details" onClick={onClose}><X size={18} className="text-slate-500" /></button></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Info label="Employee ID" value={employee.employeeId} /><Info label="Full Name" value={employee.fullName} /><Info label="Position" value={employee.position} /><Info label="Department" value={employee.department} /><Info label="Employment Status" value={employee.status} /><Info label="Join Date" value={employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : ''} /><Info label="Clearance Status" value={statusLabel(clearance?.status)} /><Info label="Current Clearance Request" value={clearance?.requestId || 'None'} /></div>{clearance && <Link to="/department-head/clearance-requests" className="mt-5 inline-block rounded-md bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800">View Clearance Request</Link>}</section></div>; }
