import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, BookOpen, CheckCircle2, Eye, Filter, Plus, Printer, RotateCcw, Search } from 'lucide-react';

const API_URL = 'http://localhost:3000/api/library/records';
const initialFilters = { search: '', department: 'All', campus: 'All' };
const initialDemoRows = [
	{
		_id: 'demo-library-1', requestId: 'CLR-1791114431624', employeeName: 'Aster', employeeId: 'BDU_223',
		department: 'Information Technology', campus: 'Main', materialType: 'Book', title: 'Advanced Javascript',
		materialId: 'ISBN: 978-013', isbn: 'ISBN: 978-013', publicationYear: 2022, borrowDate: '2026-09-01', dueDate: '2026-10-01', currentCondition: 'Good',
		outstandingFineAmount: 250, fineAmount: 250, finePaidAmount: 0, recordStatus: 'Borrowed', isDemo: true,
	},
	{
		_id: 'demo-library-2', requestId: 'CLR-1791114431511', employeeName: 'Abebe', employeeId: 'BDU_105',
		department: 'Finance', campus: 'Main', materialType: 'Journal', title: 'Financial Analytics',
		materialId: 'JRN: FA-2024', isbn: 'JRN: FA-2024', publicationYear: 2024, borrowDate: '2026-08-01', dueDate: '2026-08-15', currentCondition: 'Damaged',
		outstandingFineAmount: 120, fineAmount: 120, finePaidAmount: 0, recordStatus: 'Overdue', isDemo: true,
	},
	{
		_id: 'demo-library-3', requestId: 'CLR-1791114431488', employeeName: 'Bekele', employeeId: 'BDU_011',
		department: 'Administration', campus: 'Peda', materialType: 'Laptop', title: 'Dell XPS',
		materialId: 'S/N: 1234', borrowDate: '2026-09-10', dueDate: '2026-10-10', currentCondition: 'Fair',
		outstandingFineAmount: 0, recordStatus: 'Borrowed', isDemo: true,
	},
	{
		_id: 'demo-library-4', requestId: 'CLR-1791114431477', employeeName: 'Mekdes', employeeId: 'BDU_042',
		department: 'Biology', campus: 'Main', materialType: 'Book', title: 'Introduction to Biology',
		materialId: 'ISBN: 978-111', borrowDate: '2026-07-10', dueDate: '2026-08-10', currentCondition: 'Good',
		outstandingFineAmount: 0, recordStatus: 'Returned', isDemo: true,
	},
];

const formatDate = (value) => value
	? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
	: '-';
const formatMoney = (value) => Number(value || 0).toLocaleString();

const getRecordStatus = (record, material) => {
	const status = String(material.status || material.recordStatus || record.recordStatus || '').toLowerCase();
	if (['returned', 'cleared', 'approved', 'completed'].includes(status)) return 'Returned';
	if (status === 'lost') return 'Lost';
	if (status === 'overdue') return 'Overdue';
	if (status === 'outstanding') return 'Outstanding';
	if (status === 'borrowed') return 'Borrowed';
	return Number(record.outstandingFineAmount || 0) > 0 || record.borrowedItemsStatus === 'Not Clear'
		? 'Outstanding'
		: 'Borrowed';
};

const toMaterialRows = (records) => records.flatMap((record) => {
	const materials = Array.isArray(record.materials) && record.materials.length
		? record.materials
		: [record];

	return materials.map((material, index) => ({
		...record,
		...material,
		_id: material._id || `${record._id}-${index}`,
		sourceMaterialId: material._id || (Array.isArray(record.materials) && record.materials.length ? material.materialId : `${record._id}-${index}`),
		requestId: record.requestId,
		employeeId: record.employeeId,
		employeeName: record.employeeName,
		department: record.department,
		campus: record.campus,
		outstandingFineAmount: material.outstandingFineAmount ?? (index === 0 ? record.outstandingFineAmount : 0),
		fineBalance: Math.max(0, material.fineBalance != null
			? Number(material.fineBalance)
			: Number(material.fineAmount ?? (index === 0 ? record.outstandingFineAmount : 0)) - Number(material.finePaidAmount || 0)),
		lastFineEvent: (material.fineEvents || []).slice(-1)[0] || material.lastFineEvent,
		recordStatus: getRecordStatus(record, material),
	}));
});

