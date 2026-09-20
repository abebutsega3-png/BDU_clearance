import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, BookOpen, CheckCircle2, Eye, Filter, Search, RotateCcw } from 'lucide-react';

const API_URL = 'http://localhost:3000/api/library/records';
const initialFilters = { search: '', department: 'All', campus: 'All', status: 'All' };

const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
const money = (value) => `ETB ${Number(value || 0).toLocaleString()}`;

export default function LibraryRecords() {
	const [searchParams] = useSearchParams();
	const employeeId = searchParams.get('employeeId') || '';
	const [records, setRecords] = useState([]);
	const [summary, setSummary] = useState({ borrowed: 0, outstanding: 0, overdue: 0, returned: 0 });
	const [options, setOptions] = useState({ departments: [], campuses: [] });
	const [filters, setFilters] = useState(initialFilters);
	 const [activeSection, setActiveSection] = useState('All');
	 const sectionRefs = useRef({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const loadRecords = async (nextFilters = filters) => {
		try {
			setLoading(true);
			setError('');
			const response = await axios.get(API_URL, {
				params: { ...nextFilters, employeeId },
				headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
			});
			const data = response.data || {};
			setRecords(Array.isArray(data.records) ? data.records : []);
			setSummary(data.summary || { borrowed: 0, outstanding: 0, overdue: 0, returned: 0 });
			setOptions({ departments: data.departments || [], campuses: data.campuses || [] });
		} catch (requestError) {
			setRecords([]);
			setSummary({ borrowed: 0, outstanding: 0, overdue: 0, returned: 0 });
			setError(requestError.response?.data?.message || 'Unable to load library records.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { loadRecords(); }, [employeeId]);

	const updateFilter = (event) => setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
	const submitFilters = (event) => { event.preventDefault(); loadRecords(); };
	const resetFilters = () => { setFilters(initialFilters); loadRecords(initialFilters); };

	const sections = [
		{ key: 'Borrowed', title: 'Borrowed Materials', description: 'List of materials currently borrowed by employees.', icon: BookOpen, tone: 'border-teal-200', badge: 'bg-teal-50 text-teal-700' },
		{ key: 'Outstanding', title: 'Outstanding Materials', description: 'List of materials not yet returned or cleared.', icon: AlertTriangle, tone: 'border-amber-200', badge: 'bg-amber-50 text-amber-700' },
		{ key: 'Overdue', title: 'Overdue Materials', description: 'Materials that passed their expected return date.', icon: RotateCcw, tone: 'border-rose-200', badge: 'bg-rose-50 text-rose-700' },
		{ key: 'Returned', title: 'Returned Materials', description: 'List of materials already returned.', icon: CheckCircle2, tone: 'border-emerald-200', badge: 'bg-emerald-50 text-emerald-700' },
	];

	 const focusSection = (sectionKey) => {
	  setActiveSection(sectionKey);
	  if (sectionKey !== 'All') sectionRefs.current[sectionKey]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	 };

	return (
		<div className="min-h-screen bg-slate-50 p-4 md:p-6">
			<div className="mx-auto max-w-7xl space-y-5">
				<header><p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600">Library Office</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Library Records</h1><p className="text-sm text-slate-500">{employeeId ? `Showing records for employee ${employeeId}.` : 'Manage borrowed, outstanding, overdue, and returned library materials.'}</p></header>

				<nav className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="Library record categories">
					<div className="flex min-w-max items-center">
						{sections.map(({ key, title, icon: Icon, badge }) => <button key={key} type="button" onClick={() => focusSection(key)} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition ${activeSection === key ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'}`}><Icon size={14} /><span>{title}</span><span className={`rounded px-1.5 py-0.5 text-[10px] ${badge}`}>{summary[key.toLowerCase()] || 0}</span></button>)}
					</div>
				</nav>

				<form onSubmit={submitFilters} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
					<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
						<label className="relative text-[11px] font-semibold text-slate-500 lg:col-span-2"><span>Search by employee name, ID, or request ID</span><Search size={15} className="absolute left-3 top-8 text-slate-400" /><input name="search" value={filters.search} onChange={updateFilter} placeholder="Search library records" className="mt-1 w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-teal-500" /></label>
						<Select label="All Departments" name="department" value={filters.department} onChange={updateFilter} options={options.departments} />
						<Select label="All Campuses" name="campus" value={filters.campus} onChange={updateFilter} options={options.campuses} />
						<div className="flex items-end gap-2"><button type="submit" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-teal-700"><Filter size={14} /> Filter</button><button type="button" onClick={resetFilters} className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Reset</button></div>
					</div>
				</form>

				{error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
				<div className={activeSection === 'All' ? 'grid gap-4 xl:grid-cols-2' : 'grid gap-4'}>
					  {(activeSection === 'All' ? sections : sections.filter((section) => section.key === activeSection)).map((section) => <RecordSection key={section.key} section={section} sectionRef={(element) => { sectionRefs.current[section.key] = element; }} records={records.filter((record) => record.recordStatus === section.key)} loading={loading} summary={summary[section.key.toLowerCase()]} active={activeSection === section.key} />)}
				</div>
			</div>
		</div>
	);
}

function RecordSection({ section, sectionRef, records, loading, summary, active }) {
	const Icon = section.icon;
	return <section ref={sectionRef} className={`scroll-mt-5 overflow-hidden rounded-xl border bg-white shadow-sm transition ${section.tone} ${active ? 'ring-2 ring-teal-100' : ''}`}>
		<div className="border-b border-slate-100 p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Icon size={20} className="text-teal-600" />{section.title}</h2><p className="mt-1 text-sm text-slate-500">{section.description}</p></div><span className={`rounded-lg px-3 py-2 text-xs font-bold ${section.badge}`}>{summary || 0} record{summary === 1 ? '' : 's'}</span></div></div>
		<div className="overflow-x-auto"><table className="min-w-[900px] w-full text-left text-xs"><thead className="bg-slate-50 text-[12px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Material ID</th><th className="px-4 py-3">Title / Material</th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Employee ID</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Borrow Date</th><th className="px-4 py-3">Due Date</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan="9" className="p-9 text-center text-slate-400">Loading records...</td></tr> : records.length === 0 ? <tr><td colSpan="9" className="p-9 text-center text-sm text-slate-400">No records found.</td></tr> : records.map((record, index) => <tr key={record._id} className="hover:bg-slate-50"><td className="px-4 py-3 text-slate-400">{index + 1}</td><td className="px-4 py-3 font-mono text-slate-500">{record.requestId || '-'}</td><td className="px-4 py-3 font-semibold text-slate-800">{record.materialTitle || record.clearanceReason || 'Library material'}</td><td className="px-4 py-3">{record.employeeName}</td><td className="px-4 py-3">{record.employeeId}</td><td className="px-4 py-3">{record.department}</td><td className="px-4 py-3">{formatDate(record.submittedDate || record.createdAt)}</td><td className="px-4 py-3">{formatDate(record.dueDate)}</td><td className="px-4 py-3 text-right"><button type="button" className="inline-flex items-center gap-1 rounded border border-teal-200 px-2.5 py-1.5 font-semibold text-teal-700 hover:bg-teal-50"><Eye size={14} /> View</button></td></tr>)}</tbody></table></div>
	</section>;
}

function Select({ label, name, value, onChange, options }) {
	return <label className="text-[11px] font-semibold text-slate-500">{label}<select name={name} value={value} onChange={onChange} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-teal-500"><option>All</option>{options.filter((option) => option && option !== 'All').map((option) => <option key={option}>{option}</option>)}</select></label>;
}
