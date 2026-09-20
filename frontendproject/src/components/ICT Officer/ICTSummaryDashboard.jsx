import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowRight, Bell, CheckCircle2, FileText, MonitorSmartphone, ShieldCheck, ClipboardList } from 'lucide-react';

const API_URL = 'http://localhost:3000/api/ict/clearance-requests';

const normalizeStatus = (status = '') => {
  const value = String(status).trim().toLowerCase();
  if (value === 'pending' || value === 'pending review') return 'Pending';
  if (value === 'in progress' || value === 'under review') return 'In Review';
  if (value === 'approved' || value === 'completed') return 'Approved';
  if (value === 'returned' || value === 'rejected') return 'Returned';
  return status || 'Pending';
};

export default function ICTSummaryDashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const { data } = await axios.get(`${API_URL}?status=All`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        });

        setRequests(Array.isArray(data?.data) ? data.data : []);
      } catch {
        setError('Unable to load ICT dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const total = requests.length;
  const pending = requests.filter((item) => normalizeStatus(item.status) === 'Pending').length;
  const inProgress = requests.filter((item) => normalizeStatus(item.status) === 'In Review').length;
  const approved = requests.filter((item) => normalizeStatus(item.status) === 'Approved').length;

  const stats = [
    { label: 'Total Requests', value: total, icon: ClipboardList, color: 'bg-blue-100 text-blue-700' },
    { label: 'Pending', value: pending, icon: FileText, color: 'bg-amber-100 text-amber-700' },
    { label: 'In Review', value: inProgress, icon: ShieldCheck, color: 'bg-cyan-100 text-cyan-700' },
    { label: 'Approved', value: approved, icon: MonitorSmartphone, color: 'bg-emerald-100 text-emerald-700' },
  ];

  const recentRequests = requests.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-600">ICT Officer</p>
          <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-slate-900">Dashboard Summary</h1>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-2 text-[2rem] font-bold leading-none text-slate-900">{value}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${color}`}>
                <Icon size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.8fr)]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
            <div>
              <h2 className="text-[1.1rem] font-bold text-slate-900">Recent Clearance Requests</h2>
              <p className="text-xs text-slate-500">Latest ICT officer workflow updates</p>
            </div>
          </div>

          {loading ? (
            <p className="p-8 text-center text-sm text-slate-400">Loading requests...</p>
          ) : error ? (
            <p className="p-8 text-center text-sm text-rose-600">{error}</p>
          ) : recentRequests.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">No ICT clearance requests found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Request ID</th>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentRequests.map((request) => (
                    <tr key={request._id || request.clearanceId || request.requestId || request.employeeId}>
                      <td className="px-4 py-3 font-semibold text-slate-700">{request.clearanceId || request.requestId || 'N/A'}</td>
                      <td className="px-4 py-3 text-slate-600">{request.employeeName || request.employee?.fullName || request.employeeId || 'Unknown employee'}</td>
                      <td className="px-4 py-3 text-slate-500">{request.requestDate || (request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'N/A')}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${normalizeStatus(request.status) === 'Approved' ? 'bg-emerald-100 text-emerald-700' : normalizeStatus(request.status) === 'In Review' ? 'bg-cyan-100 text-cyan-700' : normalizeStatus(request.status) === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                          {normalizeStatus(request.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-[1.1rem] font-bold text-slate-900">
              <Bell size={16} className="text-cyan-600" /> Notifications
            </h2>
            <p className="mt-3 text-sm text-slate-500">You have {pending} requests waiting for review.</p>
            <button type="button" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700">
              View all notifications <ArrowRight size={15} />
            </button>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-[1.1rem] font-bold text-slate-900">System Check</h2>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>ICT asset monitoring is active.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Clearance workflow is running normally.</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