export default function LibraryRecords() {
	const [searchParams] = useSearchParams();
	const employeeId = searchParams.get('employeeId') || '';
	const [records, setRecords] = useState([]);
	const [demoRows, setDemoRows] = useState(initialDemoRows);
	const [selectedDetails, setSelectedDetails] = useState(null);
	const [activeAction, setActiveAction] = useState(null);
	const [showAssignModal, setShowAssignModal] = useState(false);
	const [options, setOptions] = useState({ departments: [], campuses: [] });
	const [filters, setFilters] = useState(initialFilters);
	const [activeTab, setActiveTab] = useState('open');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const loadRecords = useCallback(async (nextFilters = initialFilters) => {
		try {
			setLoading(true);
			setError('');
			const response = await axios.get(API_URL, {
				params: { ...nextFilters, employeeId },
				headers: { Authorization: `******'token') || ''}` },
			});
			const data = response.data || {};
			setRecords(Array.isArray(data.records) ? data.records : []);
			setOptions({
				departments: Array.isArray(data.departments) ? data.departments : [],
				campuses: Array.isArray(data.campuses) ? data.campuses : [],
			});
		} catch (requestError) {
			setRecords([]);
			setError(requestError.response?.data?.message || 'Unable to load library records.');
		} finally {
			setLoading(false);
		}
	}, [employeeId]);

	useEffect(() => { loadRecords(); }, [loadRecords]);

	const materialRows = useMemo(() => {
		const search = filters.search.trim().toLowerCase();
		const filteredDemoRows = (employeeId ? [] : demoRows).filter((record) => (
			(filters.department === 'All' || record.department === filters.department)
			&& (filters.campus === 'All' || record.campus === filters.campus)
			&& (!search || `${record.requestId} ${record.employeeName} ${record.employeeId} ${record.department} ${record.title} ${record.materialId}`.toLowerCase().includes(search))
		));
		return [...toMaterialRows(records), ...filteredDemoRows];
	}, [records, demoRows, filters, employeeId]);
	const departmentOptions = [...new Set([...options.departments, ...demoRows.map((record) => record.department)])];
	const campusOptions = [...new Set([...options.campuses, ...demoRows.map((record) => record.campus)])];
	const counts = useMemo(() => materialRows.reduce((total, record) => {
		const key = record.recordStatus === 'Lost' ? 'outstanding' : record.recordStatus.toLowerCase();
		total[key] += 1;
		return total;
	}, { borrowed: 0, outstanding: 0, overdue: 0, returned: 0 }), [materialRows]);

	const displayedRows = materialRows.filter((record) => (
		activeTab === 'open'
			? ['Borrowed', 'Outstanding', 'Overdue', 'Lost'].includes(record.recordStatus)
			: record.recordStatus === 'Returned'
	));

	const updateFilter = (event) => setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
	const submitFilters = (event) => {
		event.preventDefault();
		loadRecords(filters);
	};
	const resetFilters = () => {
		setFilters(initialFilters);
		loadRecords(initialFilters);
	};
	const addDemoMaterial = (material) => {
		const id = Date.now();
		setDemoRows((current) => [{
			...material.employee,
			_id: `demo-library-${id}`,
			requestId: `DEMO-${id}`,
			materialType: material.materialType,
			title: material.title,
			materialId: material.materialId,
			isbn: material.materialId,
			publicationYear: material.publicationYear,
			borrowDate: material.borrowDate,
			dueDate: material.dueDate,
			currentCondition: material.condition,
			remark: material.remark,
			outstandingFineAmount: 0,
			recordStatus: 'Borrowed',
			isDemo: true,
		}, ...current]);
		setActiveTab('open');
		setShowAssignModal(false);
	};
	const handleMaterialAction = async (record, action, values) => {
		if (record.isDemo) {
			setDemoRows((current) => current.map((item) => {
				if (item._id !== record._id) return item;
				if (action === 'return') {
					return { ...item, recordStatus: 'Returned', returnDate: new Date().toISOString(), currentCondition: values.condition, lastFineEvent: { type: 'Return', date: new Date().toISOString() } };
				}
				if (action === 'damage' || action === 'lost') {
					return {
						...item,
						recordStatus: action === 'lost' ? 'Lost' : 'Returned',
						currentCondition: action === 'lost' ? 'Lost' : 'Damaged',
						returnDate: action === 'damage' ? new Date().toISOString() : item.returnDate,
						fineAmount: Number(item.fineAmount || 0) + Number(values.amount),
						outstandingFineAmount: Number(item.outstandingFineAmount || 0) + Number(values.amount),
						lastFineEvent: { type: action === 'lost' ? 'Lost' : 'Damaged', amount: Number(values.amount), note: values.note, date: new Date().toISOString() },
					};
				}
				if (action === 'renew') return { ...item, dueDate: values.dueDate, recordStatus: 'Borrowed', lastFineEvent: { type: 'Renewal', date: new Date().toISOString() } };
				if (action === 'payment') {
					return {
						...item,
						finePaidAmount: Number(item.finePaidAmount || 0) + Number(values.amount),
						outstandingFineAmount: Math.max(0, Number(item.outstandingFineAmount || 0) - Number(values.amount)),
						lastFineEvent: { type: 'Payment', amount: Number(values.amount), note: values.note, date: new Date().toISOString() },
					};
				}
				return item;
			}));
			setActiveAction(null);
			return;
		}

		try {
			const materialKey = record.sourceMaterialId || record.materialId;
			const { data } = await axios.patch(
				`${API_URL}/${encodeURIComponent(record.requestId)}/materials/${encodeURIComponent(materialKey)}/${action}`,
				values,
				{ headers: { Authorization: `******'token') || ''}` } },
			);
			if (!data?.success) throw new Error(data?.message || 'Unable to update library material.');
			setActiveAction(null);
			await loadRecords(filters);
		} catch (requestError) {
			throw new Error(requestError.response?.data?.message || requestError.message || 'Unable to update library material.');
		}
	};
	const printReceipt = (record, event = {}) => {
		const popup = window.open('', '_blank', 'width=720,height=760');
		if (!popup) {
			setError('Allow pop-ups in your browser to print the receipt.');
			return;
		}
		const escapeHtml = (value) => String(value ?? '-').replace(/[&<>"']/g, (character) => ({
			'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
		})[character]);
		const receiptType = event.type === 'Payment' ? 'Fine Payment Receipt' : 'Library Material Receipt';
		popup.document.write(`<!doctype html><html><head><title>${receiptType}</title><style>body{font:14px Arial,sans-serif;margin:40px;color:#172033}h1{color:#0f766e}table{border-collapse:collapse;width:100%;margin-top:24px}td{border:1px solid #cbd5e1;padding:10px}td:first-child{font-weight:bold;width:34%}.note{margin-top:28px;color:#64748b;font-size:12px}</style></head><body><h1>Library Office</h1><h2>${receiptType}</h2><table><tr><td>Employee</td><td>${escapeHtml(record.employeeName)} (${escapeHtml(record.employeeId)})</td></tr><tr><td>Clearance / Request ID</td><td>${escapeHtml(record.requestId)}</td></tr><tr><td>Material</td><td>${escapeHtml(record.title || record.materialTitle)} (${escapeHtml(record.materialId || record.isbn)})</td></tr><tr><td>Material type</td><td>${escapeHtml(record.materialType)}</td></tr><tr><td>Status</td><td>${escapeHtml(record.recordStatus)}</td></tr><tr><td>Borrowed</td><td>${escapeHtml(formatDate(record.borrowDate || record.submittedDate))}</td></tr><tr><td>Due date</td><td>${escapeHtml(formatDate(record.dueDate))}</td></tr><tr><td>Returned</td><td>${escapeHtml(formatDate(record.returnDate || (event.type === 'Return' ? new Date() : null)))}</td></tr><tr><td>Fine payment</td><td>${event.type === 'Payment' ? `${escapeHtml(formatMoney(event.amount))} ETB` : '-'}</td></tr><tr><td>Outstanding fine</td><td>${escapeHtml(formatMoney(record.fineBalance))} ETB</td></tr><tr><td>Recorded</td><td>${escapeHtml(new Date().toLocaleString())}</td></tr></table><p class="note">This receipt was generated by the Library Office.</p><script>window.onload=()=>window.print()</script></body></html>`);
		popup.document.close();
	};

	const stats = [
		{ label: 'Borrowed Materials', value: counts.borrowed, icon: BookOpen, color: 'border-blue-100 bg-blue-50 text-blue-700' },
		{ label: 'Outstanding Materials', value: counts.outstanding, icon: AlertTriangle, color: 'border-amber-100 bg-amber-50 text-amber-700' },
		{ label: 'Overdue Materials', value: counts.overdue, icon: RotateCcw, color: 'border-rose-100 bg-rose-50 text-rose-700' },
		{ label: 'Returned Materials', value: counts.returned, icon: CheckCircle2, color: 'border-emerald-100 bg-emerald-50 text-emerald-700' },
	];

	return (
		<main className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-6">
			<div className="mx-auto max-w-7xl space-y-4">
				<header className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600">Library Office</p>
						<h1 className="mt-1 text-2xl font-bold text-slate-900">Library Records</h1>
						<p className="text-sm text-slate-500">
							{employeeId
								? `Showing records for employee ${employeeId}.`
								: 'Manage borrowed, outstanding, overdue, and returned library materials.'}
						</p>
					</div>
					<button
						type="button"
						onClick={() => setShowAssignModal(true)}
						className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-800"
					>
						<Plus size={15} /> Issue / Assign Sample Material
					</button>
				</header>

				<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Library record summary">
					{stats.map(({ label, value, icon: Icon, color }) => (
						<div key={label} className={`flex items-center justify-between rounded-xl border p-3 shadow-sm ${color}`}>
							<div className="flex items-center gap-2">
								<Icon size={16} />
								<span className="text-xs font-medium">{label}</span>
							</div>
							<strong className="text-sm">{value.toLocaleString()}</strong>
						</div>
					))}
				</section>
				<p className="text-right text-[10px] text-slate-500">* Sample/demo records are for testing only and are not saved to the database.</p>

				<form onSubmit={submitFilters} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
					<h2 className="mb-2 text-sm font-semibold text-slate-800">Search &amp; Filter</h2>
					<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_minmax(150px,.8fr)_minmax(150px,.8fr)_auto]">
						<label className="relative">
							<span className="sr-only">Search library records</span>
							<Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
							<input
								name="search"
								value={filters.search}
								onChange={updateFilter}
								placeholder="Search library records..."
								className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-teal-500"
							/>
						</label>
						<Select label="All Departments" name="department" value={filters.department} onChange={updateFilter} options={departmentOptions} />
						<Select label="All Campuses" name="campus" value={filters.campus} onChange={updateFilter} options={campusOptions} />
						<div className="flex gap-2">
							<button type="submit" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700">
								<Filter size={14} /> Filter
							</button>
							<button type="button" onClick={resetFilters} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
								Reset
							</button>
						</div>
					</div>
				</form>

				<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="Library materials">
					<div className="flex border-b border-slate-200" role="tablist" aria-label="Material status">
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === 'open'}
							onClick={() => setActiveTab('open')}
							className={`border-b-2 px-4 py-3 text-xs font-semibold ${activeTab === 'open' ? 'border-teal-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
						>
							Borrowed / Outstanding
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === 'returned'}
							onClick={() => setActiveTab('returned')}
							className={`border-b-2 px-4 py-3 text-xs font-semibold ${activeTab === 'returned' ? 'border-teal-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
						>
							Cleared / Returned
						</button>
					</div>

					{error && <div className="border-b border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
					<div className="relative overflow-x-auto">
						<div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-2xl font-semibold text-slate-400/40">
							SAMPLE / DEMO DATA (TESTING)
						</div>
						<table className="w-full min-w-[1100px] text-left text-xs">
							<thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-600">
								<tr>
									<th className="px-3 py-3">#</th>
									<th className="px-3 py-3">BDU Clearance ID</th>
									<th className="px-3 py-3">Employee Name / ID</th>
									<th className="px-3 py-3">Department / Campus</th>
									<th className="px-3 py-3">Material Type</th>
									<th className="px-3 py-3">Title / Accession Number</th>
									<th className="px-3 py-3">Borrowed Date</th>
									<th className="px-3 py-3">Due Date</th>
									<th className="px-3 py-3">Current Condition</th>
									<th className="px-3 py-3 text-right">Fine Amount (ETB)</th>
									<th className="px-3 py-3">Status</th>
									<th className="sticky right-0 z-20 min-w-[170px] bg-slate-50 px-3 py-3 text-right shadow-[-8px_0_12px_-10px_rgba(15,23,42,0.45)]">Action</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{loading ? (
									<tr><td colSpan="12" className="p-9 text-center text-slate-400">Loading records...</td></tr>
								) : displayedRows.length === 0 ? (
									<tr><td colSpan="12" className="p-9 text-center text-sm text-slate-400">No records found.</td></tr>
								) : displayedRows.map((record, index) => (
									<tr key={record._id} className="hover:bg-slate-50">
										<td className="px-3 py-3 text-slate-400">{index + 1}.</td>
										<td className="px-3 py-3 font-mono text-slate-700">{record.requestId || '-'}</td>
										<td className="px-3 py-3">
											<div className="font-semibold text-slate-800">{record.employeeName || '-'}</div>
											<div className="mt-0.5 text-[10px] text-slate-500">{record.employeeId || '-'}</div>
										</td>
										<td className="px-3 py-3">
											<div>{record.department || '-'}</div>
											<div className="mt-0.5 text-[10px] text-slate-500">{record.campus || '-'}</div>
										</td>
										<td className="px-3 py-3">{record.materialType || '-'}</td>
										<td className="px-3 py-3">
											<div className="font-medium text-slate-800">{record.title || record.materialTitle || 'Library material'}</div>
											<div className="mt-0.5 text-[10px] text-slate-500">{record.materialId || '-'}</div>
										</td>
										<td className="px-3 py-3">{formatDate(record.borrowDate || record.submittedDate || record.createdAt)}</td>
										<td className="px-3 py-3">{formatDate(record.dueDate)}</td>
										<td className="px-3 py-3">{record.condition || record.currentCondition || '-'}</td>
										<td className="px-3 py-3 text-right">{formatMoney(record.fineBalance)}</td>
										<td className="px-3 py-3"><StatusBadge status={record.recordStatus} /></td>
										<td className="sticky right-0 z-10 min-w-[170px] bg-white px-3 py-3 text-right shadow-[-8px_0_12px_-10px_rgba(15,23,42,0.35)] group-hover:bg-slate-50">
											<MaterialActions
												record={record}
												onView={() => setSelectedDetails(record)}
												onAction={(action) => setActiveAction({ record, action })}
												onPrint={(event) => printReceipt(record, event)}
											/>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			</div>
			{showAssignModal && (
				<SampleMaterialModal
					employees={initialDemoRows}
					onCancel={() => setShowAssignModal(false)}
					onAssign={addDemoMaterial}
				/>
			)}
			{selectedDetails && (
				<MaterialDetailsModal record={selectedDetails} onClose={() => setSelectedDetails(null)} onPrint={() => printReceipt(selectedDetails, selectedDetails.lastFineEvent || (selectedDetails.recordStatus === 'Returned' ? { type: 'Return' } : {}))} />
			)}
			{activeAction && (
				<MaterialActionModal
					record={activeAction.record}
					action={activeAction.action}
					onCancel={() => setActiveAction(null)}
					onSubmit={(values) => handleMaterialAction(activeAction.record, activeAction.action, values)}
				/>
			)}
		</main>
	);
}

function MaterialActions({ record, onView, onAction, onPrint }) {
	const isReturned = record.recordStatus === 'Returned';
	const isLost = record.recordStatus === 'Lost';
	const activeLoan = ['Borrowed', 'Outstanding', 'Overdue'].includes(record.recordStatus);
	const alreadyReportedDamaged = isReturned && (record.condition || record.currentCondition) === 'Damaged';
	const canPrint = isReturned || (isLost && record.fineBalance <= 0 && Number(record.finePaidAmount || 0) > 0) || Number(record.finePaidAmount || 0) > 0 || record.lastFineEvent?.type === 'Payment';

	return (
		<div className="flex min-w-[150px] flex-col items-stretch gap-1.5">
			<button type="button" onClick={onView} className="inline-flex items-center justify-center gap-1 rounded-md bg-teal-600 px-2.5 py-2 font-semibold text-white hover:bg-teal-700">
				<Eye size={13} /> View Details
			</button>
			<details className="group relative">
				<summary className="cursor-pointer list-none rounded-md border border-slate-300 px-2.5 py-1.5 text-center font-semibold text-slate-700 hover:bg-slate-50">
					More Actions <span aria-hidden="true">⌄</span>
				</summary>
				<div className="absolute right-0 z-30 mt-1 flex min-w-48 flex-col rounded-lg border border-slate-200 bg-white p-1 text-left shadow-xl">
					<ActionMenuButton onClick={() => onAction('return')} disabled={isReturned || isLost}>Mark as Returned</ActionMenuButton>
					<ActionMenuButton onClick={() => onAction('damage')} disabled={isLost || alreadyReportedDamaged}>Report as Damaged</ActionMenuButton>
					<ActionMenuButton onClick={() => onAction('lost')} disabled={!activeLoan}>Report as Lost</ActionMenuButton>
					<ActionMenuButton onClick={() => onAction('renew')} disabled={!activeLoan}>Extend Due Date / Renew</ActionMenuButton>
					<ActionMenuButton onClick={() => onAction('payment')} disabled={record.fineBalance <= 0}>Record Fine Payment</ActionMenuButton>
					<ActionMenuButton onClick={() => onPrint(record.lastFineEvent || (isReturned ? { type: 'Return' } : {}))} disabled={!canPrint}>
						<span className="inline-flex items-center gap-2"><Printer size={13} /> Print Receipt / Slip</span>
					</ActionMenuButton>
				</div>
			</details>
		</div>
	);
}

function ActionMenuButton({ children, disabled = false, onClick }) {
	return (
		<button
			type="button"
			onClick={(event) => {
				event.currentTarget.closest('details')?.removeAttribute('open');
				onClick();
			}}
			disabled={disabled}
			className="rounded px-3 py-2 text-left text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-800 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-white"
		>
			{children}
		</button>
	);
}

function MaterialDetailsModal({ record, onClose, onPrint }) {
	const profile = record.employeeProfile || {};
	const details = [
		['Employee Name', record.employeeName || profile.fullName],
		['Employee ID', record.employeeId || profile.employeeId],
		['Department', record.department || profile.department],
		['Position', profile.position],
		['Campus', record.campus || profile.campus],
		['Gender', profile.gender],
		['Nationality', profile.nationality],
		['Marital Status', profile.maritalStatus],
		['Date of Birth', formatDate(profile.dateOfBirth)],
		['Employment Type', profile.employmentType],
		['Hire Date', formatDate(profile.hireDate)],
		['Education Level', profile.educationLevel],
		['Room Number', profile.roomNumber],
		['Phone', profile.phone],
		['Email', profile.email],
		['Address', profile.address],
		['Emergency Contact', profile.emergencyContact],
		['Emergency Phone', profile.emergencyPhone],
		['Material Type', record.materialType],
		['Title / Name', record.title || record.materialTitle],
		['ISBN / Accession Number', record.isbn || record.materialId],
		['Publication Year', record.publicationYear],
		['Condition', record.condition || record.currentCondition],
		['Borrowed Date', formatDate(record.borrowDate || record.submittedDate || record.createdAt)],
		['Due Date', formatDate(record.dueDate)],
		['Returned Date', formatDate(record.returnDate)],
		['Current Status', record.recordStatus],
		['Fine Total', `${formatMoney(record.fineAmount)} ETB`],
		['Fine Paid', `${formatMoney(record.finePaidAmount)} ETB`],
		['Fine Balance', `${formatMoney(record.fineBalance)} ETB`],
	];
	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-3" role="presentation" onMouseDown={(event) => {
			if (event.target === event.currentTarget) onClose();
		}}>
			<section role="dialog" aria-modal="true" aria-labelledby="material-details-title" className="my-auto w-full max-w-2xl rounded-xl bg-white p-5 shadow-2xl">
				<div className="flex items-start justify-between gap-4">
					<div>
						<p className="text-xs font-bold uppercase tracking-wider text-teal-700">Library Office</p>
						<h2 id="material-details-title" className="mt-1 text-xl font-bold text-slate-900">Material &amp; Borrower Details</h2>
						<p className="mt-1 text-xs text-slate-500">{record.requestId || 'Library record'}{record.isDemo ? ' · Demo data' : ''}</p>
					</div>
					<button type="button" onClick={onClose} aria-label="Close details" className="rounded-md px-2 py-1 text-lg text-slate-500 hover:bg-slate-100">×</button>
				</div>
				<dl className="mt-4 grid gap-3 sm:grid-cols-2">
					{details.map(([label, value]) => (
						<div key={label} className="rounded-lg bg-slate-50 px-3 py-2">
							<dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
							<dd className="mt-1 break-words text-sm font-medium text-slate-800">{value || '-'}</dd>
						</div>
					))}
				</dl>
				<div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
					{record.recordStatus === 'Returned' || record.finePaidAmount > 0 ? (
						<button type="button" onClick={onPrint} className="inline-flex items-center gap-2 rounded-lg border border-teal-200 px-3 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50"><Printer size={15} /> Print Receipt</button>
					) : null}
					<button type="button" onClick={onClose} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900">Close</button>
				</div>
			</section>
		</div>
	);
}

function MaterialActionModal({ record, action, onCancel, onSubmit }) {
	const today = new Date();
	const defaultDueDate = parseDateInput(record.dueDate || today);
	defaultDueDate.setDate(defaultDueDate.getDate() + 14);
	const [form, setForm] = useState({
		amount: action === 'payment' ? String(record.fineBalance || '') : '',
		note: '',
		condition: ['Good', 'Fair'].includes(record.condition || record.currentCondition) ? (record.condition || record.currentCondition) : 'Good',
		dueDate: getLocalDateInputValue(defaultDueDate),
	});
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);
	const labels = {
		return: 'Mark Material as Returned',
		damage: 'Report Damaged Material',
		lost: 'Report Lost Material',
		renew: 'Extend Due Date / Renew',
		payment: 'Record Fine Payment',
	};
	const requiresFine = action === 'damage' || action === 'lost';

	const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
	const submit = async (event) => {
		event.preventDefault();
		setError('');
		setSaving(true);
		try {
			await onSubmit({
				...form,
				amount: form.amount ? Number(form.amount) : undefined,
			});
		} catch (actionError) {
			setError(actionError.message || 'Unable to complete the action.');
			setSaving(false);
		}
	};

	return (
		<div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-3" role="presentation" onMouseDown={(event) => {
			if (event.target === event.currentTarget && !saving) onCancel();
		}}>
			<form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="material-action-title" className="my-auto w-full max-w-lg space-y-4 rounded-xl bg-white p-5 shadow-2xl">
				<div>
					<h2 id="material-action-title" className="text-lg font-bold text-slate-900">{labels[action]}</h2>
					<p className="mt-1 text-xs text-slate-500">{record.title || record.materialTitle} · {record.employeeName} ({record.employeeId})</p>
				</div>
				{action === 'return' && (
					<label className="block text-sm font-medium text-slate-700">Condition on return
						<select name="condition" value={form.condition} onChange={update} className={`${inputClassName} text-sm`}>
							{['Good', 'Fair', 'Damaged'].map((condition) => <option key={condition}>{condition}</option>)}
						</select>
					</label>
				)}
				{requiresFine && (
					<label className="block text-sm font-medium text-slate-700">Fine / compensation (ETB)
						<input type="number" name="amount" value={form.amount} min="0.01" step="0.01" required onChange={update} className={`${inputClassName} text-sm`} />
					</label>
				)}
				{action === 'payment' && (
					<label className="block text-sm font-medium text-slate-700">Payment amount (ETB), balance {formatMoney(record.fineBalance)}
						<input type="number" name="amount" value={form.amount} min="0.01" max={record.fineBalance} step="0.01" required onChange={update} className={`${inputClassName} text-sm`} />
					</label>
				)}
				{action === 'renew' && (
					<label className="block text-sm font-medium text-slate-700">New due date
						<input type="date" name="dueDate" value={form.dueDate} min={getLocalDateInputValue(addDays(parseDateInput(record.dueDate || today), 1))} required onChange={update} className={`${inputClassName} text-sm`} />
					</label>
				)}
				{action !== 'return' && (
					<label className="block text-sm font-medium text-slate-700">Note / reason
						<textarea name="note" value={form.note} onChange={update} rows="3" required={requiresFine || action === 'payment'} className={`${inputClassName} text-sm`} placeholder={action === 'payment' ? 'Payment reference / receipt number' : 'Add a short note for the record'} />
					</label>
				)}
				{error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
				<div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
					<button type="button" disabled={saving} onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
					<button type="submit" disabled={saving} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">{saving ? 'Saving...' : 'Confirm'}</button>
				</div>
			</form>
		</div>
	);
}

