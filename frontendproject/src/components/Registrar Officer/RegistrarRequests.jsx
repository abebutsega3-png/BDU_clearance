import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Search } from 'lucide-react';

const SummaryCard = ({ title, value, className = '' }) => (
  <div className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between ${className}`}>
    <span className="text-xs font-medium text-gray-500">{title}</span>
    <h3 className="text-2xl font-bold text-gray-900 mt-3">{value}</h3>
  </div>
);

const RegistrarRequests = () => {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, approved: 0, returned: 0 });
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selected, setSelected] = useState(null);
  const [actioning, setActioning] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [commentText, setCommentText] = useState('');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/registrar/requests', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const rows = data?.requests || data || [];
      setRequests(rows);
      const summary = { total: rows.length, pending: 0, inProgress: 0, approved: 0, returned: 0 };
      rows.forEach((item) => {
        const status = item.registrarStatus || item.status || 'Pending';
        if (/pending/i.test(status)) summary.pending += 1;
        else if (/in progress|inprogress/i.test(status)) summary.inProgress += 1;
        else if (/approved|verified/i.test(status)) summary.approved += 1;
        else if (/returned|rejected/i.test(status)) summary.returned += 1;
      });
      setStats(summary);
    } catch (err) {
      console.error('Failed fetching registrar requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const openRequest = (request) => {
    setSelected(request);
    setReturnReason('');
    setCommentText('');
  };

  const closeModal = () => setSelected(null);

  const doAction = async (action) => {
    if (!selected) return;
    try {
      setActioning(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      if (action === 'verify') {
        await axios.post(`/api/registrar/requests/${selected._id}/verify`, {}, { headers });
      } else if (action === 'reject') {
        await axios.post(`/api/registrar/requests/${selected._id}/reject`, { reason: commentText }, { headers });
      } else if (action === 'return') {
        if (!returnReason) return alert('Please enter a return reason');
        await axios.post(`/api/registrar/requests/${selected._id}/return`, { reason: returnReason }, { headers });
      } else if (action === 'comment') {
        if (!commentText) return alert('Please enter a comment');
        await axios.post(`/api/registrar/requests/${selected._id}/comment`, { comment: commentText }, { headers });
      }

      await fetchRequests();
      closeModal();
    } catch (err) {
      console.error('Action failed', err);
      alert('Action failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setActioning(false);
    }
  };

  const filtered = requests.filter((request) => {
    if (query) {
      const q = query.toLowerCase();
      const haystack = [request.fullName, request.employeeId, request.requestId].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (filterStatus !== 'All') {
      const status = (request.registrarStatus || request.status || '').toLowerCase();
      if (!status.includes(filterStatus.toLowerCase())) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard title="Total Requests" value={stats.total} />
        <SummaryCard title="Pending Review" value={stats.pending} className="bg-amber-50/40" />
        <SummaryCard title="In Progress" value={stats.inProgress} className="bg-emerald-50/30" />
        <SummaryCard title="Approved / Verified" value={stats.approved} />
        <SummaryCard title="Returned / Rejected" value={stats.returned} className="bg-rose-50/30" />
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center border rounded-md px-2 py-1 w-80">
            <input className="flex-1 outline-none text-sm px-2 py-1" placeholder="Search by employee name or ID..." value={query} onChange={(e) => setQuery(e.target.value)} />
            <button className="text-gray-500"><Search className="w-4 h-4" /></button>
          </div>

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm p-2 border rounded-md">
            <option>All</option>
            <option>Pending</option>
            <option>In Progress</option>
            <option>Approved</option>
            <option>Returned</option>
          </select>

          <div className="ml-auto text-sm text-gray-500">{loading ? 'Loading...' : `${filtered.length} requests`}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Request ID</th>
                <th className="p-3">Employee ID</th>
                <th className="p-3">Full Name</th>
                <th className="p-3">Department</th>
                <th className="p-3">Clearance Type</th>
                <th className="p-3">Submission Date</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((request, index) => (
                <tr key={request._id || request.requestId} className="hover:bg-gray-50/80 transition">
                  <td className="p-3 text-gray-400">{index + 1}</td>
                  <td className="p-3 font-medium text-gray-800">{request.requestId}</td>
                  <td className="p-3 text-gray-600">{request.employeeId}</td>
                  <td className="p-3 font-semibold text-gray-900">{request.fullName}</td>
                  <td className="p-3 text-gray-600">{request.department}</td>
                  <td className="p-3 text-gray-600">{request.clearanceType}</td>
                  <td className="p-3 text-gray-600">{new Date(request.submissionDate || request.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 text-gray-600">{request.registrarStatus || request.status}</td>
                  <td className="p-3"><button onClick={() => openRequest(request)} className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm">View / Review</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal}></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl p-4 z-10">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold">Request Details - {selected.requestId}</h3>
              <button onClick={closeModal} className="text-gray-500">Close</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              <div className="lg:col-span-2 space-y-3">
                <div className="bg-gray-50 p-3 rounded-md">
                  <h4 className="font-semibold text-sm">Employee Information</h4>
                  <div className="mt-2 text-sm text-gray-700">
                    <div><strong>Employee ID:</strong> {selected.employeeId}</div>
                    <div><strong>Full Name:</strong> {selected.fullName}</div>
                    <div><strong>Department:</strong> {selected.department}</div>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-md">
                  <h4 className="font-semibold text-sm">Clearance Request Details</h4>
                  <div className="mt-2 text-sm text-gray-700">
                    <div><strong>Type:</strong> {selected.clearanceType}</div>
                    <div><strong>Reason:</strong> {selected.reason || 'N/A'}</div>
                    <div><strong>Submitted:</strong> {new Date(selected.submissionDate || selected.createdAt).toLocaleString()}</div>
                    <div><strong>Status:</strong> {selected.registrarStatus || selected.status}</div>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-md">
                  <h4 className="font-semibold text-sm">Supporting Documents</h4>
                  <div className="mt-2 text-sm text-gray-700">
                    {selected.documents && selected.documents.length ? (
                      <ul>
                        {selected.documents.map((doc, index) => (
                          <li key={index}><a href={doc.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">{doc.name || doc.filename || 'Document'}</a></li>
                        ))}
                      </ul>
                    ) : <div className="text-xs text-gray-500">No supporting documents attached.</div>}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-white p-3 rounded-md border">
                  <h4 className="font-semibold text-sm">Review Actions</h4>
                  <div className="mt-3 space-y-2">
                    <button onClick={() => doAction('verify')} disabled={actioning} className="w-full bg-green-600 text-white px-3 py-2 rounded">Verify / Approve</button>
                    <button onClick={() => doAction('return')} disabled={actioning} className="w-full bg-yellow-500 text-white px-3 py-2 rounded">Return Request</button>
                    <button onClick={() => doAction('reject')} disabled={actioning} className="w-full bg-rose-600 text-white px-3 py-2 rounded">Reject</button>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-md border">
                  <h4 className="font-semibold text-sm">Return Request Form</h4>
                  <textarea className="w-full p-2 border rounded-md text-sm" placeholder="Enter return reason..." value={returnReason} onChange={(e) => setReturnReason(e.target.value)} rows={4}></textarea>
                </div>

                <div className="bg-white p-3 rounded-md border">
                  <h4 className="font-semibold text-sm">Add Comment</h4>
                  <textarea className="w-full p-2 border rounded-md text-sm" placeholder="Enter comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={3}></textarea>
                  <button onClick={() => doAction('comment')} disabled={actioning} className="mt-2 w-full bg-blue-600 text-white px-3 py-2 rounded">Add Comment</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrarRequests;
