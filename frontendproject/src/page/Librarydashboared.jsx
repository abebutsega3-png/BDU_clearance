import React from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Bell, CheckCircle2, Eye, FileBarChart2, RotateCcw, Search } from 'lucide-react';
import LibrarySidebar from '../components/Library Management/librarysidbar';
import LibraryNavbar from '../components/Library Management/librarynavbar';
import SummaryCards from '../components/Library Management/Summary Cards';


const LibraryDashboard = ({ children }) => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:3000/api/clearance', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
    }).then(({ data }) => setRequests(data.clearances || []))
      .catch(() => setError('Unable to load library clearance requests.'))
      .finally(() => setLoading(false));
  }, []);

  const countByStatus = (status) => requests.filter((request) => request.status === status).length;
  const stats = {
    total: requests.length,
    pending: countByStatus('Pending'),
    underReview: countByStatus('In Progress'),
    approved: countByStatus('Completed'),
    returned: countByStatus('Rejected'),
  };
  const recentRequests = requests.slice(0, 5);
  const statusLabel = { 'In Progress': 'Under Review', Rejected: 'Returned', Completed: 'Approved' };
  const statusClass = { Pending: 'bg-amber-50 text-amber-700', 'In Progress': 'bg-blue-50 text-blue-700', Completed: 'bg-emerald-50 text-emerald-700', Rejected: 'bg-rose-50 text-rose-700' };

  if (children) {
    return (
      <DashboardShell>
        {children}
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <main className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-6">
        <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Library Clearance</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Library Officer Dashboard</h1><p className="mt-1 text-sm text-slate-500">Review and process employee library clearance requests.</p></div><Link to="/library-office/reports" className="hidden items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-teal-400 sm:flex"><FileBarChart2 size={15} /> Generate Report</Link></div>
        <SummaryCards stats={stats} />
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.8fr)]">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-4"><div><h2 className="font-bold text-slate-900">Recent Clearance Requests</h2><p className="mt-1 text-xs text-slate-500">Latest employee library clearance workload</p></div><Link to="/library-office/clearance-requests" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900">View all <ArrowRight size={14} /></Link></div><div className="overflow-x-auto">{loading ? <p className="p-8 text-center text-sm text-slate-400">Loading requests...</p> : error ? <p className="p-8 text-center text-sm text-rose-600">{error}</p> : recentRequests.length === 0 ? <p className="p-8 text-center text-sm text-slate-400">No library clearance requests found.</p> : <table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Request ID</th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{recentRequests.map((request) => <tr key={request._id || request.requestId}><td className="px-4 py-3 font-semibold text-slate-700">{request.requestId || '-'}</td><td className="px-4 py-3 text-slate-600">{request.employeeName || request.employee?.fullName || request.employeeId || 'Unknown employee'}</td><td className="px-4 py-3 text-slate-500">{request.requestDate || new Date(request.createdAt).toLocaleDateString()}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass[request.status] || 'bg-slate-100 text-slate-600'}`}>{statusLabel[request.status] || request.status}</span></td><td className="px-4 py-3 text-right"><button type="button" onClick={() => navigate(`/library-office/clearance-requests?requestId=${request._id || request.requestId}`)} className="inline-flex items-center gap-1 rounded border border-teal-200 px-2 py-1 text-[10px] font-semibold text-teal-700 hover:bg-teal-50"><Eye size={13} /> View</button></td></tr>)}</tbody></table>}</div></section>
          <div className="space-y-5"><section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-bold text-slate-900">Quick Actions</h2><div className="mt-3 space-y-2"><QuickAction to="/library-office/clearance-requests?status=Pending" icon={Search} label="View Pending Requests" /><QuickAction to="/library-office/clearance-requests?status=In Progress" icon={CheckCircle2} label="Review Clearance" /><QuickAction to="/library-office/clearance-history" icon={RotateCcw} label="Clearance History" /><QuickAction to="/library-office/reports" icon={FileBarChart2} label="Generate Report" /></div></section><section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><h2 className="flex items-center gap-2 font-bold text-slate-900"><Bell size={16} className="text-teal-600" /> Notifications</h2><p className="mt-3 text-xs text-slate-500">New clearance requests and items needing your review will appear here.</p><Link to="/library-office/notifications" className="mt-3 inline-flex text-xs font-semibold text-teal-700">Open notifications <ArrowRight size={14} className="ml-1" /></Link></section></div>
        </div>
        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-bold text-slate-900">Recent Activity</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{recentRequests.slice(0, 4).map((request) => <div key={request._id || request.requestId} className="flex items-start gap-2 text-xs text-slate-600"><CheckCircle2 size={15} className="mt-0.5 text-emerald-600" /><span><strong className="text-slate-800">{request.requestId}</strong> {request.status === 'Rejected' ? 'returned for review' : request.status === 'Completed' ? 'approved' : `is ${statusLabel[request.status] || request.status.toLowerCase()}`}</span></div>)}</div></section>
      </main>
    </DashboardShell>
  );
};

function DashboardShell({ children }) { return <div className="min-h-screen bg-slate-100"><LibrarySidebar /><div className="ml-72 min-h-screen"><LibraryNavbar />{children}</div></div>; }
function QuickAction({ to, icon: Icon, label }) { return <Link to={to} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:border-teal-200 hover:bg-teal-50"><span className="flex items-center gap-2"><Icon size={15} className="text-teal-600" />{label}</span><ArrowRight size={14} className="text-slate-400" /></Link>; }

export default LibraryDashboard;