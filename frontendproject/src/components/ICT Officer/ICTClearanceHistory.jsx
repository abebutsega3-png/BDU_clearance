import React, { useState, useEffect } from 'react';

export default function ICTClearanceHistory() {
  const [historyData, setHistoryData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchHistory = async () => {
    try {
      const queryParams = new URLSearchParams({
        search: searchTerm,
        status: statusFilter
      }).toString();

      const res = await fetch(`/api/v1/ict-clearance-history?${queryParams}`);
      const data = await res.json();
      if (data.success) {
        setHistoryData(data.data);
      }
    } catch (err) {
      console.error('Failed to load clearance history:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [searchTerm, statusFilter]);

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 font-sans">
      {/* Title Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">ICT Clearance History</h1>
        <p className="text-xs text-slate-500">
          Bahir Dar University Employee Clearance Management System
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search by Request ID, Employee Name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-80 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total Records: <span className="font-bold text-slate-800">{historyData.length}</span>
        </div>
      </div>

      {/* History Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-xs text-slate-600 uppercase font-semibold">
              <th className="p-4">Clearance ID</th>
              <th className="p-4">Employee</th>
              <th className="p-4">Department</th>
              <th className="p-4">Reason</th>
              <th className="p-4 text-center">Assets Handled</th>
              <th className="p-4">Processed Date</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {historyData.length > 0 ? (
              historyData.map((item) => (
                <tr key={item.clearanceId} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono font-bold text-blue-700">{item.clearanceId}</td>
                  <td className="p-4">
                    <div className="font-bold text-slate-800">{item.employeeName}</div>
                    <div className="text-slate-500 font-mono text-[11px]">{item.employeeId}</div>
                  </td>
                  <td className="p-4">{item.department}</td>
                  <td className="p-4">{item.clearanceType}</td>
                  <td className="p-4 text-center font-semibold">
                    {item.assetsHandled?.length || 0}
                  </td>
                  <td className="p-4 text-slate-600">
                    {new Date(item.processedDate).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        item.ictStatus === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.ictStatus}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => setSelectedRecord(item)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1 rounded-md font-medium transition-colors"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="p-6 text-center text-slate-400 italic">
                  No clearance history logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Clearance Action Audit Record</h3>
                <p className="text-xs text-slate-500">ID: {selectedRecord.clearanceId}</p>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold ${
                  selectedRecord.ictStatus === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {selectedRecord.ictStatus}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400">Employee:</span>
                  <p className="font-bold">{selectedRecord.employeeName} ({selectedRecord.employeeId})</p>
                </div>
                <div>
                  <span className="text-slate-400">Department:</span>
                  <p className="font-bold">{selectedRecord.department}</p>
                </div>
                <div>
                  <span className="text-slate-400">Clearance Type:</span>
                  <p className="font-semibold">{selectedRecord.clearanceType}</p>
                </div>
                <div>
                  <span className="text-slate-400">Processed By:</span>
                  <p className="font-semibold">{selectedRecord.processedBy}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold mb-1 text-slate-700">Handled Assets Log:</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-[11px] text-slate-500 uppercase">
                      <tr>
                        <th className="p-2">Asset ID</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Condition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedRecord.assetsHandled?.map((asset, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-mono">{asset.assetId}</td>
                          <td className="p-2">{asset.assetType}</td>
                          <td className="p-2 font-medium">{asset.conditionAtReturn || 'Good'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <span className="text-slate-400">Remarks / Officer Notes:</span>
                <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-1 italic text-slate-700">
                  {selectedRecord.remarks || 'No remarks provided.'}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center mt-6 border-t border-slate-100 pt-3">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Print Slip
              </button>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-1.5 text-xs bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg"
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