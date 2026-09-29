import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CarFront, Mail, Phone, Search, Users, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const statusLabel = (status) => status === 'In Progress' ? 'Under Review' : status || 'No Request';
const statusClass = (status) => ({
	Active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
	Inactive: 'border-slate-200 bg-slate-100 text-slate-600',
	Pending: 'border-amber-200 bg-amber-50 text-amber-700',
	'In Progress': 'border-blue-200 bg-blue-50 text-blue-700',
	'Under Review': 'border-blue-200 bg-blue-50 text-blue-700',
	Approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
	Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
	Cleared: 'border-emerald-200 bg-emerald-50 text-emerald-700',
	Returned: 'border-orange-200 bg-orange-50 text-orange-700',
	Rejected: 'border-red-200 bg-red-50 text-red-700',
})[status] || 'border-slate-200 bg-slate-50 text-slate-600';

export default function MyDepartment() {
	const [department, setDepartment] = useState({ department: '', departmentHead: '', employees: [] });
	const [selectedEmployee, setSelectedEmployee] = useState(null);
	const [search, setSearch] = useState('');
	const [position, setPosition] = useState('All');
	const [employmentStatus, setEmploymentStatus] = useState('All');
	const [clearanceStatus, setClearanceStatus] = useState('All');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		axios.get('http://localhost:3000/api/employee/department', {
			headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
		})
			.then(({ data }) => setDepartment(data))
			.catch(() => setError('Department employees could not be loaded.'))
			.finally(() => setLoading(false));
	}, []);

	const employees = department.employees || [];
	const positions = [...new Set(employees.map((employee) => employee.position).filter(Boolean))];
	const filteredEmployees = useMemo(() => employees.filter((employee) => {
		const clearance = statusLabel(employee.clearance?.status);
		const term = search.trim().toLowerCase();
		const searchableText = [employee.fullName, employee.employeeId, employee.position]
			.map((value) => String(value || '').toLowerCase());
		return (!term || searchableText.some((value) => value.includes(term)))
			&& (position === 'All' || employee.position === position)
			&& (employmentStatus === 'All' || employee.status === employmentStatus)
			&& (clearanceStatus === 'All' || clearance === clearanceStatus);
	}), [employees, search, position, employmentStatus, clearanceStatus]);
	const active = employees.filter((employee) => employee.status === 'Active').length;
	const onClearance = employees.filter((employee) => employee.clearance).length;
	const withVehicle = employees.filter((employee) => employee.assignedVehicle).length;

	return (
		<div className="space-y-5 text-slate-700">
			<header>
				<p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Department Head Portal</p>
				<h1 className="mt-1 text-2xl font-bold text-slate-900">Department Employees</h1>
				<p className="mt-1 text-sm text-slate-500">{department.department || 'Your department'} employee directory</p>
			</header>

			{error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

			<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Department employee statistics">
				<Stat label="Total Employees" value={employees.length} />
				<Stat label="Active Employees" value={active} />
				<Stat label="On Clearance" value={onClearance} />
				<Stat label="Assigned Vehicles" value={withVehicle} />
			</section>

			<section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
				<div className="border-b border-slate-100 p-4 sm:p-5">
					<div className="flex items-center gap-2">
						<Users size={18} className="text-teal-700" />
						<h2 className="text-base font-bold text-slate-900">Employee Directory</h2>
						<span className="ml-auto text-xs text-slate-500">{filteredEmployees.length} shown</span>
					</div>
					<div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						<label className="relative sm:col-span-2 xl:col-span-1">
							<span className="sr-only">Search by name, employee ID, or position</span>
							<input
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Name, employee ID, or position"
								className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 pr-9 text-sm outline-none focus:border-teal-600"
							/>
							<Search size={15} className="absolute right-3 top-2.5 text-slate-400" />
						</label>
						<Select label="Position" value={position} onChange={setPosition} options={['All', ...positions]} />
						<Select label="Employment Status" value={employmentStatus} onChange={setEmploymentStatus} options={['All', 'Active', 'Inactive']} />
						<Select label="Clearance Status" value={clearanceStatus} onChange={setClearanceStatus} options={['All', 'No Request', 'Pending', 'Under Review', 'Approved', 'Returned', 'Cleared', 'Completed']} />
					</div>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full min-w-[1050px] text-left text-sm">
						<thead className="bg-slate-50 text-xs uppercase text-slate-500">
							<tr>
								<th className="px-4 py-3">Employee ID</th>
								<th className="px-4 py-3">Employee</th>
								<th className="px-4 py-3">Position</th>
								<th className="px-4 py-3">Phone / Email</th>
								<th className="px-4 py-3">Assigned Vehicle</th>
								<th className="px-4 py-3">Clearance</th>
								<th className="px-4 py-3">Employment</th>
								<th className="px-4 py-3 text-center">Action</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{loading && <tr><td colSpan="8" className="px-4 py-10 text-center text-slate-500">Loading employees...</td></tr>}
							{!loading && filteredEmployees.map((employee) => {
								const vehicle = employee.assignedVehicle;
								return (
									<tr key={employee._id} className="hover:bg-slate-50">
										<td className="px-4 py-3 font-semibold">{employee.employeeId}</td>
										<td className="px-4 py-3 font-semibold text-slate-900">{employee.fullName}</td>
										<td className="px-4 py-3">{employee.position || 'Not provided'}</td>
										<td className="px-4 py-3">
											<div>{employee.phone || 'No phone'}</div>
											<div className="mt-1 text-xs text-slate-500">{employee.email || 'No email'}</div>
										</td>
										<td className="px-4 py-3">
											{vehicle ? <><div className="font-medium">{vehicle.plateNumber || 'Plate not recorded'}</div><div className="mt-1 text-xs text-slate-500">{vehicle.vehicleType}</div></> : <span className="text-slate-400">None</span>}
										</td>
										<td className="px-4 py-3"><Badge value={statusLabel(employee.clearance?.status)} /></td>
										<td className="px-4 py-3"><Badge value={employee.status || 'Unknown'} /></td>
										<td className="px-4 py-3 text-center"><button type="button" onClick={() => setSelectedEmployee(employee)} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-teal-600 hover:text-teal-700">View</button></td>
									</tr>
								);
							})}
							{!loading && !filteredEmployees.length && <tr><td colSpan="8" className="px-4 py-10 text-center text-slate-500">No employees match these filters.</td></tr>}
						</tbody>
					</table>
				</div>
			</section>

			{selectedEmployee && <EmployeeDetails employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />}
		</div>
	);
}

