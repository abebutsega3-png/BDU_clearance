import React from "react";
import { Link } from "react-router-dom";
import { useHRLanguage } from "./HRLanguage";

const Notifications = ({ notifications = [], loading = false }) => {
	const { t } = useHRLanguage();
	return (
		<section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
			<div className="mb-3 flex items-center justify-between">
				<h2 className="text-sm font-bold text-[#10254b]">{t("Notifications")}</h2>
				<Link to="/hr-office/notifications" className="text-[10px] font-semibold text-blue-600">
					{t("View All")}
				</Link>
			</div>

			{loading ? (
				<p className="py-6 text-center text-[10px] text-slate-400">{t("Loading notifications...")}</p>
			) : notifications.length === 0 ? (
				<p className="py-6 text-center text-[10px] text-slate-400">{t("No notifications found")}</p>
			) : (
				<ul className="space-y-3">
					{notifications.map((notification, index) => (
						<li key={notification.id || index} className="flex gap-2">
							<span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
							<div className="min-w-0">
								<p className="text-[10px] leading-4 text-slate-600">{notification.message}</p>
								<span className="text-[9px] text-slate-400">{notification.time || '-'}</span>
							</div>
						</li>
					))}
				</ul>
			)}
		</section>
	);
};

export default Notifications;
