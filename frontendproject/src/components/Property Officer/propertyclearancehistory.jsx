import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search,
  History,
  FileCheck,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  Loader2,
  RotateCcw,
} from 'lucide-react';

export default function PropertyClearanceHistory() {
  const [loading, setLoading] = useState(true);
  const [historyRecords, setHistoryRecords] = useState([]);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [campusFilter, setCampusFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');

  // Modal State (View Only)
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchClearanceHistory = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:3000/api/property/clearance-history/history');
      if (res.data?.success) {
        setHistoryRecords(res.data.history || []);
      }
    } catch (err) {
      console.error('Error fetching property clearance history:', err);
    } finally {
      setLoading(false);
    }
  };

  // Retrieve History Data from Database on Component Mount
  useEffect(() => {
    fetchClearanceHistory();
  }, []);

  // Filter Logic (Search by Name, Employee ID, Request ID; Filter by Status & Date)
  const filteredRecords = historyRecords.filter((item) => {
    const matchesSearch =
      (item.employeeName && item.employeeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.employeeId && item.employeeId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.requestId && item.requestId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || item.property?.status === statusFilter;

    const reviewDate = item.property?.reviewedAt ? new Date(item.property.reviewedAt) : null;
    const start = fromDate ? new Date(fromDate) : null;
    const end = toDate ? new Date(toDate) : null;

    let matchesDate = true;
    if (start && reviewDate) {
      matchesDate = matchesDate && reviewDate >= start;
    }
    if (start && !reviewDate) matchesDate = false;
    if (end && reviewDate) {
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && reviewDate <= endOfDay;
    }
    if (end && !reviewDate) matchesDate = false;

    return matchesSearch && matchesStatus && matchesDate
      && (campusFilter === 'All' || item.campus === campusFilter)
      && (departmentFilter === 'All' || item.department === departmentFilter);
  });

  const campuses = [...new Set(historyRecords.map((item) => item.campus).filter(Boolean))].sort();
  const departments = [...new Set(historyRecords.map((item) => item.department).filter(Boolean))].sort();
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setFromDate('');
    setToDate('');
    setCampusFilter('All');
    setDepartmentFilter('All');
  };

  const getDecisionBadge = (status) => {
    if (status === 'Approved') {
      return (
        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded font-bold text-[10px] inline-flex items-center space-x-1">
          <CheckCircle2 size={12} className="text-emerald-600" />
          <span>APPROVED</span>
        </span>
      );
    }
    if (status === 'Returned') {
      return (
        <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-200 rounded font-bold text-[10px] inline-flex items-center space-x-1">
          <XCircle size={12} className="text-rose-600" />
          <span>RETURNED</span>
        </span>
      );
    }
    return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px]">{status}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-500 text-xs">
        <Loader2 className="animate-spin mr-2 text-teal-600" size={18} />
        <span>የClearance ታሪክ መረጃዎችን ከDatabase በማስገባት ላይ...</span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-xs text-slate-700 space-y-6">

      {/* Title */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <History className="text-teal-600" size={18} />
            <span>PROPERTY CLEARANCE HISTORY</span>
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            የቀድሞ Property Clearance ውሳኔዎች መዝገብ (Read-Only Audit Log)
          </p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          
          <div className="md:col-span-2">
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search Employee / ID / Request ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Campus</label>
            <select
              value={campusFilter}
              onChange={(e) => setCampusFilter(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
            >
              <option value="All">All Campuses</option>
              {campuses.map((campus) => <option key={campus} value={campus}>{campus}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Department</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
            >
              <option value="All">All Departments</option>
              {departments.map((department) => <option key={department} value={department}>{department}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
            >
              <option value="All">All Decisions</option>
              <option value="Approved">Approved</option>
              <option value="Returned">Returned</option>
            </select>
          </div>

          <div className="flex items-end space-x-2">
            <div className="w-1/2">
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
              />
            </div>
            <div className="w-1/2">
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={fetchClearanceHistory}
              className="flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-2 text-[11px] font-semibold text-white hover:bg-teal-800"
            >
              <Search size={13} /> Search
            </button>
            <button
              type="button"
              onClick={resetFilters}
              title="Reset filters"
              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw size={14} />
            </button>
          </div>

        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-slate-900 flex items-center space-x-2">
            <FileCheck size={16} className="text-teal-600" />
            <span>Clearance History Records</span>
          </h2>
          <span className="text-[11px] text-slate-500">
            Total Records: <strong>{filteredRecords.length}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                <th className="p-3">No</th>
                <th className="p-3">Request</th>
                <th className="p-3">Employee</th>
                <th className="p-3">Department</th>
                <th className="p-3">Request Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">
                    ምንም የተቀመጠ የClearance ውሳኔ ታሪክ አልተገኘም።
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => (
                  <tr key={item.requestId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 text-slate-400">{filteredRecords.indexOf(item) + 1}</td>
                    <td className="p-3 font-mono font-semibold text-teal-700">{item.requestId}</td>
                    <td className="p-3 font-semibold text-slate-800">{item.employeeName}</td>
                    <td className="p-3 text-slate-600">{item.department}</td>
                    <td className="p-3 text-slate-500 font-mono">
                      {item.requestDate
                        ? new Date(item.requestDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })
                        : '-'}
                    </td>
                    <td className="p-3">{getDecisionBadge(item.property?.status)}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedRecord(item)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded flex items-center space-x-1 text-[11px] transition-colors ml-auto border border-slate-300"
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden">
            
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-sm">
                Clearance History Details — {selectedRecord.requestId}
              </h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">

              {/* Employee Info */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <h4 className="font-bold text-teal-700 text-[11px] uppercase border-b border-slate-200 pb-1">
                  Employee Information
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div><span className="text-slate-400 block text-[10px]">Name</span> <strong>{selectedRecord.employeeName}</strong></div>
                  <div><span className="text-slate-400 block text-[10px]">Employee ID</span> <span className="font-mono">{selectedRecord.employeeId}</span></div>
                  <div><span className="text-slate-400 block text-[10px]">Department</span> {selectedRecord.department}</div>
                  <div><span className="text-slate-400 block text-[10px]">Position</span> {selectedRecord.position}</div>
                  <div><span className="text-slate-400 block text-[10px]">Campus</span> {selectedRecord.campus || '-'}</div>
                </div>
              </div>

              {/* Clearance Info */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <h4 className="font-bold text-teal-700 text-[11px] uppercase border-b border-slate-200 pb-1">
                  Clearance Information
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div><span className="text-slate-400 block text-[10px]">Clearance Type</span> <strong>{selectedRecord.clearanceType || 'Resignation'}</strong></div>
                  <div><span className="text-slate-400 block text-[10px]">Request Date</span> <span className="font-mono">{selectedRecord.requestDate ? new Date(selectedRecord.requestDate).toLocaleDateString('en-US') : '-'}</span></div>
                  <div className="col-span-2"><span className="text-slate-400 block text-[10px]">Reason</span> <strong>{selectedRecord.clearanceReason || selectedRecord.reason || '-'}</strong></div>
                </div>
              </div>

              {/* Property Verification */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <h4 className="font-bold text-teal-700 text-[11px] uppercase border-b border-slate-200 pb-1">
                  Property Verification
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center py-2 bg-white rounded border border-slate-100">
                  <div><span className="text-slate-400 block text-[10px]">Assigned Assets</span> <strong>{selectedRecord.assetSummary.assigned}</strong></div>
                  <div><span className="text-slate-400 block text-[10px]">Returned Assets</span> <strong className="text-emerald-600">{selectedRecord.assetSummary.returned}</strong></div>
                  <div><span className="text-slate-400 block text-[10px]">Outstanding Assets</span> <strong className={selectedRecord.assetSummary.outstanding > 0 ? "text-rose-600" : "text-slate-600"}>{selectedRecord.assetSummary.outstanding}</strong></div>
                </div>
              </div>

              {/* Decision Details */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                  <span className="font-bold text-teal-700 uppercase text-[11px]">Action Taken</span>
                  <div>{getDecisionBadge(selectedRecord.property?.status)}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div><span className="text-slate-400 block text-[10px]">Reviewed By</span> <strong>{selectedRecord.property?.reviewedBy}</strong></div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Reviewed At</span> 
                    <span className="font-mono">
                      {selectedRecord.property?.reviewedAt ? new Date(selectedRecord.property.reviewedAt).toLocaleString('en-US') : '-'}
                    </span>
                  </div>
                </div>

                {selectedRecord.property?.status === 'Returned' ? (
                  <div className="pt-2">
                    <span className="text-[10px] text-rose-500 font-semibold block">Return Reason:</span>
                    <p className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-900 font-medium mt-0.5">
                      {selectedRecord.property?.returnReason}
                    </p>
                  </div>
                ) : (
                  <div className="pt-2">
                    <span className="text-[10px] text-slate-400 block">Comment:</span>
                    <p className="p-2 bg-white border border-slate-200 rounded text-slate-700 mt-0.5">
                      {selectedRecord.property?.comment}
                    </p>
                  </div>
                )}
              </div>

              {/* Action / Decision History */}
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <h4 className="font-bold text-slate-900 text-[11px] uppercase mb-3">Action / Decision History</h4>
                <div className="border-l-2 border-teal-100 pl-4 space-y-3">
                  {(selectedRecord.actionHistory || []).map((event, index) => (
                    <div key={`${event.action}-${index}`} className="relative">
                      <span className="absolute -left-[22px] top-0.5 h-3 w-3 rounded-full border-2 border-white bg-teal-600 ring-1 ring-teal-200" />
                      <p className="font-semibold text-slate-800">{event.action}</p>
                      <p className="text-[10px] text-slate-500">
                        {event.date ? new Date(event.date).toLocaleString('en-US') : '-'}
                        {event.officer ? ` · ${event.officer}` : ''}
                      </p>
                      {event.reason && <p className="mt-1 text-[10px] text-rose-700">Reason: {event.reason}</p>}
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-1 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded text-xs"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}