import React from 'react';
import { CheckCircle2, Clock3, FileText, RotateCcw, Search } from 'lucide-react';

const cards = [
	{ key: 'total', label: 'Total Requests', icon: FileText, color: 'text-sky-700 bg-sky-50' },
	{ key: 'pending', label: 'Pending Requests', icon: Clock3, color: 'text-amber-700 bg-amber-50' },
	{ key: 'underReview', label: 'Under Review', icon: Search, color: 'text-blue-700 bg-blue-50' },
	{ key: 'approved', label: 'Approved', icon: CheckCircle2, color: 'text-emerald-700 bg-emerald-50' },
	{ key: 'returned', label: 'Returned', icon: RotateCcw, color: 'text-rose-700 bg-rose-50' },
];

export default function SummaryCards({ stats }) {
	return (
		<section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
			{cards.map(({ key, label, icon: Icon, color }) => (
				<div key={key} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
					<div className={`mb-3 grid h-9 w-9 place-items-center rounded-lg ${color}`}><Icon size={18} /></div>
					<p className="text-2xl font-bold text-slate-900">{stats[key]}</p>
					<p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
				</div>
			))}
		</section>
	);
}
