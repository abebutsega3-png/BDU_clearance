import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Eye, Search, SlidersHorizontal, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import LibraryClearanceViewModal from './LibraryClearanceRequests';

const apiUrl = 'http://localhost:3000/api/clearance';
const requestHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
const labels = { 'In Progress': 'Under Review', Completed: 'Approved', Rejected: 'Returned' };
const statuses = [
  ['Pending', 'Pending'],
  ['In Progress', 'Under Review'],
  ['Completed', 'Approved'],
  ['Rejected', 'Returned'],
];

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const libraryStatusOf = (request) => request.libraryStatus || request.status;

export default function LibraryClearanceRequestsPage({ history = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const selectedId = searchParams.get('requestId');

  const loadRequests = async () => {
    try {
      const { data } = await axios.get(apiUrl, { headers: requestHeaders() });
      setRequests((data.clearances || []).map((item) => ({ ...item, status: libraryStatusOf(item) })));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load clearance requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, [history]);

  useEffect(() => {
    const queryStatus = searchParams.get('status') || '';
    setStatusFilter(queryStatus);
  }, [searchParams]);

  const visibleRequests = requests.filter((request) => {
    const requestDate = new Date(request.submittedDate || request.requestDate || request.createdAt);
    const searchText = [request.requestId, request.employeeId, request.employeeName, request.employee?.fullName].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = !search.trim() || searchText.includes(search.trim().toLowerCase());
    const matchesStatus = !statusFilter || request.status === statusFilter;
    const matchesFrom = !fromDate || requestDate >= new Date(`${fromDate}T00:00:00`);
    const matchesTo = !toDate || requestDate <= new Date(`${toDate}T23:59:59`);
    const matchesHistory = !history || ['Completed', 'Rejected'].includes(libraryStatusOf(request));
    return matchesSearch && matchesStatus && matchesFrom && matchesTo && matchesHistory;
  });

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setFromDate('');
    setToDate('');
    setSearchParams({});
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-6">
      <div className="mb-5"><h1 className="text-2xl font-bold text-slate-900">{history ? 'Clearance History' : 'Clearance Requests'}</h1><p className="mt-1 text-sm text-slate-500">Verify library obligations for employee clearance requests.</p></div>
      <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><SlidersHorizontal size={16} className="text-teal-700" /> Request filters</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_auto]">
          <label className="relative block"><Search size={15} className="absolute left-3 top-2.5 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Employee name, ID, or request ID" className="w-full rounded-md border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-teal-600" /></label>
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setSearchParams(event.target.value ? { status: event.target.value } : {}); }} className="rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal-600"><option value="">All statuses</option>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="From date" className="rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal-600" />
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} aria-label="To date" className="rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal-600" />
          <button type="button" onClick={clearFilters} className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><X size={14} /> Clear</button>
        </div>
      </section>
      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">{loading ? <p className="p-10 text-center text-sm text-slate-400">Loading clearance requests...</p> : error ? <p className="p-10 text-center text-sm text-rose-600">{error}</p> : <table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Request ID</th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Employee ID</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleRequests.length === 0 ? <tr><td colSpan="6" className="p-10 text-center text-slate-400">No clearance requests found.</td></tr> : visibleRequests.map((request) => <tr key={request._id || request.requestId} className="hover:bg-slate-50"><td className="px-4 py-3 font-semibold">{request.requestId || '-'}</td><td className="px-4 py-3">{request.employeeName || request.employee?.fullName || 'Unknown employee'}</td><td className="px-4 py-3">{request.employeeId || '-'}</td><td className="px-4 py-3">{formatDate(request.submittedDate || request.requestDate || request.createdAt)}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 font-semibold">{labels[request.status] || request.status}</span></td><td className="px-4 py-3 text-right"><button type="button" onClick={() => setSearchParams({ requestId: request._id || request.requestId })} className="inline-flex items-center gap-1 rounded border border-teal-200 px-2 py-1 font-semibold text-teal-700 hover:bg-teal-50"><Eye size={13} /> View</button></td></tr>)}</tbody></table>}</section>
      {selectedId && <LibraryClearanceViewModal requestId={selectedId} onClose={() => setSearchParams({})} onRefresh={loadRequests} />}
    </main>
  );
}