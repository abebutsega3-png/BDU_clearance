import React from "react";
import { FaCheckCircle, FaClock, FaUserCheck, FaUsers, FaUndo } from "react-icons/fa";
import { ClipboardCheck } from "lucide-react";
import SummaryCard from "./summarycared";
import { useHRLanguage } from "./HRLanguage";

const HrSummary = ({ metrics = {}, name }) => {
  const { language, t } = useHRLanguage();
  const summaryCards = [
    {
      title: "Total Employees",
      value: metrics.totalEmployees ?? 0,
      note: "All registered employees",
      icon: FaUsers,
      iconClass: "bg-blue-50 text-blue-600",
      linkText: "View all employees",
      to: "/hr-office/employees",
    },
    {
      title: "Active Employees",
      value: metrics.activeEmployees ?? 0,
      note: "Currently active employees",
      icon: FaUserCheck,
      iconClass: "bg-emerald-50 text-emerald-600",
      linkText: "View employees",
      to: "/hr-office/employees",
    },
    {
      title: "Awaiting HR Review",
      value: metrics.pending ?? 0,
      note: "Requests waiting for initial review",
      icon: FaClock,
      iconClass: "bg-amber-50 text-amber-500",
      linkText: "Review requests",
      to: "/hr-office/clearance-requests",
    },
    {
      title: "Returned Requests",
      value: metrics.returned ?? 0,
      note: "Requests returned for correction",
      icon: FaUndo,
      iconClass: "bg-orange-50 text-orange-600",
      linkText: "View requests",
      to: "/hr-office/clearance-requests",
    },
    {
      title: "Ready for Final HR",
      value: metrics.readyForFinalHR ?? 0,
      note: "Completed office clearances",
      icon: ClipboardCheck,
      iconClass: "bg-indigo-50 text-indigo-600",
      linkText: "Open final review",
      to: "/hr-office/final-hr-clearance",
    },
    {
      title: "Finalized Clearances",
      value: metrics.completed ?? 0,
      note: "HR approved and completed",
      icon: FaCheckCircle,
      iconClass: "bg-teal-50 text-teal-600",
      linkText: "View certificates",
      to: "/hr-office/certificates",
    },
  ];

  return (
    <section className="w-full">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#10254b] sm:text-2xl">Dashboard</h1>
          <p className="mt-1 text-xs text-slate-500">{t('Welcome back')}{name ? `, ${name}` : `, ${t('HR Officer')}`}.</p>
        </div>
        <time dateTime={new Date().toISOString()} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm">
          {new Date().toLocaleDateString(language === 'am' ? 'am-ET' : undefined, { year: "numeric", month: "long", day: "numeric" })}
        </time>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        {summaryCards.map((card) => (
          <SummaryCard
            key={card.title}
            {...card}
          />
        ))}
      </div>
    </section>
  );
};

export default HrSummary;