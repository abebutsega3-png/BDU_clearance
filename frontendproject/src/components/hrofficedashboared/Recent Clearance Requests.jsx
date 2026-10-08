import React from "react";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import { useHRLanguage } from "./HRLanguage";

const statusClass = {
	Pending: "bg-amber-50 text-amber-600",
	"Under Review": "bg-blue-50 text-blue-600",
	Approved: "bg-emerald-50 text-emerald-600",
	Completed: "bg-emerald-50 text-emerald-600",
	Returned: "bg-orange-50 text-orange-600",
	Rejected: "bg-red-50 text-red-600",
};

const formatDate = (date) => {
	if (!date) return "-";
	const parsed = new Date(date);
	return Number.isNaN(parsed.getTime()) ? String(date) : parsed.toLocaleDateString();
};

const getEmployeeName = (request) => (
	request.employee?.fullName
	|| request.employee?.name
	|| request.employeeName
	|| (typeof request.employee === "string" ? request.employee : "")
	|| "Unknown employee"
);

const getDepartment = (request) => (
	request.department?.name
	|| request.department?.departmentName
	|| request.department
	|| "-"
);

const RecentClearanceRequests = ({ requests = [] }) => {
	const { t } = useHRLanguage();
	return (
	<section className="min-w-0 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
		<div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-[#10254b]">{t('Recent Clearance Requests')}</h2><Link to="/hr-office/clearance-requests" className="text-[10px] font-semibold text-blue-600">{t('View All')}</Link></div>
		<div className="overflow-x-auto"><table className="w-full min-w-[470px] text-left text-[10px]"><thead className="border-y border-slate-100 text-slate-400"><tr><th className="py-2">#</th><th>{t('Employee')}</th><th>{t('Department')}</th><th>{t('Request Date')}</th><th>{t('HR Status')}</th><th>{t('Action')}</th></tr></thead><tbody>{requests.length ? requests.map((request, index) => {
			const employee = getEmployeeName(request);
			const status = request.initialHRStatus || request.status || "Pending";
			const requestId = request.requestId || request._id;
			return <tr key={requestId || `${employee}-${index}`} className="border-b border-slate-50 text-slate-600"><td className="py-2">{index + 1}</td><td className="font-medium text-slate-700">{employee}</td><td>{getDepartment(request)}</td><td>{formatDate(request.requestDate || request.createdAt || request.date)}</td><td><span className={`rounded px-1.5 py-1 text-[9px] ${statusClass[status] || "bg-slate-50 text-slate-500"}`}>{t(status)}</span></td><td><Link to={`/hr-office/clearance-requests?requestId=${encodeURIComponent(requestId)}`} aria-label={`${t('View')} ${employee}`} className="inline-flex items-center gap-1 rounded border border-blue-100 px-2 py-1 text-blue-600"><Eye className="h-3 w-3" />{t('View')}</Link></td></tr>;
		}) : <tr><td colSpan="6" className="py-8 text-center text-slate-400">{t('No clearance requests found.')}</td></tr>}</tbody></table></div>
		<p className="mt-2 text-right text-[9px] text-slate-400">{t('Showing')} {requests.length} {t('entries')}</p>
	</section>
	);
};

export default RecentClearanceRequests;
