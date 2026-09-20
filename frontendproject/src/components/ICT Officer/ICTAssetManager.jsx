import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/authContext';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  CircleUserRound,
  Download,
  Filter,
  Menu,
  PackageCheck,
  Search,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const tabItems = [
  { key: 'all', label: 'All Assets' },
  { key: 'assigned', label: 'Assigned Assets' },
  { key: 'returned', label: 'Returned Assets' },
  { key: 'outstanding', label: 'Outstanding Assets' },
];

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function ICTAssetManager() {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetForReturn, setSelectedAssetForReturn] = useState(null);
  const [returnCondition, setReturnCondition] = useState('Good');
  const [accessories, setAccessories] = useState({ charger: true, bag: true, mouse: true });
  const [returnRemarks, setReturnRemarks] = useState('');
  const [assetTypeFilter, setAssetTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');

  const fetchAssets = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/ict-assets?search=${encodeURIComponent(searchTerm)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAssets(data.data);
        return;
      }
      setAssets([]);
    } catch (err) {
      console.error('Failed to fetch assets:', err);
      setAssets([]);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [searchTerm]);

  const counts = {
    all: assets.length,
    assigned: assets.filter((asset) => asset.assetStatus === 'Assigned').length,
    returned: assets.filter((asset) => asset.assetStatus === 'Returned').length,
    outstanding: assets.filter((asset) => asset.assetStatus === 'Assigned').length,
  };

  const filteredAssets = assets.filter((item) => {
    const normalizedStatus = item.assetStatus === 'Outstanding' ? 'Assigned' : item.assetStatus;
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'assigned' && normalizedStatus === 'Assigned') ||
      (activeTab === 'returned' && normalizedStatus === 'Returned') ||
      (activeTab === 'outstanding' && normalizedStatus === 'Assigned');

    const matchesSearch =
      !searchTerm ||
      item.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.currentAssignment?.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.currentAssignment?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = assetTypeFilter === 'All Types' || item.assetType === assetTypeFilter;
    const matchesStatus = statusFilter === 'All Statuses' || normalizedStatus === statusFilter;
    const matchesDepartment =
      departmentFilter === 'All Departments' || item.department === departmentFilter || item.currentAssignment?.department === departmentFilter;

    return matchesTab && matchesSearch && matchesType && matchesStatus && matchesDepartment;
  });

  const handleReturnConfirm = async (e) => {
    e.preventDefault();
    if (!selectedAssetForReturn) return;

    try {
      const res = await fetch('/api/ict-assets/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedAssetForReturn.assetId,
          conditionAtReturn: returnCondition,
          accessoriesReturned: accessories,
          remarks: returnRemarks,
          processedBy: 'ICT Officer',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedAssetForReturn(null);
        setReturnRemarks('');
        fetchAssets();
      }
    } catch (err) {
      console.error('Failed to record return:', err);
    }
  };

  const statusClasses = {
    Assigned: 'bg-amber-100 text-amber-800',
    Returned: 'bg-emerald-100 text-emerald-800',
    Available: 'bg-sky-100 text-sky-700',
    Damaged: 'bg-red-100 text-red-700',
  };

  const conditionClasses = {
    Good: 'bg-emerald-50 text-emerald-700',
    Fair: 'bg-yellow-50 text-yellow-700',
    Damaged: 'bg-red-50 text-red-700',
    Lost: 'bg-rose-50 text-rose-700',
  };

  return (
    <div className="min-h-screen bg-slate-100 p-5 text-slate-800">
      <div className="mx-auto max-w-[1360px]">
        <header className="mb-5 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <button className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100">
              <Menu size={16} />
            </button>
            <h1 className="text-[18px] font-bold text-slate-800">ICT Asset Records</h1>
          </div>

          <div className="flex items-center gap-3">
            <button className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100">
              <Bell size={16} />
            </button>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                {(user?.name || 'ICT').slice(0, 2).toUpperCase()}
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-800">{user?.name || 'ICT Officer'}</div>
                <div className="text-[10px] text-slate-500">ICT Officer</div>
              </div>
            </div>
          </div>
        </header>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {tabItems.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-lg px-3 py-2 text-[11px] font-semibold transition ${
                  activeTab === tab.key
                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-700">{counts.all}</div>
                  <div className="text-[11px] text-blue-600">Total Assets</div>
                </div>
                <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                  <PackageCheck size={18} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-emerald-700">{counts.assigned}</div>
                  <div className="text-[11px] text-emerald-600">Assigned Assets</div>
                </div>
                <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                  <CheckCircle2 size={18} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-violet-700">{counts.returned}</div>
                  <div className="text-[11px] text-violet-600">Returned Assets</div>
                </div>
                <div className="rounded-lg bg-violet-100 p-2 text-violet-700">
                  <PackageCheck size={18} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-amber-700">{counts.outstanding}</div>
                  <div className="text-[11px] text-amber-600">Outstanding Assets</div>
                </div>
                <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                  <AlertTriangle size={18} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by asset ID, name, employee..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-700 outline-none ring-0 placeholder:text-slate-400 focus:border-blue-400"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <select
                    value={assetTypeFilter}
                    onChange={(e) => setAssetTypeFilter(e.target.value)}
                    className="appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-[11px] text-slate-700 outline-none focus:border-blue-400"
                  >
                    <option>All Types</option>
                    <option>Laptop</option>
                    <option>Monitor</option>
                    <option>Printer</option>
                    <option>Keyboard</option>
                    <option>Mouse</option>
                    <option>Network Device</option>
                    <option>UPS</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                </div>

                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-[11px] text-slate-700 outline-none focus:border-blue-400"
                  >
                    <option>All Statuses</option>
                    <option>Assigned</option>
                    <option>Returned</option>
                    <option>Outstanding</option>
                    <option>Available</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                </div>

                <div className="relative">
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-[11px] text-slate-700 outline-none focus:border-blue-400"
                  >
                    <option>All Departments</option>
                    <option>ICT Department</option>
                    <option>Finance Department</option>
                    <option>Library Department</option>
                    <option>ICT Office</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                </div>

                <button className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] font-medium text-slate-700">
                  <Filter size={12} />
                  Filter
                </button>

                <button className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] font-medium text-slate-700">
                  <Download size={12} />
                  Export
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Asset ID</th>
                  <th className="px-4 py-3 font-semibold">Asset Name</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Brand / Model</th>
                  <th className="px-4 py-3 font-semibold">Assigned To</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Campus</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Assignment Date</th>
                  <th className="px-4 py-3 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAssets.length > 0 ? (
                  filteredAssets.map((asset) => {
                    const normalizedStatus = asset.assetStatus === 'Outstanding' ? 'Assigned' : asset.assetStatus;
                    return (
                      <tr key={asset.assetId} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{asset.assetId}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{asset.assetName}</div>
                          <div className="text-[10px] text-slate-500">S/N: {asset.serialNumber}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{asset.assetType}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {asset.brand} / {asset.model}
                        </td>
                        <td className="px-4 py-3">
                          {asset.currentAssignment ? (
                            <div>
                              <div className="font-medium text-slate-800">{asset.currentAssignment.employeeName}</div>
                              <div className="text-[10px] text-slate-500">{asset.currentAssignment.employeeId}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {asset.currentAssignment?.department || asset.department || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{asset.campus}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-medium ${statusClasses[normalizedStatus] || 'bg-slate-100 text-slate-600'}`}>
                            {normalizedStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{formatDate(asset.assignmentDate)}</td>
                        <td className="px-4 py-3 text-center">
                          {normalizedStatus === 'Assigned' ? (
                            <button
                              onClick={() => setSelectedAssetForReturn(asset)}
                              className="rounded-md bg-slate-800 px-3 py-1.5 text-[10px] font-medium text-white transition hover:bg-slate-900"
                            >
                              View
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">Verified</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="10" className="px-4 py-10 text-center text-sm text-slate-500">
                      No ICT asset records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
            <div>Showing 1 to {Math.min(filteredAssets.length, 10)} of {filteredAssets.length} entries</div>
            <div className="flex items-center gap-2">
              <button className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-500">Previous</button>
              <button className="rounded-md bg-blue-600 px-2 py-1 text-white">1</button>
              <button className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600">2</button>
              <button className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600">3</button>
              <button className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-500">Next</button>
            </div>
          </div>
        </div>
      </div>

      {selectedAssetForReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-800">Process Asset Return</h3>
            <p className="mt-1 text-[11px] text-slate-500">Confirm hardware details before updating ICT clearance state.</p>

            <form onSubmit={handleReturnConfirm} className="mt-5 space-y-4 text-[11px]">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">Condition at Return</label>
                <select
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 outline-none focus:border-blue-400"
                >
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Accessories Returned</label>
                <div className="flex flex-wrap gap-3">
                  {['charger', 'bag', 'mouse'].map((item) => (
                    <label key={item} className="inline-flex items-center gap-2 text-slate-600">
                      <input
                        type="checkbox"
                        checked={accessories[item]}
                        onChange={(e) => setAccessories({ ...accessories, [item]: e.target.checked })}
                      />
                      {item.charAt(0).toUpperCase() + item.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Remarks</label>
                <textarea
                  rows={3}
                  value={returnRemarks}
                  onChange={(e) => setReturnRemarks(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 outline-none focus:border-blue-400"
                  placeholder="Optional verification remarks..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAssetForReturn(null)}
                  className="rounded-lg px-4 py-2 text-slate-600 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700"
                >
                  Confirm Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}