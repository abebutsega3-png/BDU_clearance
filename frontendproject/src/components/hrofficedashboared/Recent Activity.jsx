import React from "react";

const RecentActivity = ({ activities = [] }) => <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-[#10254b]">Recent Activity</h2><button type="button" className="text-[10px] font-semibold text-blue-600">View All</button></div><div className="grid gap-2 sm:grid-cols-2">{activities.length ? activities.map(([activity, time], index) => <div key={`${activity}-${index}`} className="flex items-center gap-2 text-[10px] text-slate-600"><span className="text-slate-400">{time}</span><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{activity}</div>) : <p className="py-5 text-center text-[10px] text-slate-400 sm:col-span-2">No recent activity found</p>}</div></section>;

export default RecentActivity;
