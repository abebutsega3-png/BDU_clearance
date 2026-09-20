import React from 'react';
import { Bell, FileBarChart2, Printer } from 'lucide-react';

export function LibraryReports() {
	return (
		<main className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-6">
			<div className="flex items-center justify-between gap-4">
				<div><h1 className="text-2xl font-bold text-slate-900">Library Clearance Report</h1><p className="mt-1 text-sm text-slate-500">Summary of employee library clearance workload.</p></div>
				<button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-xs font-semibold text-white"><Printer size={15} /> Print Report</button>
			</div>
			<section className="mt-6 rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm"><FileBarChart2 className="mx-auto text-teal-600" size={32} /><p className="mt-3 text-sm font-semibold text-slate-700">Open Clearance Requests to review and process current employee requests.</p></section>
		</main>
	);
}

export function LibraryNotifications() {
	return (
		<main className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-6">
			<h1 className="text-2xl font-bold text-slate-900">Library Notifications</h1><p className="mt-1 text-sm text-slate-500">Notifications related to employee library clearance.</p>
			<section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><Bell className="mt-0.5 text-amber-500" size={18} /><div><h2 className="text-sm font-bold text-slate-800">Review new clearance requests</h2><p className="mt-1 text-xs text-slate-500">New employee requests appear in Clearance Requests for verification and approval.</p></div></div></section>
		</main>
	);
}
