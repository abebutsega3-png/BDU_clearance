import React from "react";
import { Eye } from "lucide-react";

const statusClass = { Pending: "bg-amber-50 text-amber-600", "In Progress": "bg-blue-50 text-blue-600", Completed: "bg-emerald-50 text-emerald-600", Rejected: "bg-red-50 text-red-600" };

const RecentClearanceRequests = ({ requests = [] }) => (
	<section className="min-w-0 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
		<div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-[#10254b]">Recent Clearance Requests</h2><button type="button" className="text-[10px] font-semibold text-blue-600">View All</button></div>
		<div className="overflow-x-auto"><table className="w-full min-w-[470px] text-left text-[10px]"><thead className="border-y border-slate-100 text-slate-400"><tr><th className="py-2">#</th><th>Employee</th><th>Department</th><th>Request Date</th><th>Status</th><th>Action</th></tr></thead><tbody>{requests.length ? requests.map(([employee, department, date, status], index) => <tr key={`${employee}-${index}`} className="border-b border-slate-50 text-slate-600"><td className="py-2">{index + 1}</td><td className="font-medium text-slate-700">{employee}</td><td>{department}</td><td>{date}</td><td><span className={`rounded px-1.5 py-1 text-[9px] ${statusClass[status] || "bg-slate-50 text-slate-500"}`}>{status}</span></td><td><button type="button" aria-label={`View ${employee}`} className="inline-flex items-center gap-1 rounded border border-blue-100 px-2 py-1 text-blue-600"><Eye className="h-3 w-3" />View</button></td></tr>) : <tr><td colSpan="6" className="py-8 text-center text-slate-400">No clearance requests found</td></tr>}</tbody></table></div>
		<p className="mt-2 text-right text-[9px] text-slate-400">Showing {requests.length} entries</p>
	</section>
);

export default RecentClearanceRequests;
