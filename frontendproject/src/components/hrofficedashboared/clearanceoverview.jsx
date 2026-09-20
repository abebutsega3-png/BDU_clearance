import React from "react";
import { CheckCircle2, Clock3, Hourglass, XCircle } from "lucide-react";

const statusRows = [
	{ label: "Pending", value: 24, total: 195, color: "bg-amber-400", icon: Clock3 },
	{ label: "In Progress", value: 10, total: 195, color: "bg-blue-500", icon: Hourglass },
	{ label: "Completed", value: 156, total: 195, color: "bg-emerald-500", icon: CheckCircle2 },
	{ label: "Rejected", value: 5, total: 195, color: "bg-red-500", icon: XCircle },
];

const ClearanceOverview = ({ values = {} }) => {
	const rows = statusRows.map((row) => ({ ...row, value: values[row.label === "In Progress" ? "inProgress" : row.label.toLowerCase()] ?? 0 }));
	const total = rows.reduce((sum, row) => sum + row.value, 0);
	const chart = rows.map((row, index) => `${row.color === "bg-amber-400" ? "#f59e0b" : row.color === "bg-blue-500" ? "#3b82f6" : row.color === "bg-emerald-500" ? "#10b981" : "#ef4444"} ${rows.slice(0, index).reduce((sum, item) => sum + item.value, 0) / Math.max(total, 1) * 100}% ${rows.slice(0, index + 1).reduce((sum, item) => sum + item.value, 0) / Math.max(total, 1) * 100}%`).join(", ");
	return (
	<section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
		<div className="mb-3 flex items-center justify-between">
			<h2 className="text-sm font-bold text-[#10254b]">Clearance Overview</h2>
			<button type="button" className="rounded border border-slate-200 px-2 py-1 text-[10px] text-slate-600">This Month⌄</button>
		</div>
		<div className="flex items-center gap-4">
			<div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: total ? `conic-gradient(${chart})` : "#e2e8f0" }}>
				<div className="grid h-20 w-20 place-items-center rounded-full bg-white text-center">
					<strong className="text-lg text-[#10254b]">{total}</strong><span className="text-[9px] text-slate-400">Total</span>
				</div>
			</div>
			<div className="min-w-0 flex-1 space-y-2">
				{rows.map(({ label, value, color, icon: Icon }) => (
					<div key={label} className="flex items-center gap-2 text-[10px]">
						<Icon className={`h-3.5 w-3.5 ${color.replace("bg-", "text-")}`} />
						<span className="flex-1 text-slate-600">{label}</span>
						<span className="font-semibold text-slate-700">{value}</span>
						<span className="text-slate-400">({Math.round((value / Math.max(total, 1)) * 100)}%)</span>
					</div>
				))}
			</div>
		</div>
	</section>
	);
};

export default ClearanceOverview;
