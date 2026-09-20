import React from "react";

const EmployeesByCampus = ({ campuses = [] }) => (
	<section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold text-[#10254b]">Employees by Campus</h2><button type="button" className="rounded border border-slate-200 px-2 py-1 text-[10px] text-slate-600">This Month⌄</button></div><div className="space-y-3">{campuses.length ? campuses.map(([name, count]) => <div key={name} className="flex items-center gap-2 text-[10px]"><span className="w-28 shrink-0 text-slate-600">{name}</span><div className="h-1.5 flex-1 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${(count / Math.max(campuses[0][1], 1)) * 100}%` }} /></div><span className="w-7 text-right font-semibold text-slate-600">{count}</span></div>) : <p className="py-5 text-center text-[10px] text-slate-400">No campus data found</p>}</div><button type="button" className="mt-4 text-[10px] font-semibold text-blue-600">View report →</button></section>
);

export default EmployeesByCampus;
