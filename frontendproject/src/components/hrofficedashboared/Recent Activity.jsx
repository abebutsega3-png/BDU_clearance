import React from "react";
import { Link } from "react-router-dom";
import { useHRLanguage } from "./HRLanguage";

const RecentActivity = ({ activities = [] }) => {
	const { t } = useHRLanguage();
	return (
		<section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
			<div className="mb-3 flex items-center justify-between">
				<h2 className="text-sm font-bold text-[#10254b]">{t("Recent Activity")}</h2>
				<Link to="/hr-office/reports" className="text-[10px] font-semibold text-blue-600">{t("View Reports")}</Link>
			</div>
			<div className="grid gap-2 sm:grid-cols-2">
				{activities.length ? activities.map((item, index) => (
					<div key={`${item.description}-${index}`} className="flex min-w-0 items-center gap-2 text-[10px] text-slate-600">
						<span className="shrink-0 text-slate-400">{item.time}</span>
						<span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
						<span className="truncate">{item.description}</span>
					</div>
				)) : <p className="py-5 text-center text-[10px] text-slate-400 sm:col-span-2">{t("No recent activity found")}</p>}
			</div>
		</section>
	);
};

export default RecentActivity;
