import React, { useEffect, useState } from 'react';
import { FaCalendarAlt, FaDownload, FaFilter, FaSearch, FaUserFriends, FaWaveSquare } from 'react-icons/fa';
import { exportAuditLogs, fetchAuditLogs } from '../../until/auditLogHelper';

const actionStyles = {
  UPDATE: 'bg-amber-50 text-amber-700',
  CREATE: 'bg-emerald-50 text-emerald-700',
  DELETE: 'bg-red-50 text-red-700',
  LOGIN: 'bg-sky-50 text-sky-700',
  LOGOUT: 'bg-slate-100 text-slate-700',
  APPROVE: 'bg-green-50 text-green-700',
  REJECT: 'bg-red-50 text-red-700',
  SUBMIT: 'bg-blue-50 text-blue-700',
  CANCEL: 'bg-orange-50 text-orange-700',
  EXPORT: 'bg-purple-50 text-purple-700',
  VIEW: 'bg-cyan-50 text-cyan-700',
  PASSWORD_CHANGE: 'bg-violet-50 text-violet-700',
  FAILED_LOGIN: 'bg-red-50 text-red-700',
  ACTIVATE: 'bg-emerald-50 text-emerald-700',
  DEACTIVATE: 'bg-slate-100 text-slate-700',
  PERMISSION_CHANGE: 'bg-indigo-50 text-indigo-700',
  ASSIGN: 'bg-teal-50 text-teal-700',
  COMPLETE: 'bg-green-50 text-green-700',
  DOWNLOAD: 'bg-blue-50 text-blue-700',
  SEND: 'bg-cyan-50 text-cyan-700',
};

const moduleOptions = [
  'Authentication', 'Users', 'Roles & Permissions', 'Employees', 'Organization', 'Clearance Request',
  'HR Clearance', 'Finance Clearance', 'Property Clearance', 'IT Clearance', 'Department Clearance',
  'Reports', 'Notifications', 'System Settings', 'Audit Logs'
];

const actionsByModule = {
  Authentication: ['LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'FAILED_LOGIN'],
  Users: ['CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE'],
  'Roles & Permissions': ['CREATE', 'UPDATE', 'DELETE', 'PERMISSION_CHANGE'],
  Employees: ['CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE'],
  Organization: ['CREATE', 'UPDATE', 'DELETE'],
  'Clearance Request': ['CREATE', 'UPDATE', 'SUBMIT', 'ASSIGN', 'CANCEL'],
  'HR Clearance': ['VIEW', 'UPDATE', 'APPROVE', 'REJECT', 'COMPLETE'],
  'Finance Clearance': ['VIEW', 'UPDATE', 'APPROVE', 'REJECT', 'COMPLETE'],
  'Property Clearance': ['VIEW', 'UPDATE', 'APPROVE', 'REJECT', 'COMPLETE'],
  'IT Clearance': ['VIEW', 'UPDATE', 'APPROVE', 'REJECT', 'COMPLETE'],
  'Department Clearance': ['VIEW', 'UPDATE', 'APPROVE', 'REJECT', 'COMPLETE'],
  Reports: ['VIEW', 'CREATE', 'EXPORT', 'DOWNLOAD'],
  Notifications: ['CREATE', 'SEND', 'VIEW'],
  'System Settings': ['VIEW', 'UPDATE'],
  'Audit Logs': ['VIEW', 'EXPORT'],
};

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '-');

