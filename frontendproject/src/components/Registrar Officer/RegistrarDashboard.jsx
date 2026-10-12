import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  GraduationCap,
  FileCheck,
  BadgeCheck,
  Clock3,
  BarChart3,
} from 'lucide-react';

const defaultStats = {
  totalRequests: 0,
  pendingVerification: 0,
  inProgress: 0,
  approvedClearances: 0,
  returnedRequests: 0,
};

const statusToneMap = {
  Pending: 'bg-amber-100 text-amber-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Returned: 'bg-rose-100 text-rose-700',
  Rejected: 'bg-rose-100 text-rose-700',
};

const RegistrarDashboard = () => {
  const [stats, setStats] = useState(defaultStats);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get('/api/registrar/dashboard', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const dashboardStats = data?.stats || defaultStats;
        setStats(dashboardStats);
        const requests = Array.isArray(data?.requests) ? data.requests : [];
        setRows(requests.slice(0, 8).map((row, index) => ({
          id: row.requestId || row._id || `REQ-${index + 1}`,
          employeeId: row.employeeId || 'N/A',
          name: row.fullName || 'N/A',
          department: row.department || 'N/A',
          type: row.clearanceType || 'N/A',
          date: row.submissionDate || row.createdAt || new Date().toISOString(),
          status: row.registrarStatus || row.status || 'Pending',
          action: row.registrarStatus && /approved|verified|completed/i.test(row.registrarStatus) ? 'View' : 'Review',
          statusTone: statusToneMap[row.registrarStatus || row.status || 'Pending'] || statusToneMap.Pending,
        })));
      } catch (error) {
        console.error('Failed loading registrar dashboard', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const statCards = useMemo(() => [
    { label: 'Total Clearance Requests', value: stats.totalRequests, tone: 'bg-white text-slate-800' },
    { label: 'Pending Verification', value: stats.pendingVerification, tone: 'bg-amber-50 text-amber-700' },
    { label: 'In Progress', value: stats.inProgress, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Approved Clearances', value: stats.approvedClearances, tone: 'bg-white text-slate-800' },
    { label: 'Returned / Rejected', value: stats.returnedRequests, tone: 'bg-rose-50 text-rose-700' },
  ], [stats]);

  return (
    <div className="min-h-full space-y-5 text-slate-800">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h2 className="text-[28px] font-bold text-slate-800">Welcome, Registrar Officer</h2>
            <p className="text-sm font-medium text-blue-700">Registrar Officer Dashboard</p>
            <p className="mt-1 text-sm text-slate-500">Manage and verify academic records, documents and clearance requests assigned to the Registrar Office.</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">◔</span>
            {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {statCards.map((item) => (
          <div key={item.label} className={`rounded-xl border border-slate-200 p-4 shadow-sm ${item.tone}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-600">{item.label}</span>
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700">{item.value}</span>
            </div>
            <div className="mt-4 text-4xl font-bold leading-none">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2.2fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h3 className="text-xl font-bold text-slate-800">Pending Registrar Requests</h3>
            <button className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">View All</button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-3 font-semibold">#</th>
                  <th className="px-3 py-3 font-semibold">Employee ID</th>
                  <th className="px-3 py-3 font-semibold">Full Name</th>
                  <th className="px-3 py-3 font-semibold">Department</th>
                  <th className="px-3 py-3 font-semibold">Clearance Type</th>
                  <th className="px-3 py-3 font-semibold">Submission Date</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? rows.map((row, index) => (
                  <tr key={row.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-3 py-3 text-slate-500">{index + 1}</td>
                    <td className="px-3 py-3 text-slate-600">{row.employeeId}</td>
                    <td className="px-3 py-3 font-medium text-slate-700">{row.name}</td>
                    <td className="px-3 py-3 text-slate-600">{row.department}</td>
                    <td className="px-3 py-3 text-slate-600">{row.type}</td>
                    <td className="px-3 py-3 text-slate-600">{new Date(row.date).toLocaleDateString()}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${row.statusTone}`}>{row.status}</span>
                    </td>
                    <td className="px-3 py-3">
                      <button className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                        {row.action}
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="8" className="px-3 py-6 text-center text-slate-500">
                      {loading ? 'Loading registrar requests...' : 'No registrar requests found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-xl font-bold text-slate-800">Academic Records</h3>
            <div className="space-y-3">
              {[
                { label: 'Degree / Diploma Records', count: 18 },
                { label: 'Certificate Verification', count: 15 },
                { label: 'Employee Record Confirmation', count: 12 },
                { label: 'Verification Pending', count: 7 },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-sm text-slate-600">{item.label}</span>
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-xl font-bold text-slate-800">Document Verification</h3>
            <div className="space-y-3">
              {[
                { label: 'Required Documents', count: 22, tone: 'bg-sky-100 text-sky-700' },
                { label: 'Missing Documents', count: stats.returnedRequests, tone: 'bg-rose-100 text-rose-700' },
                { label: 'Needs Review', count: stats.pendingVerification, tone: 'bg-amber-100 text-amber-700' },
                { label: 'Approved Clearances', count: stats.approvedClearances, tone: 'bg-emerald-100 text-emerald-700' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-sm text-slate-600">{item.label}</span>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.tone}`}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-xl font-bold text-slate-800">Quick Actions</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {[
                { label: 'Verify Academic Records', icon: BadgeCheck, tone: 'bg-cyan-100 text-cyan-700' },
                { label: 'Check Documents', icon: FileCheck, tone: 'bg-violet-100 text-violet-700' },
                { label: 'View Clearance History', icon: Clock3, tone: 'bg-emerald-100 text-emerald-700' },
                { label: 'Generate Report', icon: BarChart3, tone: 'bg-blue-100 text-blue-700' },
              ].map(({ label, icon: Icon, tone }) => (
                <button key={label} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                  <span className="flex items-center gap-2"><Icon className={`h-4 w-4 ${tone}`} /> {label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrarDashboard;
