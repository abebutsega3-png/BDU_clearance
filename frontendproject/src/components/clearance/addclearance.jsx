import React, { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, ClipboardList, Info, Save, Send } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createClearance } from '../../until/clearanceHelper';
import { fetchEmployees } from '../../until/EmployeeHelper';

const defaultRequiredOffices = ['HR Office', 'Library', 'Finance', 'Department'];

const initialForm = {
	employee: '',
	reason: '',
	lastWorkingDate: '',
	relievingDate: '',
	requestDate: new Date().toISOString().slice(0, 10),
	remarks: '',
};

const inputClass = 'w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-[11px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1.5 block text-[10px] font-semibold text-slate-700';

function Field({ label, required, children }) {
	return <div><label className={labelClass}>{label} {required && <span className="text-red-500">*</span>}</label>{children}</div>;
}

function SelectField({ name, value, onChange, children, required }) {
	return <select name={name} value={value} onChange={onChange} required={required} className={`${inputClass} appearance-none pr-8`} style={{ backgroundImage: 'linear-gradient(45deg, transparent 50%, #64748b 50%), linear-gradient(135deg, #64748b 50%, transparent 50%)', backgroundPosition: 'calc(100% - 13px) 50%, calc(100% - 9px) 50%', backgroundSize: '4px 4px, 4px 4px', backgroundRepeat: 'no-repeat' }}>{children}</select>;
}

function DateField({ name, value, onChange, required }) {
	return <div className="relative"><input type="date" name={name} value={value} onChange={onChange} required={required} className={`${inputClass} pr-8`} /><CalendarDays size={13} className="pointer-events-none absolute right-2.5 top-2.5 text-slate-500" /></div>;
}

