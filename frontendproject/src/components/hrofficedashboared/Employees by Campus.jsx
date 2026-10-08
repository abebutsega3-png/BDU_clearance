import React from "react";
import { Link } from "react-router-dom";
import { useHRLanguage } from "./HRLanguage";

const EmployeesByCampus = ({ campuses = [] }) => {
	const { t } = useHRLanguage();
	return (
		<section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
			<div className="mb-4 flex items-center justify-between">
				<h2 className="text-sm font-bold text-[#10254b]">{t("Employees by Campus")}</h2>
				<Link to="/hr-office/employees" className="text-[10px] font-semibold text-blue-600">{t("All employees")}</Link>
			</div>
			<div className="space-y-3">
				{campuses.length ? campuses.map(([name, count]) => (
					<div key={name} className="flex items-center gap-2 text-[10px]">
						<span className="w-28 shrink-0 truncate text-slate-600" title={name}>{name}</span>
						<div className="h-1.5 flex-1 rounded-full bg-slate-100">
							<div className="h-full rounded-full bg-blue-500" style={{ width: `${(count / Math.max(campuses[0][1], 1)) * 100}%` }} />
						</div>
						<span className="w-7 text-right font-semibold text-slate-600">{count}</span>
					</div>
				)) : <p className="py-5 text-center text-[10px] text-slate-400">{t("No campus data found")}</p>}
			</div>
			<Link to="/hr-office/reports" className="mt-4 inline-block text-[10px] font-semibold text-blue-600">{t("View report")} →</Link>
		</section>
	);
};

export default EmployeesByCampus;
