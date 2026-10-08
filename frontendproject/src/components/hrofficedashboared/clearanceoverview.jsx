import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock3, RotateCcw, ShieldCheck } from "lucide-react";
import { useHRLanguage } from "./HRLanguage";

const statusRows = [
	{ label: "Awaiting review", key: "pending", color: "bg-amber-400", hex: "#f59e0b", icon: Clock3, to: "/hr-office/clearance-requests" },
	{ label: "Under review", key: "inProgress", color: "bg-blue-500", hex: "#3b82f6", icon: ShieldCheck, to: "/hr-office/clearance-requests" },
	{ label: "Returned", key: "returned", color: "bg-orange-500", hex: "#f97316", icon: RotateCcw, to: "/hr-office/clearance-requests" },
	{ label: "Ready for final HR", key: "readyForFinalHR", color: "bg-indigo-500", hex: "#6366f1", icon: ShieldCheck, to: "/hr-office/final-hr-clearance" },
	{ label: "Finalized", key: "completed", color: "bg-emerald-500", hex: "#10b981", icon: CheckCircle2, to: "/hr-office/certificates" },
];

const ClearanceOverview = ({ values = {} }) => {
	const { t } = useHRLanguage();
	const rows = statusRows.map((row) => ({ ...row, value: values[row.key] ?? 0 }));
	const total = rows.reduce((sum, row) => sum + row.value, 0);
	const chart = rows.map((row, index) => `${row.hex} ${rows.slice(0, index).reduce((sum, item) => sum + item.value, 0) / Math.max(total, 1) * 100}% ${rows.slice(0, index + 1).reduce((sum, item) => sum + item.value, 0) / Math.max(total, 1) * 100}%`).join(", ");
	return (
	<section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
		<div className="mb-3 flex items-center justify-between">
			<h2 className="text-sm font-bold text-[#10254b]">{t('Clearance Overview')}</h2>
			<Link to="/hr-office/clearance-requests" className="text-[10px] font-semibold text-blue-600">{t('Review requests')}</Link>
		</div>
		<div className="flex items-center gap-4">
			<div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: total ? `conic-gradient(${chart})` : "#e2e8f0" }}>
				<div className="grid h-20 w-20 place-items-center rounded-full bg-white text-center">
					<strong className="text-lg text-[#10254b]">{total}</strong><span className="text-[9px] text-slate-400">{t('Total')}</span>
				</div>
			</div>
			<div className="min-w-0 flex-1 space-y-2">
				{rows.map(({ label, value, color, icon: Icon, to }) => (
					<div key={label} className="flex items-center gap-2 text-[10px]">
						<Icon className={`h-3.5 w-3.5 ${color.replace("bg-", "text-")}`} />
						<Link to={to} className="flex-1 text-slate-600 hover:text-blue-700">{t(label)}</Link>
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
