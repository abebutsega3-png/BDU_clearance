import React from 'react';
import {
  FaChevronDown,
  FaDownload,
  FaFilter,
  FaSearch,
} from 'react-icons/fa';

const AuditFilters = ({
  filters,
  onChange,
  onFilter,
  onReset,
  onExport,
  loading,
}) => {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">

      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={onExport}
          className="rounded border border-emerald-600 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
        >
          <FaDownload className="mr-2 inline" />
          Export Logs
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.15fr_1.05fr_1.05fr_1fr_1fr_auto_auto]">

        {/* Search */}
        <label className="text-[10px] font-semibold text-slate-700">
          Search by User

          <span className="relative mt-1 block">
            <input
              type="text"
              value={filters.search}
              onChange={(e) =>
                onChange('search', e.target.value)
              }
              placeholder="Search user..."
              className="h-10 w-full rounded border border-slate-200 px-3 pr-9 text-xs outline-none focus:border-teal-500"
            />

            <FaSearch className="absolute right-3 top-3 text-slate-400" />
          </span>
        </label>

        {/* Module */}
        <label className="text-[10px] font-semibold text-slate-700">
          Module

          <span className="relative mt-1 block">
            <select
              value={filters.module}
              onChange={(e) =>
                onChange('module', e.target.value)
              }
              className="h-10 w-full appearance-none rounded border border-slate-200 bg-white px-3 text-xs outline-none focus:border-teal-500"
            >
              <option>All Modules</option>
              <option>Dashboard</option>
              <option>Users</option>
              <option>Roles</option>
              <option>Employees</option>
              <option>Clearance Request</option>
              <option>Finance Clearance</option>
              <option>Property Clearance</option>
              <option>IT Clearance</option>
              <option>Library Clearance</option>
              <option>Department Clearance</option>
              <option>Reports</option>
              <option>Audit Logs</option>
              <option>System Settings</option>
            </select>

            <FaChevronDown className="pointer-events-none absolute right-3 top-3 text-slate-400" />
          </span>
        </label>

        {/* Action */}
        <label className="text-[10px] font-semibold text-slate-700">
          Action

          <span className="relative mt-1 block">
            <select
              value={filters.action}
              onChange={(e) =>
                onChange('action', e.target.value)
              }
              className="h-10 w-full appearance-none rounded border border-slate-200 bg-white px-3 text-xs outline-none focus:border-teal-500"
            >
              <option>All Actions</option>
              <option>CREATE</option>
              <option>UPDATE</option>
              <option>DELETE</option>
              <option>VIEW</option>
              <option>LOGIN</option>
              <option>LOGOUT</option>
              <option>SUBMIT</option>
              <option>APPROVE</option>
              <option>REJECT</option>
              <option>CANCEL</option>
              <option>EXPORT</option>
            </select>

            <FaChevronDown className="pointer-events-none absolute right-3 top-3 text-slate-400" />
          </span>
        </label>

        {/* Date From */}
        <label className="text-[10px] font-semibold text-slate-700">
          Date From

          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) =>
              onChange('dateFrom', e.target.value)
            }
            className="mt-1 h-10 w-full rounded border border-slate-200 px-3 text-xs outline-none focus:border-teal-500"
          />
        </label>

        {/* Date To */}
        <label className="text-[10px] font-semibold text-slate-700">
          Date To

          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) =>
              onChange('dateTo', e.target.value)
            }
            className="mt-1 h-10 w-full rounded border border-slate-200 px-3 text-xs outline-none focus:border-teal-500"
          />
        </label>

        {/* Filter */}
        <button
          type="button"
          onClick={onFilter}
          disabled={loading}
          className="mt-5 h-10 rounded bg-[#006b54] px-4 text-xs font-semibold text-white hover:bg-[#005540] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FaFilter className="mr-2 inline" />

          {loading ? 'Loading...' : 'Filter'}
        </button>

        {/* Reset */}
        <button
          type="button"
          onClick={onReset}
          className="mt-5 h-10 rounded border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Reset
        </button>

      </div>
    </section>
  );
};

export default AuditFilters;