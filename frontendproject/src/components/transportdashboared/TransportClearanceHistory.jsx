import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CalendarDays, CheckCircle2, Clock3, Eye, LoaderCircle, RotateCcw, Search, X } from 'lucide-react';

const API_URL = 'http://localhost:3000/api/transport/history';

const authConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
});

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
};

const statusClass = (status) => status === 'Approved'
  ? 'bg-emerald-50 text-emerald-700'
  : 'bg-rose-50 text-rose-700';

function DetailItem({ label, value }) {
  return (
    <div className="border-b border-slate-100 py-2.5">
      <dt className="text-[10px] font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-800">{value || '—'}</dd>
    </div>
  );
}

export default function TransportClearanceHistory() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ totalReviewed: 0, approved: 0, returned: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const loadHistory = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(API_URL, {
          ...authConfig(),
          params: {
            search: search.trim() || undefined,
            status,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
          },
          signal: controller.signal,
        });
        setRecords(response.data.records || []);
        setSummary(response.data.summary || { totalReviewed: 0, approved: 0, returned: 0 });
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.response?.data?.message || 'Unable to load Transport clearance history.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadHistory();
    return () => controller.abort();
  }, [search, status, fromDate, toDate]);

  const openEntry = async (entryId) => {
    setSelectedEntry({ id: entryId });
    setDetailLoading(true);
    setDetailError('');
    try {
      const response = await axios.get(`${API_URL}/${encodeURIComponent(entryId)}`, authConfig());
      setSelectedEntry(response.data.entry);
    } catch (requestError) {
      setDetailError(requestError.response?.data?.message || 'Unable to load clearance history details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeEntry = () => {
    setSelectedEntry(null);
    setDetailError('');
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-teal-700">Transport Office</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">Transport Clearance History</h1>
          <p className="mt-1 text-xs text-slate-500">Read-only record of Transport clearance decisions.</p>
        </div>
        <span className="text-xs text-slate-500">{records.length} record{records.length === 1 ? '' : 's'} shown</span>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Transport decision summary">
        {[
          { label: 'Total Reviewed', value: summary.totalReviewed, icon: Clock3, tone: 'slate' },
          { label: 'Approved', value: summary.approved, icon: CheckCircle2, tone: 'emerald' },
          { label: 'Returned', value: summary.returned, icon: RotateCcw, tone: 'rose' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <article key={label} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div><p className="text-xs font-semibold text-slate-600">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{loading ? '—' : value}</p></div>
            <span className={`flex h-9 w-9 items-center justify-center rounded-md ${tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : tone === 'rose' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}><Icon size={17} /></span>
          </article>
        ))}
      </section>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.5fr)_minmax(135px,.7fr)_repeat(2,minmax(145px,1fr))]">
        <label className="relative block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee ID, name, or vehicle..." className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-xs outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
        </label>
        <label>
          <span className="sr-only">Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none focus:border-teal-600">
            <option value="All">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Returned">Returned</option>
          </select>
        </label>
        <label className="relative block">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-500">From</span>
          <CalendarDays size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input aria-label="From Date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 bg-white pl-14 pr-8 text-xs outline-none focus:border-teal-600" />
        </label>
        <label className="relative block">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-500">To</span>
          <CalendarDays size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input aria-label="To Date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 bg-white pl-10 pr-8 text-xs outline-none focus:border-teal-600" />
        </label>
      </div>

      {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800">{error}</p>}

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Employee ID</th>
                <th className="px-4 py-3 font-semibold">Employee Name</th>
                <th className="px-4 py-3 font-semibold">Department</th>
                <th className="px-4 py-3 font-semibold">Request Date</th>
                <th className="px-4 py-3 font-semibold">Decision Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="7" className="px-4 py-12 text-center text-slate-500"><LoaderCircle size={17} className="mr-2 inline animate-spin" />Loading clearance history...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-12 text-center text-slate-500">No Transport clearance decisions found for these filters.</td></tr>
              ) : records.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-600">{entry.employeeId}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{entry.employeeName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{entry.department}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(entry.requestDate)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(entry.decisionDate)}</td>
                  <td className="px-4 py-3"><span className={`rounded px-2 py-1 text-[10px] font-semibold ${statusClass(entry.status)}`}>{entry.status}</span></td>
                  <td className="px-4 py-3 text-right"><button type="button" onClick={() => openEntry(entry.id)} className="inline-flex items-center gap-1.5 rounded bg-teal-700 px-3 py-2 text-[10px] font-semibold text-white hover:bg-teal-800"><Eye size={13} />View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEntry && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEntry(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="transport-history-title" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-md bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
              <div><p className="text-[10px] font-semibold uppercase text-teal-700">{selectedEntry.requestId}</p><h2 id="transport-history-title" className="mt-1 text-base font-bold text-slate-900">Transport Clearance History</h2></div>
              <button type="button" aria-label="Close history details" onClick={closeEntry} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </header>
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
              {detailLoading ? (
                <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin" />Loading decision details...</div>
              ) : detailError ? (
                <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{detailError}</p>
              ) : (
                <>
                  <dl className="grid grid-cols-1 gap-x-5 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailItem label="Employee Name" value={selectedEntry.employeeName} />
                    <DetailItem label="Employee ID" value={selectedEntry.employeeId} />
                    <DetailItem label="Department" value={selectedEntry.department} />
                    <DetailItem label="Position" value={selectedEntry.position} />
                    <DetailItem label="Vehicle Number" value={selectedEntry.vehicleNumber} />
                    <DetailItem label="Clearance Request Date" value={formatDate(selectedEntry.requestDate)} />
                    <DetailItem label="Last Working Date" value={formatDate(selectedEntry.lastWorkingDate)} />
                    <DetailItem label="Transport Clearance Status" value={selectedEntry.status} />
                    <DetailItem label="Decision Date" value={formatDate(selectedEntry.decisionDate)} />
                    <DetailItem label="Reviewed By" value={selectedEntry.reviewedBy} />
                  </dl>
                  {selectedEntry.status === 'Returned' && (
                    <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
                      <p className="text-[10px] font-semibold uppercase text-rose-700">Return Reason</p>
                      <p className="mt-1 text-sm leading-5 text-rose-900">{selectedEntry.returnReason || 'No return reason was recorded.'}</p>
                    </div>
                  )}
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase text-slate-500">Remarks</p>
                    <p className="mt-1 text-sm leading-5 text-slate-700">{selectedEntry.remarks || 'No remarks recorded.'}</p>
                  </div>
                </>
              )}
            </div>
            <footer className="flex justify-end border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6"><button type="button" onClick={closeEntry} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">Close</button></footer>
          </section>
        </div>
      )}
    </section>
  );
}