import React from "react";

import {
  FaCheckCircle,
  FaClock,
  FaHourglassHalf,
  FaTimesCircle,
  FaUserCheck,
  FaUsers,
} from "react-icons/fa";

import SummaryCard from "./summarycared";

const HrSummary = ({ metrics = {} }) => {

  // =====================================================
  // HR SUMMARY DATA
  // =====================================================

  const summaryCards = [
    {
      title: "Total Employees",
      value: metrics.totalEmployees ?? 0,
      note: "All registered employees",
      icon: FaUsers,
      iconClass: "bg-blue-50 text-blue-600",
      linkText: "View all employees",
      onClick: () => {
        window.location.href = "/hr/employees";
      },
    },

    {
      title: "Active Employees",
      value: metrics.activeEmployees ?? 0,
      note: "Currently active employees",
      icon: FaUserCheck,
      iconClass: "bg-emerald-50 text-emerald-600",
      linkText: "View active",
      onClick: () => {
        window.location.href = "/hr/employees?status=active";
      },
    },

    {
      title: "Pending Clearance",
      value: metrics.pending ?? 0,
      note: "Awaiting HR review",
      icon: FaClock,
      iconClass: "bg-amber-50 text-amber-500",
      linkText: "View pending",
      onClick: () => {
        window.location.href = "/hr/clearance/pending";
      },
    },

    {
      title: "In Progress",
      value: metrics.inProgress ?? 0,
      note: "Clearance currently active",
      icon: FaHourglassHalf,
      iconClass: "bg-indigo-50 text-indigo-500",
      linkText: "View in progress",
      onClick: () => {
        window.location.href = "/hr/clearance/in-progress";
      },
    },

    {
      title: "Completed Clearance",
      value: metrics.completed ?? 0,
      note: "Successfully completed",
      icon: FaCheckCircle,
      iconClass: "bg-teal-50 text-teal-600",
      linkText: "View completed",
      onClick: () => {
        window.location.href = "/hr/clearance/completed";
      },
    },

    {
      title: "Rejected Clearance",
      value: metrics.rejected ?? 0,
      note: "Requires attention",
      icon: FaTimesCircle,
      iconClass: "bg-red-50 text-red-500",
      linkText: "View rejected",
      onClick: () => {
        window.location.href = "/hr/clearance/rejected";
      },
    },
  ];

  return (
    <section
      className="
        w-full
      "
    >

      {/* =====================================================
          DASHBOARD HEADER
      ===================================================== */}

      <div
        className="
          mb-4
          flex
          items-center
          justify-between
          gap-4
        "
      >

        {/* LEFT */}
        <div>
          <h1
            className="
              text-xl
              font-bold
              tracking-tight
              text-[#10254b]
              sm:text-2xl
            "
          >
            Dashboard
          </h1>

          <p
            className="
              mt-1
              text-xs
              text-slate-500
            "
          >
            Welcome back, HR Officer!
          </p>
        </div>

        {/* RIGHT DATE */}
        <button
          type="button"
          className="
            rounded-md
            border
            border-slate-200
            bg-white
            px-3
            py-2
            text-xs
            font-medium
            text-slate-600
            shadow-sm
          "
        >
          25 August 2026
        </button>

      </div>


      {/* =====================================================
          SUMMARY CARDS
      ===================================================== */}

      <div
        className="
          grid
          grid-cols-2
          gap-3
          md:grid-cols-3
          2xl:grid-cols-6
        "
      >

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