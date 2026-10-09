import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronDown, Eye, FileText, Filter, History, MoreVertical, Pencil, Plus, Search, WalletCards } from 'lucide-react';

const API_URL = 'http://localhost:3000/api/finance/dashboard/records';

const emptySummary = {
  totalEmployees: 0,
  totalOutstanding: 0,
  totalLoans: 0,
  totalPayments: 0,
};

const money = (value) => `ETB ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getAuthHeaders = (extra = {}) => {
  const token = localStorage.getItem('token');
  return {
    ...extra,
    ...(token ? { Authorization: "Bearer " + token } : {}),
  };
};

export default function FinancialRecords() {
  const navigate = useNavigate();
  const location = useLocation();
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [options, setOptions] = useState({ departments: [], employeeTypes: [] });
  const [filters, setFilters] = useState({
    search: '',
    department: 'All',
    employeeType: 'All',
    status: 'All',
    startDate: '',
    endDate: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openMenu, setOpenMenu] = useState(null);

  const loadRecords = async (nextFilters = filters) => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.get(API_URL, {
        params: nextFilters,
        headers: getAuthHeaders(),
      });

      const data = response.data || {};
      setRecords(Array.isArray(data.records) ? data.records : []);
      setSummary(data.summary || emptySummary);
      setOptions({
        departments: data.departments || [],
        employeeTypes: data.employeeTypes || [],
      });
    } catch (requestError) {
      setRecords([]);
      setSummary(emptySummary);
      setError(requestError.response?.data?.message || 'Unable to load financial records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const updateFilter = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const submitFilters = (event) => {
    event.preventDefault();
    loadRecords(filters);
  };

  const clearFilters = () => {
    const reset = { search: '', department: 'All', employeeType: 'All', status: 'All', startDate: '', endDate: '' };
    setFilters(reset);
    loadRecords(reset);
  };

  const toggleActionMenu = (event, recordId) => {
    if (openMenu?.recordId === recordId) {
      setOpenMenu(null);
      return;
    }

    const buttonRect = event.currentTarget.getBoundingClientRect();
    const menuHeight = 260;
    const opensUpward = window.innerHeight - buttonRect.bottom < menuHeight;

    setOpenMenu({
      recordId,
      left: Math.max(8, Math.min(buttonRect.right - 224, window.innerWidth - 232)),
      ...(opensUpward
        ? { bottom: window.innerHeight - buttonRect.top + 4 }
        : { top: buttonRect.bottom + 4 }),
    });
  };

  const activeMenuRecord = openMenu
    ? records.find((record) => record._id === openMenu.recordId)
    : null;

  const cards = [
    {
      label: 'Total Employees',
      value: summary.totalEmployees.toLocaleString(),
      detail: 'Employees with records',
      icon: WalletCards,
      tone: 'bg-sky-50 text-sky-600',
    },
    {
      label: 'Total Outstanding',
      value: money(summary.totalOutstanding),
      detail: 'Current balance due',
      icon: FileText,
      tone: 'bg-orange-50 text-orange-500',
    },
    {
      label: 'Loans / Advances',
      value: money(summary.totalLoans),
      detail: 'Total issued amount',
      icon: WalletCards,
      tone: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Payments This Month',
      value: money(summary.totalPayments),
      detail: 'Paid or cleared records',
      icon: WalletCards,
      tone: 'bg-violet-50 text-violet-600',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Finance Office</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Financial Records</h1>
            <p className="text-sm text-slate-500">Manage employee financial records and obligations</p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/finance-office/records/add')}
            className="inline-flex items-center gap-2 self-start rounded-lg bg-blue-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={14} />
            Add Financial Record
          </button>
        </header>

        {location.state?.successMessage && (
          <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700">
            {location.state.successMessage}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, detail, icon: Icon, tone }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500">{label}</p>
                  <p className="mt-2 text-lg font-bold text-slate-900">{value}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{detail}</p>
                </div>
                <span className={`rounded-xl p-3 ${tone}`}>
                  <Icon size={18} />
                </span>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={submitFilters} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <label className="relative text-[11px] font-semibold text-slate-500 md:col-span-2 xl:col-span-2">
              <span>Search by name or employee ID</span>
              <Search size={15} className="absolute left-3 top-8 text-slate-400" />
              <input
                name="search"
                value={filters.search}
                onChange={updateFilter}
                placeholder="Search records"
                className="mt-1 w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none transition focus:border-blue-500"
              />
            </label>

            <Select
              label="All Departments"
              name="department"
              value={filters.department}
              onChange={updateFilter}
              options={options.departments}
            />
            <Select
              label="All Employee Types"
              name="employeeType"
              value={filters.employeeType}
              onChange={updateFilter}
              options={options.employeeTypes}
            />
            <Select
              label="All Statuses"
              name="status"
              value={filters.status}
              onChange={updateFilter}
              options={['Outstanding', 'Partially Paid', 'Paid', 'Cleared']}
            />

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <Filter size={14} /> Filter
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="mt-3 grid max-w-xl gap-3 sm:grid-cols-2">
            <DateField label="From Date" name="startDate" value={filters.startDate} onChange={updateFilter} />
            <DateField label="To Date" name="endDate" value={filters.endDate} onChange={updateFilter} />
          </div>
        </form>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Financial Records</h2>
              <p className="text-xs text-slate-500">Live records from the finance database</p>
            </div>
            <span className="text-xs text-slate-400">{records.length} record{records.length === 1 ? '' : 's'}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  {[
                    '#',
                    'Employee',
                    'Employee ID',
                    'Department',
                    'Type',
                    'Total Due (ETB)',
                    'Paid (ETB)',
                    'Outstanding (ETB)',
                    'Loans / Advances (ETB)',
                    'Status',
                    'Action',
                  ].map((heading) => (
                    <th key={heading} className="px-3 py-3 font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="11" className="p-10 text-center text-slate-400">
                      Loading financial records...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="11" className="p-10 text-center text-rose-600">
                      {error}
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="p-10 text-center text-slate-400">
                      No financial records found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  records.map((record, index) => {
                    const statusLabel = record.status === 'Partially Paid' ? 'Partial Paid' : record.status || 'Outstanding';

                    const statusClass =
                      statusLabel === 'Outstanding'
                        ? 'bg-amber-50 text-amber-700'
                        : statusLabel === 'Partial Paid' || statusLabel === 'Partially Paid'
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-emerald-50 text-emerald-700';

                    return (
                      <tr key={record._id || `${record.employeeId}-${index}`} className="hover:bg-slate-50">
                        <td className="px-3 py-3 text-slate-400">{index + 1}</td>
                        <td className="px-3 py-3 font-semibold text-slate-800">{record.employeeName}</td>
                        <td className="px-3 py-3 text-slate-600">{record.employeeId}</td>
                        <td className="px-3 py-3 text-slate-600">{record.department}</td>
                        <td className="px-3 py-3 text-slate-600">{record.type || 'Loan'}</td>
                        <td className="px-3 py-3 font-semibold">{money(record.totalDue || 0)}</td>
                        <td className="px-3 py-3 font-semibold text-emerald-600">{money(record.paidAmount ?? record.paymentAmount ?? 0)}</td>
                        <td className={`px-3 py-3 font-semibold ${Number(record.outstandingBalance || 0) ? 'text-red-500' : 'text-emerald-600'}`}>
                          {money(record.outstandingBalance || 0)}
                        </td>
                        <td className="px-3 py-3">{money(record.loanAmount || 0)}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="relative inline-flex">
                            <button
                              type="button"
                              onClick={(event) => toggleActionMenu(event, record._id)}
                              aria-label={`Actions for ${record.employeeName} ${record.type || 'financial record'}`}
                              aria-expanded={openMenu?.recordId === record._id}
                              className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                            >
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {activeMenuRecord && createPortal(
        <>
          <button
            type="button"
            aria-label="Close actions menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpenMenu(null)}
          />
          <div
            role="menu"
            aria-label={`Actions for ${activeMenuRecord.employeeName}`}
            className="fixed z-50 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl"
            style={{
              left: openMenu.left,
              ...(openMenu.top !== undefined
                ? { top: openMenu.top }
                : { bottom: openMenu.bottom }),
            }}
          >
            <ActionMenuItem icon={Eye} label="View Record" onClick={() => {
              setOpenMenu(null);
              navigate(`/finance-office/records/employee/${encodeURIComponent(activeMenuRecord.employeeId)}?action=view&recordId=${encodeURIComponent(activeMenuRecord._id)}`);
            }} />
            {isFinancialObligation(activeMenuRecord) && Number(activeMenuRecord.outstandingBalance) > 0 && (
              <ActionMenuItem icon={WalletCards} label="Record Payment" onClick={() => {
                setOpenMenu(null);
                navigate(`/finance-office/records/employee/${encodeURIComponent(activeMenuRecord.employeeId)}?action=payment&recordId=${encodeURIComponent(activeMenuRecord._id)}`);
              }} />
            )}
            {isFinancialObligation(activeMenuRecord) && (
              <ActionMenuItem icon={Pencil} label="Edit Record" onClick={() => {
                setOpenMenu(null);
                navigate(`/finance-office/records/employee/${encodeURIComponent(activeMenuRecord.employeeId)}?action=edit&recordId=${encodeURIComponent(activeMenuRecord._id)}`);
              }} />
            )}
            {isFinancialObligation(activeMenuRecord) && <ActionMenuItem icon={History} label="Payment History" onClick={() => {
              setOpenMenu(null);
              navigate(`/finance-office/records/employee/${encodeURIComponent(activeMenuRecord.employeeId)}?action=history&recordId=${encodeURIComponent(activeMenuRecord._id)}#payment-history`);
            }} />}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

function Select({ label, name, value, onChange, options }) {
  return (
    <label className="text-[11px] font-semibold text-slate-500">
      {label}
      <span className="relative mt-1 block">
        <select
          name={name}
          value={value}
          onChange={onChange}
          className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-8 text-xs outline-none focus:border-blue-500"
        >
          <option>All</option>
          {options.filter((option) => option && option !== 'All').map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-2.5 text-slate-400" />
      </span>
    </label>
  );
}

function DateField({ label, name, value, onChange }) {
  return (
    <label className="text-[11px] font-semibold text-slate-500">
      {label}
      <span className="relative mt-1 block">
        <CalendarDays size={14} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
        <input
          type="date"
          name={name}
          value={value}
          onChange={onChange}
          className="w-full rounded-lg border border-slate-200 px-9 py-2.5 text-xs outline-none focus:border-blue-500"
        />
      </span>
    </label>
  );
}

function ActionMenuItem({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition ${
        danger ? 'text-rose-700 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function isFinancialObligation(record) {
  return !['Payment / Repayment', 'Payment', 'Repayment', 'Payment Reversal'].includes(record.type)
    && !record.reversalOf
    && !(record.type === 'Adjustment' && record.adjustmentDirection === 'Reduce');
}