const AuditLog = () => {
  const [filters, setFilters] = useState({ user: '', module: '', action: '', dateFrom: '', dateTo: '' });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = async (query = filters) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetchAuditLogs(Object.fromEntries(Object.entries(query).filter(([, value]) => value !== '')));
      setLogs(response.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const handleModuleChange = (event) => {
    setFilters((current) => ({ ...current, module: event.target.value, action: '' }));
  };

  const handleExport = async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
    const rows = await exportAuditLogs(params);
    const csv = [
      ['Date', 'User', 'Role', 'Action', 'Module', 'Description', 'IP Address'].join(','),
      ...rows.map((row) => [row.date, row.user, row.role, row.action, row.module, row.description, row.ip]
        .map((value) => `"${String(value || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'audit-logs.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-4 text-[#1e2a3a] sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="mt-1 text-xs text-slate-500">Track and monitor all system activities and changes made by users.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <FaWaveSquare />
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-800">System Admin</p>
            <p className="text-[10px] text-slate-500">Super Administrator</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
            SA
          </div>
        </div>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>System activities and audit trails</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded border border-emerald-600 bg-white px-3 py-2 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              <FaDownload />
              Export Excel
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded border border-blue-600 bg-white px-3 py-2 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
            >
              <FaDownload />
              Export PDF
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="text-[10px] font-semibold text-slate-700 xl:col-span-1">
            Search by User
            <div className="relative mt-1">
              <input
                type="text"
                value={filters.user}
                onChange={(event) => updateFilter('user', event.target.value)}
                placeholder="Search by user or action..."
                className="h-10 w-full rounded border border-slate-200 bg-white px-3 pr-8 text-xs outline-none focus:border-teal-500"
              />
              <FaSearch className="absolute right-3 top-3 text-slate-400" />
            </div>
          </label>

          <label className="text-[10px] font-semibold text-slate-700">
            Role
            <select className="mt-1 h-10 w-full rounded border border-slate-200 bg-white px-3 text-xs text-slate-700">
              <option>All Roles</option>
              <option>System Admin</option>
              <option>HR Officer</option>
              <option>Department Officer</option>
              <option>Employee</option>
            </select>
          </label>

          <label className="text-[10px] font-semibold text-slate-700">
            Module
            <select
              value={filters.module}
              onChange={handleModuleChange}
              className="mt-1 h-10 w-full rounded border border-slate-200 bg-white px-3 text-xs text-slate-700"
            >
              <option value="">All Modules</option>
              {moduleOptions.map((moduleOption) => (
                <option key={moduleOption} value={moduleOption}>{moduleOption}</option>
              ))}
            </select>
          </label>

          <label className="text-[10px] font-semibold text-slate-700">
            Action
            <select
              value={filters.action}
              onChange={(event) => updateFilter('action', event.target.value)}
              disabled={!filters.module}
              className="mt-1 h-10 w-full rounded border border-slate-200 bg-white px-3 text-xs text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              <option value="">All Actions</option>
              {(actionsByModule[filters.module] || []).map((actionOption) => (
                <option key={actionOption} value={actionOption}>{actionOption}</option>
              ))}
            </select>
          </label>

          <label className="text-[10px] font-semibold text-slate-700">
            From Date
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => updateFilter('dateFrom', event.target.value)}
              className="mt-1 h-10 w-full rounded border border-slate-200 bg-white px-3 text-xs text-slate-700"
            />
          </label>

          <label className="text-[10px] font-semibold text-slate-700">
            To Date
            <div className="mt-1 flex gap-2">
              <input
                type="date"
                value={filters.dateTo}
                onChange={(event) => updateFilter('dateTo', event.target.value)}
                className="h-10 w-full rounded border border-slate-200 bg-white px-3 text-xs text-slate-700"
              />
              <button
                type="button"
                onClick={() => {
                  const empty = { user: '', module: '', action: '', dateFrom: '', dateTo: '' };
                  setFilters(empty);
                  loadLogs(empty);
                }}
                className="inline-flex h-10 items-center justify-center rounded border border-slate-200 bg-slate-50 px-3 text-slate-600 hover:bg-slate-100"
                title="Apply Filter"
              >
                <FaFilter />
              </button>
            </div>
          </label>
        </div>
      </section>

      <div className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-3">ID</th>
                <th className="px-3 py-3">User</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Action</th>
                <th className="px-3 py-3">Description</th>
                <th className="px-3 py-3">IP Address</th>
                <th className="px-3 py-3">Date &amp; Time</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-3 py-10 text-center text-xs text-slate-500">
                    Loading audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-3 py-10 text-center text-xs text-slate-500">
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((entry) => (
                  <tr key={entry.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-3 text-slate-600">{entry.id}</td>
                    <td className="px-3 py-3 font-semibold text-slate-700">{entry.user}</td>
                    <td className="px-3 py-3 text-slate-600">{entry.role}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded px-2 py-1 text-[9px] font-bold ${actionStyles[entry.action] || 'bg-slate-100 text-slate-700'}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{entry.description}</td>
                    <td className="px-3 py-3 text-slate-600">{entry.ip || '-'}</td>
                    <td className="px-3 py-3 text-slate-600">{formatDate(entry.date)}</td>
                    <td className="px-3 py-3">
                      <span className="rounded bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">
                        Success
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}
    </main>
  );
};

export default AuditLog;