export default function AddClearance() {
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const routePrefix = pathname.startsWith('/hr-office') ? '/hr-office' : '/admin';
	const [form, setForm] = useState(initialForm);
	const [message, setMessage] = useState('');
	const [employees, setEmployees] = useState([]);
	const [requiredOffices, setRequiredOffices] = useState(defaultRequiredOffices);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		fetchEmployees().then(setEmployees).catch(() => setMessage('Unable to load employees.'));
	}, []);

	const handleChange = (event) => {
		const { name, value } = event.target;
		setForm((previous) => ({ ...previous, [name]: value }));
		setMessage('');
	};

	const selectedEmployee = employees.find((item) => String(item.employeeId || item._id) === String(form.employee));
	const officeFlow = (requiredOffices.length ? requiredOffices : defaultRequiredOffices).map((office) => ({
		office,
		icon: office === 'HR Office' ? '👥' : office === 'Library' ? '📚' : office === 'Finance' ? '💰' : office === 'Department' ? '🏢' : '▣',
	}));

	const toggleRequiredOffice = (office) => {
		setRequiredOffices((previous) => {
			if (previous.includes(office)) return previous.filter((item) => item !== office);
			return [...previous, office];
		});
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		setSubmitting(true);
		setMessage('');
		try {
			const selectedOffices = requiredOffices.length ? requiredOffices : defaultRequiredOffices;
			await createClearance({
				employee: selectedEmployee?._id || form.employee,
				employeeId: selectedEmployee?.employeeId || form.employee,
				employeeName: selectedEmployee?.fullName || '',
				department: selectedEmployee?.department || '',
				campus: selectedEmployee?.campus || '',
				reason: form.reason,
				clearanceType: form.reason,
				requestDate: form.requestDate,
				lastWorkingDate: form.lastWorkingDate,
				relievingDate: form.relievingDate,
				remarks: form.remarks,
				requiredOffices: selectedOffices,
				workflow: selectedOffices.map((office) => ({ office, status: 'Pending', updatedAt: new Date().toISOString() })),
				status: 'Pending',
			});
			navigate(`${routePrefix}/clearance-requests`);
		} catch (requestError) {
			setMessage(requestError.response?.data?.message || 'Unable to submit clearance request.');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<main className="min-h-screen bg-slate-50 p-3 md:p-4">
			<div className="mx-auto max-w-[1440px]">
				<p className="mb-3 text-[10px] text-slate-500">Dashboard <span className="mx-1">/</span> Clearance Requests <span className="mx-1">/</span> <span className="font-medium text-slate-700">Create Clearance Request</span></p>
				<form onSubmit={handleSubmit} className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
					<header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><ClipboardList size={22} /></div>
						<div><h1 className="text-base font-bold text-slate-900">Create New Clearance Request</h1><p className="text-[10px] text-slate-500">Fill in the information below to create a new clearance request for an employee.</p></div>
					</header>

					<div className="space-y-6 p-4">
						<section>
							<h2 className="mb-4 flex items-center gap-3 text-[11px] font-bold text-blue-600"><span>Employee Information</span><span className="h-px flex-1 bg-slate-200" /></h2>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
								<Field label="Employee" required><SelectField name="employee" value={form.employee} onChange={handleChange} required><option value="">Select Employee</option>{employees.map((item) => <option key={item._id || item.employeeId} value={item.employeeId || item._id}>{item.fullName}</option>)}</SelectField></Field>
								<Field label="Employee ID"><input value={selectedEmployee?.employeeId || '-'} readOnly className={`${inputClass} bg-slate-100 text-slate-500`} /></Field>
								<Field label="Department"><input value={selectedEmployee?.department || '-'} readOnly className={`${inputClass} bg-slate-100 text-slate-500`} /></Field>
								<Field label="Campus"><input value={selectedEmployee?.campus || '-'} readOnly className={`${inputClass} bg-slate-100 text-slate-500`} /></Field>
							</div>
						</section>

						<section>
							<h2 className="mb-4 flex items-center gap-3 text-[11px] font-bold text-blue-600"><span>Clearance Details</span><span className="h-px flex-1 bg-slate-200" /></h2>
							<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
								<Field label="Clearance Reason" required><SelectField name="reason" value={form.reason} onChange={handleChange} required><option value="">Select Reason</option><option>Resignation</option><option>Retirement</option><option>Contract End</option><option>Dismissal / Termination</option><option>Transfer to Another Institution</option><option>Internal Transfer</option><option>Study Leave</option><option>End of Temporary Assignment</option><option>Other</option></SelectField></Field>
								<Field label="Last Working Date" required><DateField name="lastWorkingDate" value={form.lastWorkingDate} onChange={handleChange} required /></Field>
								<Field label="Relieving Date (if any)"><DateField name="relievingDate" value={form.relievingDate} onChange={handleChange} /></Field>
								<Field label="Request Date"><DateField name="requestDate" value={form.requestDate} onChange={handleChange} /></Field>
								<div className="md:col-span-2"><Field label="Remarks"><textarea name="remarks" value={form.remarks} onChange={handleChange} maxLength="500" rows="2" placeholder="Enter any remarks (optional)" className={`${inputClass} resize-none`} /><p className="mt-1 text-right text-[9px] text-slate-400">{form.remarks.length}/500</p></Field></div>
							</div>
						</section>

						<section>
							<h2 className="mb-2 flex items-center gap-3 text-[11px] font-bold text-blue-600"><span>Required Offices</span><span className="h-px flex-1 bg-slate-200" /></h2>
							<p className="mb-3 text-[10px] text-slate-500">The system will create one pending clearance task for every selected office.</p>
							<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
								{defaultRequiredOffices.map((office) => {
									const checked = requiredOffices.includes(office);
									return (
									 <label key={office} className="flex cursor-pointer items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-medium text-slate-700">
										<input type="checkbox" checked={checked} onChange={() => toggleRequiredOffice(office)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
										<span>{office}</span>
									 </label>
									);
								})}
							</div>
						</section>

						<section>
							<h2 className="mb-2 flex items-center gap-3 text-[11px] font-bold text-blue-600"><span>Clearance Flow</span><span className="h-px flex-1 bg-slate-200" /></h2>
							<p className="mb-3 text-[10px] text-slate-500">The request will be sent to the following offices for clearance.</p>
							<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-1">
								{officeFlow.map((step, index) => (
									<React.Fragment key={step.office}>
										<div className="flex min-w-0 flex-1 items-center gap-2 rounded border border-slate-200 bg-white px-2 py-2 shadow-sm">
											<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-blue-50 text-sm text-blue-700">{step.icon}</span>
											<span className="min-w-0">
												<strong className="block truncate text-[10px] text-slate-800">{step.office}</strong>
												<small className="block truncate text-[9px] text-slate-500">Pending Review</small>
											</span>
										</div>
										{index < officeFlow.length - 1 && <ArrowRight size={14} className="mx-auto shrink-0 text-blue-500 sm:mx-1" />}
									</React.Fragment>
								))}
							</div>
						</section>

						<div className="flex items-center gap-2 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] text-slate-600"><Info size={14} className="shrink-0 text-blue-600" />You can track the status of this clearance request from the Clearance Requests menu.</div>
					</div>
					<footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3"><p className={`mr-auto text-[10px] ${message.startsWith('Unable') ? 'text-red-600' : 'text-emerald-600'}`}>{message}</p><button type="button" onClick={() => navigate(`${routePrefix}/clearance-requests`)} className="rounded border border-slate-300 bg-white px-5 py-2 text-[10px] font-medium text-slate-700 hover:bg-slate-100">Cancel</button><button type="button" className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-5 py-2 text-[10px] font-medium text-slate-700 hover:bg-slate-100"><Save size={13} />Save Draft</button><button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-5 py-2 text-[10px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"><Send size={13} />{submitting ? 'Submitting...' : 'Submit Request'}</button></footer>
				</form>
			</div>
		</main>
	);
}
