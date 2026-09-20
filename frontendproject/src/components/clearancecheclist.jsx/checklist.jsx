import React, { useMemo, useState } from 'react';
import { FiChevronDown, FiPlus, FiSearch, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const initialItems = [];

export default function ClearanceChecklist() {
	const navigate = useNavigate();
	const [items, setItems] = useState(initialItems);
	const [searchTerm, setSearchTerm] = useState('');
	const [stepFilter, setStepFilter] = useState('All Clearance Steps');
	const [statusFilter, setStatusFilter] = useState('All Status');
	const [showSuccess, setShowSuccess] = useState(true);

	const filteredItems = useMemo(() => items.filter((item) => {
		const query = searchTerm.trim().toLowerCase();
		const matchesSearch = !query || [item.name, item.step, item.status]
			.some((value) => String(value || '').toLowerCase().includes(query));
		const matchesStep = stepFilter === 'All Clearance Steps' || item.step === stepFilter;
		const matchesStatus = statusFilter === 'All Status' || item.status === statusFilter;
		return matchesSearch && matchesStep && matchesStatus;
	}), [items, searchTerm, stepFilter, statusFilter]);

	return (
		<main className="min-h-screen bg-gray-100 px-4 py-5 text-slate-900 sm:px-6">
			<div className="mx-auto max-w-7xl">
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<h1 className="text-xl font-bold text-gray-900">Clearance Checklist</h1>
					<div className="text-xs text-gray-500">
						<button type="button" onClick={() => navigate('/admin')} className="hover:text-blue-700">Dashboard</button>
						<span className="mx-2">/</span>
						<span>Clearance Checklist</span>
					</div>
				</div>

				{showSuccess && (
					<div className="mt-4 flex items-start justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-emerald-800">
						<div className="flex items-start gap-3">
							<span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">✓</span>
							<div><p className="text-xs font-bold">Success!</p><p className="mt-1 text-[11px]">Checklist item has been created successfully.</p></div>
						</div>
						<button type="button" title="Dismiss success message" onClick={() => setShowSuccess(false)} className="text-gray-400 hover:text-gray-700"><FiX /></button>
					</div>
				)}

				<section className="mt-4 rounded-md border border-gray-200 bg-white p-3">
					<div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto]">
						<div className="relative">
							<FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
							<input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search checklist..." aria-label="Search checklist" className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
						</div>
						<div className="relative">
							<select value={stepFilter} onChange={(event) => setStepFilter(event.target.value)} className="w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-xs text-gray-600 outline-none focus:border-blue-500">
								<option>All Clearance Steps</option>
								{[...new Set(items.map((item) => item.step))].filter(Boolean).map((step) => <option key={step}>{step}</option>)}
							</select><FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
						</div>
						<div className="relative">
							<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-xs text-gray-600 outline-none focus:border-blue-500"><option>All Status</option><option>Active</option><option>Inactive</option></select>
							<FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
						</div>
						<button type="button" onClick={() => navigate('/admin/add-checklist')} className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"><FiPlus /> Add New Checklist</button>
					</div>
				</section>

				<div className="mt-4 overflow-x-auto rounded-md border border-gray-200 bg-white">
					<table className="w-full min-w-[720px] text-left text-sm">
						<thead className="border-b border-gray-200 bg-slate-50 text-xs uppercase text-gray-600"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Checklist Item</th><th className="px-4 py-3">Clearance Step</th><th className="px-4 py-3">Required</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
						<tbody className="divide-y divide-gray-100">{filteredItems.length === 0 ? <tr><td colSpan="6" className="px-4 py-10 text-center text-sm text-gray-500">No checklist items found.</td></tr> : filteredItems.map((item, index) => <tr key={item.id} className="hover:bg-slate-50"><td className="px-4 py-3 text-gray-500">{index + 1}</td><td className="px-4 py-3 font-medium">{item.name}</td><td className="px-4 py-3 text-gray-600">{item.step}</td><td className="px-4 py-3 text-gray-600">{item.required}</td><td className="px-4 py-3 text-gray-600">{item.status}</td><td className="px-4 py-3">...</td></tr>)}</tbody>
					</table>
				</div>
			</div>
		</main>
	);
}