function parseDateInput(value) {
	if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T12:00:00`);
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? new Date() : date;
}

function addDays(date, count) {
	const result = new Date(date);
	result.setDate(result.getDate() + count);
	return result;
}

function getLocalDateInputValue(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function SampleMaterialModal({ employees, onCancel, onAssign }) {
	const employeeOptions = [...new Map(employees.map((employee) => [employee.employeeId, employee])).values()];
	const [employeeSearch, setEmployeeSearch] = useState(`${employeeOptions[0].employeeId} / ${employeeOptions[0].employeeName}`);
	const selectedEmployee = employeeOptions.find((employee) => (
		`${employee.employeeId} / ${employee.employeeName}` === employeeSearch
	));
	const today = new Date();
	const defaultDueDate = new Date(today);
	defaultDueDate.setDate(defaultDueDate.getDate() + 31);
	const [form, setForm] = useState({
		materialType: 'Book',
		title: 'Operating Systems',
		materialId: 'ISBN: 978-015',
		publicationYear: String(new Date().getFullYear()),
		condition: 'Good',
		borrowDate: getLocalDateInputValue(today),
		dueDate: getLocalDateInputValue(defaultDueDate),
		remark: 'Sample loan for clearance testing',
	});
	const [employeeError, setEmployeeError] = useState('');

	const updateForm = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
	const submit = (event) => {
		event.preventDefault();
		if (!selectedEmployee) {
			setEmployeeError('Select an employee from the sample employee list.');
			return;
		}
		setEmployeeError('');
		onAssign({ ...form, employee: selectedEmployee });
	};

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-3" role="presentation" onMouseDown={(event) => {
			if (event.target === event.currentTarget) onCancel();
		}}>
			<form onSubmit={submit} className="my-auto w-full max-w-2xl space-y-3 rounded-xl bg-white p-4 shadow-2xl sm:p-5" role="dialog" aria-modal="true" aria-labelledby="sample-material-title">
				<h2 id="sample-material-title" className="text-lg font-bold text-slate-900">Issue / Assign Sample Material (DEMO/TESTING)</h2>

				<fieldset className="space-y-2">
					<legend className="text-xs font-bold uppercase tracking-wide text-slate-700">Section 1: Employee Details</legend>
					<label className="block text-xs font-medium text-slate-700">
						Select Employee (Search)
						<input
							list="sample-library-employees"
							value={employeeSearch}
							onChange={(event) => {
								setEmployeeSearch(event.target.value);
								setEmployeeError('');
							}}
							placeholder="Search by employee ID or name"
							required
							className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
						/>
						<datalist id="sample-library-employees">
							{employeeOptions.map((employee) => (
								<option key={employee.employeeId} value={`${employee.employeeId} / ${employee.employeeName}`} />
							))}
						</datalist>
						{employeeError && <span className="mt-1 block text-rose-600">{employeeError}</span>}
					</label>
					<label className="block text-xs font-medium text-slate-700">
						Department / Campus (Auto-filled)
						<input
							value={selectedEmployee ? `${selectedEmployee.department} / ${selectedEmployee.campus} Campus` : ''}
							readOnly
							placeholder="Select a sample employee"
							className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
						/>
					</label>
				</fieldset>

				<fieldset className="space-y-2">
					<legend className="text-xs font-bold uppercase tracking-wide text-slate-700">Section 2: Material Details</legend>
					<div className="grid gap-2 sm:grid-cols-2">
						<FormField label="Material Type">
							<select name="materialType" value={form.materialType} onChange={updateForm} className={inputClassName}>
								{['Book', 'Journal', 'Laptop', 'Equipment', 'Other'].map((type) => <option key={type}>{type}</option>)}
							</select>
						</FormField>
						<FormField label="Book Title / Name">
							<input name="title" value={form.title} onChange={updateForm} required className={inputClassName} />
						</FormField>
						<FormField label="Accession / ISBN / Tag Number">
							<input name="materialId" value={form.materialId} onChange={updateForm} required className={inputClassName} />
						</FormField>
						<FormField label="Publication Year">
							<input type="number" name="publicationYear" value={form.publicationYear} min="1000" max={new Date().getFullYear()} onChange={updateForm} className={inputClassName} />
						</FormField>
						<FormField label="Initial Condition">
							<select name="condition" value={form.condition} onChange={updateForm} className={inputClassName}>
								{['Good', 'Fair', 'Damaged'].map((condition) => <option key={condition}>{condition}</option>)}
							</select>
						</FormField>
					</div>
				</fieldset>

				<fieldset className="space-y-2">
					<legend className="text-xs font-bold uppercase tracking-wide text-slate-700">Section 3: Loan &amp; Schedule</legend>
					<div className="grid gap-2 sm:grid-cols-2">
						<FormField label="Issue / Borrowed Date">
							<input type="date" name="borrowDate" value={form.borrowDate} onChange={updateForm} required className={inputClassName} />
						</FormField>
						<FormField label="Due Date">
							<input type="date" name="dueDate" value={form.dueDate} min={form.borrowDate} onChange={updateForm} required className={inputClassName} />
						</FormField>
						<FormField label="Remark / Note" className="sm:col-span-2">
							<textarea name="remark" value={form.remark} onChange={updateForm} rows="2" className={inputClassName} />
						</FormField>
					</div>
				</fieldset>

				<div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
					<button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
					<button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">Assign Material</button>
				</div>
			</form>
		</div>
	);
}

const inputClassName = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100';

function FormField({ label, className = '', children }) {
	return <label className={`block text-xs font-medium text-slate-700 ${className}`}>{label}{children}</label>;
}

function Select({ label, name, value, onChange, options }) {
	return (
		<label className="block">
			<span className="sr-only">{label}</span>
			<select
				name={name}
				value={value}
				onChange={onChange}
				aria-label={label}
				className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-teal-500"
			>
				<option value="All">{label}</option>
				{options.filter((option) => option && option !== 'All').map((option) => (
					<option key={option} value={option}>{option}</option>
				))}
			</select>
		</label>
	);
}

function StatusBadge({ status }) {
	const appearance = {
		Borrowed: 'bg-blue-50 text-blue-700',
		Outstanding: 'bg-amber-50 text-amber-700',
		Overdue: 'bg-rose-50 text-rose-700',
		Returned: 'bg-emerald-50 text-emerald-700',
		Lost: 'bg-rose-100 text-rose-800',
	};
	return <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold ${appearance[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;
}
