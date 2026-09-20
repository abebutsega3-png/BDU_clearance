import React from "react";

const Notifications = ({ notifications = [], loading = false }) => {
	return (
		<section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
			<div className="mb-3 flex items-center justify-between">
				<h2 className="text-sm font-bold text-[#10254b]">Notifications</h2>
				<button type="button" className="text-[10px] font-semibold text-blue-600">
					View All
				</button>
			</div>

			{loading ? (
				<p className="py-6 text-center text-[10px] text-slate-400">Loading notifications...</p>
			) : notifications.length === 0 ? (
				<p className="py-6 text-center text-[10px] text-slate-400">No notifications found</p>
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
