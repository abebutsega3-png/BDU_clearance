import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Search,
  Eye,
  Boxes,
  Loader2,
  PackageCheck
} from 'lucide-react';

export default function AssetRecords() {
  const [searchParams] = useSearchParams();
  const selectedEmployeeId = searchParams.get('employeeId') || '';
  const selectedRequestId = searchParams.get('requestId') || '';

  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [outstandingAssets, setOutstandingAssets] = useState([]);

  const [searchTerm, setSearchTerm] = useState(selectedEmployeeId);
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [campusFilter, setCampusFilter] = useState('All');
  const [filterOptions, setFilterOptions] = useState({ assetTypes: [], departments: [], campuses: [] });

  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetHistory, setAssetHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    setSearchTerm(selectedEmployeeId);
  }, [selectedEmployeeId]);

  useEffect(() => {
    fetchAssetRecords();
  }, [selectedEmployeeId]);

  const fetchAssetRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (selectedEmployeeId) {
        params.set('employeeId', selectedEmployeeId);
      }

      const url = params.toString()
        ? `http://localhost:3000/api/property/dashboard/assets?${params.toString()}`
        : 'http://localhost:3000/api/property/dashboard/assets';

      const res = await axios.get(url);
      const records = Array.isArray(res.data?.records)
        ? res.data.records
        : Array.isArray(res.data?.assets)
          ? res.data.assets
          : [];

      setAssets(records);
      setOutstandingAssets(records.filter((item) => item.status === 'Outstanding'));
      setFilterOptions({
        assetTypes: res.data?.filters?.assetTypes || [],
        departments: res.data?.filters?.departments || [],
        campuses: res.data?.filters?.campuses || []
      });
    } catch (err) {
      console.error('Error fetching asset records:', err);
      setAssets([]);
      setOutstandingAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const handleViewDetails = async (asset) => {
    setSelectedAsset(asset);
    setLoadingHistory(true);
    try {
      const res = await axios.get(`http://localhost:3000/api/property/dashboard/assets/${asset.assetId}`);
      setAssetHistory(res.data?.asset?.history || []);
    } catch (err) {
      console.error('Error loading asset history:', err);
      setAssetHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredAssets = assets.filter((item) => {
    const matchesSearch =
      (!searchTerm ||
        (item.employeeName && item.employeeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.employeeId && item.employeeId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.assetId && item.assetId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.assetName && item.assetName.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    const matchesType = typeFilter === 'All' || item.assetType === typeFilter;
    const matchesDept = deptFilter === 'All' || item.department === deptFilter;
    const matchesCampus = campusFilter === 'All' || item.campus === campusFilter;

    return matchesSearch && matchesStatus && matchesType && matchesDept && matchesCampus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Assigned':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Returned':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Outstanding':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Damaged':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Lost':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const employeeAssets = selectedEmployeeId ? filteredAssets : filteredAssets;
  const employeeSummary = employeeAssets.length > 0 ? employeeAssets[0] : null;
  const totalAssets = employeeAssets.length;
  const returnedAssets = employeeAssets.filter((item) => item.status === 'Returned').length;
  const outstandingCount = employeeAssets.filter((item) => item.status === 'Outstanding').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-500 text-xs">
        <Loader2 className="animate-spin mr-2" size={18} />
        <span>Loading asset records...</span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-xs text-slate-700 space-y-6">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Boxes className="text-teal-600" size={18} />
            <span>Asset Records</span>
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Property Officer — Employee asset verification for clearance review
          </p>
        </div>
      </div>

      {selectedEmployeeId && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Employee</p>
              <h2 className="text-base font-bold text-slate-900">{employeeSummary?.employeeName || 'Employee'}</h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Employee ID</p>
              <p className="font-semibold text-slate-700">{selectedEmployeeId}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 text-center">
            <div>
              <p className="text-[10px] text-slate-500">Total Assets</p>
              <p className="text-base font-bold text-slate-800">{totalAssets}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500">Returned</p>
              <p className="text-base font-bold text-emerald-700">{returnedAssets}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500">Outstanding</p>
              <p className="text-base font-bold text-rose-700">{outstandingCount}</p>
            </div>
          </div>

          {selectedRequestId && (
            <p className="text-[10px] text-slate-500">Reviewing request: {selectedRequestId}</p>
          )}
        </div>
      )}

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search Employee / Employee ID / Asset ID / Asset Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Asset Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Assigned">Assigned</option>
              <option value="Returned">Returned</option>
              <option value="Outstanding">Outstanding</option>
              <option value="Damaged">Damaged</option>
              <option value="Lost">Lost</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Asset Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
            >
              <option value="All">All Types</option>
              {filterOptions.assetTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Department</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
            >
              <option value="All">All Departments</option>
              {filterOptions.departments.map((department) => <option key={department} value={department}>{department}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Campus</label>
            <select
              value={campusFilter}
              onChange={(e) => setCampusFilter(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
            >
              <option value="All">All Campuses</option>
              {filterOptions.campuses.map((campus) => <option key={campus} value={campus}>{campus}</option>)}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'Outstanding' ? 'All' : 'Outstanding')}
          className={`w-full rounded-lg border px-3 py-2 text-left font-semibold transition-colors ${
            statusFilter === 'Outstanding'
              ? 'border-rose-300 bg-rose-50 text-rose-800'
              : 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
          }`}
        >
          Outstanding Assets: {outstandingAssets.length}
          <span className="ml-2 text-[10px] font-normal">{statusFilter === 'Outstanding' ? 'Showing outstanding only' : 'Show outstanding only'}</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-slate-900 flex items-center space-x-2">
            <PackageCheck size={16} className="text-teal-600" />
            <span>Asset Records</span>
          </h2>
          <span className="text-[11px] text-slate-500">
            Total Records: <strong>{filteredAssets.length}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                <th className="p-3">Asset ID</th>
                <th className="p-3">Asset Name</th>
                <th className="p-3">Employee</th>
                <th className="p-3">Department</th>
                <th className="p-3">Assigned Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-slate-400">
                    No asset records match this employee or search criteria.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((item) => (
                  <tr key={item.assetId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono font-semibold text-teal-700">{item.assetId}</td>
                    <td className="p-3 font-semibold text-slate-800">{item.assetName}</td>
                    <td className="p-3 font-medium text-slate-700">{item.employeeName}</td>
                    <td className="p-3 text-slate-600">{item.department}</td>
                    <td className="p-3 text-slate-500">{formatDate(item.assignedDate)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded border font-semibold text-[10px] ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleViewDetails(item)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded flex items-center space-x-1 text-[11px] transition-colors ml-auto border border-slate-300"
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

      {selectedAsset && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="font-bold text-slate-800">Asset Details</h3>
            <button
              onClick={() => setSelectedAsset(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              Close
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
            <div>
              <p className="text-slate-400">Asset Name</p>
              <p className="font-semibold text-slate-800">{selectedAsset.assetName}</p>
            </div>
            <div>
              <p className="text-slate-400">Asset ID</p>
              <p className="font-semibold text-slate-800">{selectedAsset.assetId}</p>
            </div>
            <div>
              <p className="text-slate-400">Employee</p>
              <p className="font-semibold text-slate-800">{selectedAsset.employeeName}</p>
            </div>
            <div>
              <p className="text-slate-400">Category</p>
              <p className="font-semibold text-slate-800">{selectedAsset.category || selectedAsset.assetType}</p>
            </div>
            <div>
              <p className="text-slate-400">Employee ID</p>
              <p className="font-semibold text-slate-800">{selectedAsset.employeeId}</p>
            </div>
            <div>
              <p className="text-slate-400">Department</p>
              <p className="font-semibold text-slate-800">{selectedAsset.department}</p>
            </div>
            <div>
              <p className="text-slate-400">Campus</p>
              <p className="font-semibold text-slate-800">{selectedAsset.campus}</p>
            </div>
            <div>
              <p className="text-slate-400">Assigned Date</p>
              <p className="font-semibold text-slate-800">{formatDate(selectedAsset.assignedDate)}</p>
            </div>
            <div>
              <p className="text-slate-400">Return Date</p>
              <p className="font-semibold text-slate-800">{formatDate(selectedAsset.returnDate)}</p>
            </div>
            <div>
              <p className="text-slate-400">Status</p>
              <p className="font-semibold text-slate-800">{selectedAsset.status}</p>
            </div>
            <div>
              <p className="text-slate-400">Condition</p>
              <p className="font-semibold text-slate-800">{selectedAsset.condition}</p>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">History</h4>
            {loadingHistory ? (
              <div className="mt-2 flex items-center text-slate-400">
                <Loader2 className="mr-2 animate-spin" size={14} /> Loading asset history...
              </div>
            ) : assetHistory.length === 0 ? (
              <p className="mt-2 text-slate-400">No asset history available.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {assetHistory.map((event, index) => (
                  <li key={`${event.date}-${index}`} className="flex items-start gap-2 text-[11px] text-slate-600">
                    <span className="mt-1 h-2 w-2 rounded-full bg-teal-500" />
                    <span>{event.date} — {event.action}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}