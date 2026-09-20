import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CalendarDays, ChevronDown, FileText, Filter, Search, WalletCards } from 'lucide-react';

const API_URL = 'http://localhost:3000/api/finance/dashboard/records';
const emptySummary = { totalEmployees: 0, totalOutstanding: 0, totalLoans: 0, totalPayments: 0 };
const money = (value) => `ETB ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function FinancialRecords() {
	const [records, setRecords] = useState([]);
	const [summary, setSummary] = useState(emptySummary);
	const [options, setOptions] = useState({ departments: [], employeeTypes: [] });
	const [filters, setFilters] = useState({ search: '', department: 'All', employeeType: 'All', status: 'All', startDate: '', endDate: '' });
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const loadRecords = async (nextFilters = filters) => {
		try {
			setLoading(true);
			setError('');
			const response = await axios.get(API_URL, {
				params: nextFilters,
				headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
			});
			const data = response.data || {};
			setRecords(Array.isArray(data.records) ? data.records : []);
			setSummary(data.summary || emptySummary);
			setOptions({ departments: data.departments || [], employeeTypes: data.employeeTypes || [] });
		} catch (requestError) {
			setRecords([]);
			setSummary(emptySummary);
			setError(requestError.response?.data?.message || 'Unable to load financial records.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { loadRecords(); }, []);

	const updateFilter = (event) => setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
	const submitFilters = (event) => { event.preventDefault(); loadRecords(); };
	const clearFilters = () => {
		const reset = { search: '', department: 'All', employeeType: 'All', status: 'All', startDate: '', endDate: '' };
		setFilters(reset);
		loadRecords(reset);
	};

	const cards = [
		{ label: 'Total Employees', value: summary.totalEmployees.toLocaleString(), detail: 'Employees with records', icon: WalletCards, tone: 'bg-sky-50 text-sky-600' },
		{ label: 'Total Outstanding', value: money(summary.totalOutstanding), detail: 'Current balance due', icon: FileText, tone: 'bg-orange-50 text-orange-500' },
		{ label: 'Loans / Advances', value: money(summary.totalLoans), detail: 'Total issued amount', icon: WalletCards, tone: 'bg-emerald-50 text-emerald-600' },
		{ label: 'Payments This Month', value: money(summary.totalPayments), detail: 'Paid or cleared records', icon: WalletCards, tone: 'bg-violet-50 text-violet-600' },
	];

	return (
		<div className="min-h-screen bg-slate-50 p-4 md:p-6">
			<div className="mx-auto max-w-7xl space-y-5">
				<header><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Finance Office</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Financial Records</h1><p className="text-sm text-slate-500">Manage employee financial records and obligations</p></header>

				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{cards.map(({ label, value, detail, icon: Icon, tone }) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-lg font-bold text-slate-900">{value}</p><p className="mt-1 text-[10px] text-slate-400">{detail}</p></div><span className={`rounded-xl p-3 ${tone}`}><Icon size={18} /></span></div></div>)}
				</div>

				<form onSubmit={submitFilters} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
					<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
						<label className="relative text-[11px] font-semibold text-slate-500 md:col-span-2 xl:col-span-2"><span>Search by name or employee ID</span><Search size={15} className="absolute left-3 top-8 text-slate-400" /><input name="search" value={filters.search} onChange={updateFilter} placeholder="Search records" className="mt-1 w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-500" /></label>
						<Select label="All Departments" name="department" value={filters.department} onChange={updateFilter} options={options.departments} />
						<Select label="All Employee Types" name="employeeType" value={filters.employeeType} onChange={updateFilter} options={options.employeeTypes} />
						<Select label="All Statuses" name="status" value={filters.status} onChange={updateFilter} options={['Outstanding', 'Paid', 'Cleared']} />
						<div className="flex items-end gap-2"><button type="submit" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-blue-700"><Filter size={14} /> Filter</button><button type="button" onClick={clearFilters} className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Reset</button></div>
					</div>
					<div className="mt-3 grid max-w-xl gap-3 sm:grid-cols-2"><DateField label="From Date" name="startDate" value={filters.startDate} onChange={updateFilter} /><DateField label="To Date" name="endDate" value={filters.endDate} onChange={updateFilter} /></div>
				</form>

				<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><h2 className="text-sm font-bold text-slate-900">Employee Financial Summary</h2><p className="text-xs text-slate-500">Live records from the finance database</p></div><span className="text-xs text-slate-400">{records.length} record{records.length === 1 ? '' : 's'}</span></div><div className="overflow-x-auto">
					<table className="min-w-[980px] w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr>{['#', 'Employee', 'Employee ID', 'Department', 'Total Due (ETB)', 'Paid (ETB)', 'Outstanding Balance (ETB)', 'Loans / Advances (ETB)', 'Status', 'Action'].map((heading) => <th key={heading} className="px-3 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan="10" className="p-10 text-center text-slate-400">Loading financial records...</td></tr> : error ? <tr><td colSpan="10" className="p-10 text-center text-rose-600">{error}</td></tr> : records.length === 0 ? <tr><td colSpan="10" className="p-10 text-center text-slate-400">No financial records found for the selected filters.</td></tr> : records.map((record, index) => <tr key={record._id} className="hover:bg-slate-50"><td className="px-3 py-3 text-slate-400">{index + 1}</td><td className="px-3 py-3 font-semibold text-slate-800">{record.employeeName}</td><td className="px-3 py-3 text-slate-600">{record.employeeId}</td><td className="px-3 py-3 text-slate-600">{record.department}</td><td className="px-3 py-3 font-semibold">{money(record.totalDue)}</td><td className="px-3 py-3 font-semibold text-emerald-600">{money(record.paymentAmount)}</td><td className={`px-3 py-3 font-semibold ${record.outstandingBalance ? 'text-red-500' : 'text-emerald-600'}`}>{money(record.outstandingBalance)}</td><td className="px-3 py-3">{money(record.loanAmount)}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${record.status === 'Outstanding' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{record.status}</span></td><td className="px-3 py-3"><button type="button" className="rounded-lg border border-blue-200 px-2.5 py-1.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-50">View Details</button></td></tr>)}</tbody></table>
				</div></section>
			</div>
		</div>
	);
}

function Select({ label, name, value, onChange, options }) {
	return <label className="text-[11px] font-semibold text-slate-500">{label}<span className="relative mt-1 block"><select name={name} value={value} onChange={onChange} className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-8 text-xs outline-none focus:border-blue-500"><option>All</option>{options.filter((option) => option && option !== 'All').map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-2.5 text-slate-400" /></span></label>;
}

function DateField({ label, name, value, onChange }) {
	return <label className="text-[11px] font-semibold text-slate-500">{label}<span className="relative mt-1 block"><CalendarDays size={14} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" /><input type="date" name={name} value={value} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-9 py-2.5 text-xs outline-none focus:border-blue-500" /></span></label>;
}