function Stat({ label, value }) {
	return <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-teal-800">{value}</p></div>;
}

function Badge({ value }) {
	return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${statusClass(value)}`}>{value}</span>;
}

function Select({ label, value, onChange, options }) {
	return (
		<label className="text-xs font-semibold text-slate-500">
			{label}
			<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-teal-600">
				{options.map((option) => <option key={option}>{option}</option>)}
			</select>
		</label>
	);
}

function Info({ label, value }) {
	return <div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 break-words font-semibold text-slate-900">{value || 'Not provided'}</p></div>;
}

function EmployeeDetails({ employee, onClose }) {
	const clearance = employee.clearance;
	const vehicle = employee.assignedVehicle;
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={onClose}>
			<section role="dialog" aria-modal="true" aria-labelledby="employee-details-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-md bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
				<div className="flex items-start justify-between border-b border-slate-100 pb-3">
					<div><h2 id="employee-details-title" className="text-base font-bold text-slate-900">{employee.fullName}</h2><p className="mt-1 text-sm text-slate-500">{employee.employeeId} · {employee.position || 'Position not recorded'}</p></div>
					<button type="button" aria-label="Close employee details" onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
				</div>
				<div className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
					<Info label="Department" value={employee.department} />
					<Info label="Employment Status" value={employee.status} />
					<Info label="Phone" value={employee.phone} />
					<Info label="Email" value={employee.email} />
					<Info label="Employment Type" value={employee.employmentType} />
					<Info label="Campus" value={employee.campus} />
					<Info label="Education Level" value={employee.educationLevel || employee.qualification} />
					<Info label="Join Date" value={employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : ''} />
					<div className="sm:col-span-2">
						<div className="flex items-center gap-2 text-xs text-slate-500"><CarFront size={15} />Assigned Vehicle</div>
						{vehicle ? <div className="mt-2 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2"><Info label="Plate Number" value={vehicle.plateNumber} /><Info label="Vehicle Type" value={vehicle.vehicleType} /><Info label="Assignment Date" value={vehicle.assignedDate ? new Date(vehicle.assignedDate).toLocaleDateString() : ''} /><Info label="Assignment Status" value={vehicle.status} /></div> : <p className="mt-2 text-sm text-slate-500">No vehicle assigned.</p>}
					</div>
					<div className="sm:col-span-2">
						<p className="text-xs text-slate-500">Clearance Status</p>
						<div className="mt-2"><Badge value={statusLabel(clearance?.status)} /></div>
						<p className="mt-2 text-sm text-slate-600">Current request: {clearance?.requestId || 'None'}</p>
					</div>
				</div>
				<div className="mt-5 flex flex-wrap gap-3">
					{employee.phone && <a href={`tel:${employee.phone}`} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Phone size={15} />Call</a>}
					{employee.email && <a href={`mailto:${employee.email}`} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Mail size={15} />Email</a>}
					{clearance && <Link to="/department-head/clearance-requests" className="rounded-md bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800">View Clearance Request</Link>}
				</div>
			</section>
		</div>
	);
}