import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FiEdit2, FiMoreHorizontal, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

export default function ClearanceStepsList({ steps: initialSteps = [] }) {
	const navigate = useNavigate();
	const [steps, setSteps] = useState(initialSteps);
	const [searchTerm, setSearchTerm] = useState('');
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadSteps = async () => {
			try {
				const token = localStorage.getItem('token');
				const response = await axios.get('http://localhost:3000/api/clearance-steps', {
					headers: { Authorization: `Bearer ${token}` },
				});
				setSteps(response.data.steps || []);
			} finally {
				setLoading(false);
			}
		};
		loadSteps();
	}, []);
	const filteredSteps = useMemo(() => {
		const query = searchTerm.trim().toLowerCase();
		if (!query) return steps;

		return steps.filter((step) =>
			[step.name, step.description, step.department, step.status]
				.some((value) => String(value || '').toLowerCase().includes(query))
		);
	}, [searchTerm, steps]);

	return (
		<main className="min-h-screen bg-gray-100 text-slate-900">
			<div className="border-b border-gray-200 bg-white px-6 py-4">
				<div className="mx-auto flex max-w-7xl items-center gap-3 text-sm">
					<button
						type="button"
						onClick={() => navigate('/admin')}
						className="text-blue-700 hover:text-blue-900"
					>
						Dashboard
					</button>
					<span className="text-gray-400">&gt;</span>
					<span className="text-gray-600">Clearance Steps</span>
				</div>
			</div>

			<section className="mx-auto flex max-w-7xl items-start justify-between gap-6 bg-white px-6 py-5">
				<div>
					<h1 className="text-xl font-bold text-gray-900">Clearance Steps Overview</h1>
					<p className="mt-1 text-sm text-gray-600">
						Manage and configure clearance steps for the university.
					</p>
				</div>
				<button
					type="button"
					onClick={() => navigate('/admin/add-clearance-step')}
					className="inline-flex shrink-0 items-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
				>
					<FiPlus aria-hidden="true" />
					Add New Step
				</button>
			</section>

			<section className="mx-auto max-w-7xl bg-white px-6 pb-5">
				<div className="relative max-w-md">
					<FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
					<input
						type="search"
						value={searchTerm}
						onChange={(event) => setSearchTerm(event.target.value)}
						placeholder="Search clearance steps"
						aria-label="Search clearance steps"
						className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
					/>
				</div>
				{searchTerm && filteredSteps.length === 0 && (
					<p className="mt-3 text-sm text-gray-500">No clearance steps match &quot;{searchTerm}&quot;.</p>
				)}
				<div className="mt-5 overflow-x-auto rounded-md border border-gray-200">
					<table className="w-full min-w-[980px] text-left text-sm">
						<thead className="border-b border-gray-200 bg-slate-50 text-xs uppercase text-gray-600">
							<tr>
								<th className="px-4 py-3">sno</th>
								<th className="px-4 py-3">Step Name</th>
								<th className="px-4 py-3">Department/Office</th>
								<th className="px-4 py-3">Step Type</th>
								<th className="px-4 py-3">Order</th>
								<th className="px-4 py-3">Required</th>
								<th className="px-4 py-3">Status</th>
								<th className="px-4 py-3">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
			{loading ? <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-500">Loading clearance steps...</td></tr> : filteredSteps.length === 0 ? <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-500">No clearance steps found.</td></tr> : filteredSteps.map((step, index) => <tr key={step.id} className="hover:bg-slate-50"><td className="px-4 py-3 text-gray-500">{index + 1}</td><td className="px-4 py-3 font-medium text-gray-900">{step.name}</td><td className="px-4 py-3 text-gray-600">{step.department}</td><td className="px-4 py-3 text-gray-600">{step.type}</td><td className="px-4 py-3 text-gray-600">{step.order}</td><td className="px-4 py-3 text-gray-600">{step.required}</td><td className="px-4 py-3"><span className={step.status === 'Active' ? 'rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700' : 'rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600'}>{step.status}</span></td><td className="px-4 py-3"><div className="flex items-center gap-3 text-gray-500"><button type="button" title="Edit step" className="hover:text-blue-600"><FiEdit2 /></button><button type="button" title="Delete step" className="hover:text-red-600"><FiTrash2 /></button><FiMoreHorizontal aria-hidden="true" /></div></td></tr>)}
						</tbody>
					</table>
				</div>
			</section>
		</main>
	);
}
