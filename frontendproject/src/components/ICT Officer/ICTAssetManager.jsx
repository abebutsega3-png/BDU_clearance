import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/authContext';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  Download,
  Filter,
  Menu,
  PackageCheck,
  Plus,
  Search,
  X,
  Tag,
  Barcode,
  Laptop,
  Box,
  Users,
  Building2,
  MapPin,
  CalendarDays,
  Wrench,
  CircleDot,
  Wifi,
  FileText,
  Save,
} from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000')
  .replace(/\/api\/clearance\/?$/i, '')
  .replace(/\/api\/?$/i, '')
  .replace(/\/+$/, '');

const tabItems = [
  { key: 'all', label: 'All Assets' },
  { key: 'assigned', label: 'Assigned Assets' },
  { key: 'returned', label: 'Returned Assets' },
  { key: 'outstanding', label: 'Outstanding Assets' },
];

const assetTypes = [
  'Laptop',
  'Desktop Computer',
  'Monitor',
  'Printer',
  'Tablet',
  'Mobile Phone',
  'Projector',
  'Keyboard',
  'Mouse',
  'UPS',
  'Network Device',
  'IP Phone',
  'Other ICT Equipment',
];

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const emptyAssetForm = {
  assetId: '',
  serialNumber: '',
  assetName: '',
  assetType: 'Laptop',
  brand: '',
  model: '',
  campus: '',
  location: 'ICT Office',
  condition: 'Good',
  purchaseDate: '',
  assetStatus: 'Assigned',
  assignedDate: today(),
  returnDueDate: '',
  domainAccessGranted: false,
  remarks: '',
};

const assetInputClass = 'mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const assetLabelClass = 'block text-[11px] font-semibold text-slate-700';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function ICTAssetManager() {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [newAsset, setNewAsset] = useState(emptyAssetForm);
  const [employees, setEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [employeeLoadError, setEmployeeLoadError] = useState('');
  const [isSavingAsset, setIsSavingAsset] = useState(false);
  const [assetFormError, setAssetFormError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetForReturn, setSelectedAssetForReturn] = useState(null);
  const [accessories, setAccessories] = useState({ charger: true, bag: true, mouse: true });
  const [returnRemarks, setReturnRemarks] = useState('');
  const [returnActionError, setReturnActionError] = useState('');
  const [isProcessingReturn, setIsProcessingReturn] = useState(false);
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

  const loadEmployees = async () => {
    setEmployeeLoadError('');
    setIsLoadingEmployees(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/employee`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      if (!response.ok || !data.success || !Array.isArray(data.employees)) {
        throw new Error(data.message || 'Unable to load employees.');
      }
      setEmployees(data.employees.filter((employee) => employee.status === 'Active'));
    } catch (error) {
      console.error('Failed to load employees for ICT asset assignment:', error);
      setEmployeeLoadError(error.message || 'Unable to load employees. Please retry.');
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const openAddAssetModal = () => {
    setAssetFormError('');
    setEmployeeSearch('');
    setSelectedEmployee(null);
    setNewAsset({ ...emptyAssetForm, assignedDate: today() });
    setIsAddAssetOpen(true);
    loadEmployees();
  };

  const matchingEmployees = employees
    .filter((employee) => `${employee.fullName} ${employee.employeeId}`.toLowerCase().includes(employeeSearch.trim().toLowerCase()))
    .slice(0, 8);

  const handleAddAsset = async (event) => {
    event.preventDefault();
    setAssetFormError('');
    if (newAsset.assetStatus === 'Assigned' && !selectedEmployee) {
      setAssetFormError('Select an employee before registering the asset as assigned.');
      return;
    }
    setIsSavingAsset(true);

    try {
      const response = await fetch(`${API_BASE}/api/ict-assets/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAsset,
          assetId: newAsset.assetId.trim(),
          serialNumber: newAsset.serialNumber.trim(),
          assetName: newAsset.assetName.trim(),
          brand: newAsset.brand.trim(),
          model: newAsset.model.trim(),
          notes: newAsset.remarks.trim(),
          campus: selectedEmployee?.campus || newAsset.campus.trim(),
          location: newAsset.location.trim(),
          purchaseDate: newAsset.purchaseDate || undefined,
          assignment: newAsset.assetStatus === 'Assigned' ? {
            employeeId: selectedEmployee.employeeId,
            employeeName: selectedEmployee.fullName,
            department: selectedEmployee.department,
            campus: selectedEmployee.campus,
            assignedDate: newAsset.assignedDate,
            returnDueDate: newAsset.returnDueDate || undefined,
            domainAccessGranted: newAsset.domainAccessGranted,
            remarks: newAsset.remarks.trim(),
          } : undefined,
          performedBy: user?.name || 'ICT Officer',
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'Unable to add the asset.');
      }

      setAssets((currentAssets) => [data.data, ...currentAssets]);
      setNewAsset({ ...emptyAssetForm, assignedDate: today() });
      setSelectedEmployee(null);
      setIsAddAssetOpen(false);
    } catch (error) {
      console.error('Failed to add ICT asset:', error);
      setAssetFormError(error.message || 'Unable to add the asset. Please try again.');
    } finally {
      setIsSavingAsset(false);
    }
  };

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
      item.assetName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${item.brand} ${item.model}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.currentAssignment?.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.currentAssignment?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = assetTypeFilter === 'All Types' || item.assetType === assetTypeFilter;
    const matchesStatus = statusFilter === 'All Statuses' || normalizedStatus === statusFilter;
    const matchesDepartment =
      departmentFilter === 'All Departments' || item.department === departmentFilter || item.currentAssignment?.department === departmentFilter;

    return matchesTab && matchesSearch && matchesType && matchesStatus && matchesDepartment;
  });

  const handleReturnConfirm = async (e, conditionAtReturn) => {
    e?.preventDefault();
    if (!selectedAssetForReturn) return;

    try {
      setIsProcessingReturn(true);
      setReturnActionError('');
      const res = await fetch(`${API_BASE}/api/ict-assets/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedAssetForReturn.assetId,
          conditionAtReturn,
          accessoriesReturned: accessories,
          remarks: returnRemarks,
          processedBy: user?.name || 'ICT Officer',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Unable to update the asset status.');
      }

      setSelectedAssetForReturn(null);
      setReturnRemarks('');
      fetchAssets();
    } catch (error) {
      console.error('Failed to record ICT asset action:', error);
      setReturnActionError(error.message || 'Unable to update the asset status.');
    } finally {
      setIsProcessingReturn(false);
    }
  };

  const statusClasses = {
    Assigned: 'bg-amber-100 text-amber-800',
    Returned: 'bg-emerald-100 text-emerald-800',
    Available: 'bg-sky-100 text-sky-700',
    'Under Maintenance': 'bg-orange-100 text-orange-800',
    'Under Repair': 'bg-orange-100 text-orange-800',
    Damaged: 'bg-red-100 text-red-700',
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
            <button
              type="button"
              onClick={openAddAssetModal}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus size={15} />
              Add New Asset
            </button>
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
                    {assetTypes.map((type) => <option key={type}>{type}</option>)}
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
                    <option>Under Maintenance</option>
                    <option>Under Repair</option>
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
                          <div className="font-medium text-slate-800">{asset.assetName || `${asset.brand} ${asset.model}`.trim()}</div>
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
                        <td className="px-4 py-3 text-slate-700">{formatDate(asset.currentAssignment?.assignedDate || asset.assignmentDate)}</td>
                        <td className="px-4 py-3 text-center">
                          {normalizedStatus === 'Assigned' ? (
                            <button
                              onClick={() => {
                                setReturnActionError('');
                                setReturnRemarks('');
                                setSelectedAssetForReturn(asset);
                              }}
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

      {isAddAssetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6">
          <div className="my-auto max-h-[95vh] w-full max-w-5xl overflow-hidden rounded-lg border border-slate-300 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-3 text-white sm:px-5">
              <h2 className="flex items-center gap-3 text-base font-bold sm:text-lg">
                <Plus size={21} strokeWidth={3} />
                Add Asset / Assign Asset
              </h2>
              <button type="button" aria-label="Close add asset form" onClick={() => setIsAddAssetOpen(false)} className="rounded p-1 text-white/90 transition hover:bg-white/15 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddAsset} className="max-h-[calc(95vh-52px)] space-y-3 overflow-y-auto p-3 sm:p-4">
              {assetFormError && (
                <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {assetFormError}
                </p>
              )}

              <section className="overflow-visible rounded-md border border-blue-200">
                <h3 className="flex items-center gap-2 rounded-t-md bg-blue-50 px-3 py-2 text-sm font-bold text-blue-950">
                  <Laptop size={18} className="text-blue-700" /> 1. Asset Information
                </h3>
                <div className="grid gap-x-5 gap-y-3 p-3 md:grid-cols-3">
                  <label className={assetLabelClass}>
                    Asset ID / Tag Number <span className="text-red-600">*</span>
                    <span className="relative block">
                      <Tag size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input required value={newAsset.assetId} onChange={(event) => setNewAsset({ ...newAsset, assetId: event.target.value })} placeholder="BDU-ICT-LAP-042" className={`${assetInputClass} pl-9`} />
                    </span>
                    <span className="mt-1 block font-normal text-slate-500">e.g. BDU-ICT-LAP-042</span>
                  </label>
                  <label className={assetLabelClass}>
                    Serial Number <span className="text-red-600">*</span>
                    <span className="relative block">
                      <Barcode size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input required value={newAsset.serialNumber} onChange={(event) => setNewAsset({ ...newAsset, serialNumber: event.target.value })} placeholder="SN: 5CD1234XYZ" className={`${assetInputClass} pl-9`} />
                    </span>
                    <span className="mt-1 block font-normal text-slate-500">e.g. SN: 5CD1234XYZ</span>
                  </label>
                  <label className={assetLabelClass}>
                    Asset Name <span className="text-red-600">*</span>
                    <span className="relative block">
                      <Laptop size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input required value={newAsset.assetName} onChange={(event) => setNewAsset({ ...newAsset, assetName: event.target.value })} placeholder={'HP EliteBook 840 G8'} className={`${assetInputClass} pl-9`} />
                    </span>
                    <span className="mt-1 block font-normal text-slate-500">e.g. HP EliteBook 840 G8, Dell Monitor</span>
                  </label>
                  <label className={assetLabelClass}>
                    Asset Category / Type <span className="text-red-600">*</span>
                    <span className="relative block">
                      <Box size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <select required value={newAsset.assetType} onChange={(event) => setNewAsset({ ...newAsset, assetType: event.target.value })} className={`${assetInputClass} appearance-none pl-9`}>
                        {assetTypes.map((type) => <option key={type}>{type}</option>)}
                      </select>
                      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    </span>
                  </label>
                  <div className={`${assetLabelClass} relative`}>
                    Brand / Model <span className="text-red-600">*</span>
                    <div className="mt-1 flex overflow-hidden rounded border border-slate-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                      <span className="flex items-center border-r border-slate-300 bg-slate-50 px-2 text-slate-500"><Tag size={14} /></span>
                      <input required aria-label="Asset brand" value={newAsset.brand} onChange={(event) => setNewAsset({ ...newAsset, brand: event.target.value })} placeholder="Brand" className="min-w-0 w-2/5 px-2 py-2 text-xs font-normal outline-none" />
                      <span className="flex items-center border-x border-slate-200 px-2 text-slate-400">/</span>
                      <input required aria-label="Asset model" value={newAsset.model} onChange={(event) => setNewAsset({ ...newAsset, model: event.target.value })} placeholder="Model" className="min-w-0 flex-1 px-2 py-2 text-xs font-normal outline-none" />
                    </div>
                  </div>
                  {newAsset.assetStatus !== 'Assigned' && (
                    <label className={assetLabelClass}>
                      Campus <span className="text-red-600">*</span>
                      <span className="relative block">
                        <MapPin size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input required value={newAsset.campus} onChange={(event) => setNewAsset({ ...newAsset, campus: event.target.value })} placeholder="Main Campus" className={`${assetInputClass} pl-9`} />
                      </span>
                    </label>
                  )}
                </div>
              </section>

              {newAsset.assetStatus === 'Assigned' && (
                <section className="overflow-visible rounded-md border border-emerald-200">
                  <h3 className="flex items-center gap-2 rounded-t-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-950">
                    <Users size={18} className="text-emerald-700" /> 2. Employee Assignment Details
                  </h3>
                  <div className="grid gap-x-5 gap-y-3 p-3 md:grid-cols-3">
                    <div className={assetLabelClass}>
                      <label htmlFor="ict-employee-search">Assign To Employee <span className="text-red-600">*</span></label>
                      <div className="relative mt-1">
                        <Users size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          id="ict-employee-search"
                          type="search"
                          value={selectedEmployee ? `${selectedEmployee.fullName} (${selectedEmployee.employeeId})` : employeeSearch}
                          onChange={(event) => {
                            setSelectedEmployee(null);
                            setEmployeeSearch(event.target.value);
                          }}
                          placeholder="Search by name or BDU ID"
                          autoComplete="off"
                          className={`${assetInputClass} pl-9`}
                        />
                      </div>
                      <span className="mt-1 block font-normal text-slate-500">Search by name or BDU ID</span>
                      {employeeLoadError ? (
                        <p role="alert" className="mt-1 flex items-center justify-between font-normal text-red-700">
                          {employeeLoadError}
                          <button type="button" onClick={loadEmployees} className="ml-2 font-semibold underline">Retry</button>
                        </p>
                      ) : isLoadingEmployees ? (
                        <p className="mt-1 font-normal text-slate-500">Loading employees...</p>
                      ) : !selectedEmployee && employeeSearch.trim() ? (
                        <div className="absolute z-20 mt-1 max-h-40 w-[min(28rem,85vw)] overflow-y-auto rounded border border-slate-200 bg-white font-normal shadow-lg">
                          {matchingEmployees.length ? matchingEmployees.map((employee) => (
                            <button
                              type="button"
                              key={employee.employeeId}
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setEmployeeSearch('');
                                setNewAsset((current) => ({ ...current, campus: employee.campus || current.campus }));
                              }}
                              className="block w-full px-3 py-2 text-left text-xs hover:bg-blue-50"
                            >
                              <span className="font-semibold text-slate-800">{employee.fullName}</span>
                              <span className="ml-2 text-slate-500">{employee.employeeId}</span>
                            </button>
                          )) : <p className="px-3 py-2 text-xs text-slate-500">No active employees found.</p>}
                        </div>
                      ) : null}
                    </div>
                    <label className={assetLabelClass}>
                      Department <span className="text-red-600">*</span>
                      <span className="relative block">
                        <Building2 size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input required readOnly value={selectedEmployee?.department || ''} placeholder="Auto-filled from employee profile" className={`${assetInputClass} pl-9 read-only:bg-slate-50`} />
                      </span>
                      <span className="mt-1 block font-normal text-slate-500">(Auto-filled from employee profile)</span>
                    </label>
                    <label className={assetLabelClass}>
                      Campus <span className="text-red-600">*</span>
                      <span className="relative block">
                        <MapPin size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input required readOnly={Boolean(selectedEmployee)} value={selectedEmployee?.campus || newAsset.campus} onChange={(event) => setNewAsset({ ...newAsset, campus: event.target.value })} placeholder="Auto-filled from employee profile" className={`${assetInputClass} pl-9 read-only:bg-slate-50`} />
                      </span>
                      <span className="mt-1 block font-normal text-slate-500">(Auto-filled from employee profile)</span>
                    </label>
                    <label className={assetLabelClass}>
                      Assignment Date <span className="text-red-600">*</span>
                      <span className="relative block">
                        <CalendarDays size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input required type="date" value={newAsset.assignedDate} onChange={(event) => setNewAsset({ ...newAsset, assignedDate: event.target.value })} className={`${assetInputClass} pl-9`} />
                      </span>
                    </label>
                    <label className={assetLabelClass}>
                      Return / Renewal Due Date <span className="text-red-600">*</span>
                      <span className="relative block">
                        <CalendarDays size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input required type="date" min={newAsset.assignedDate} value={newAsset.returnDueDate} onChange={(event) => setNewAsset({ ...newAsset, returnDueDate: event.target.value })} className={`${assetInputClass} pl-9`} />
                      </span>
                    </label>
                  </div>
                </section>
              )}

              <section className="overflow-hidden rounded-md border border-violet-200">
                <h3 className="flex items-center gap-2 rounded-t-md bg-violet-50 px-3 py-2 text-sm font-bold text-violet-950">
                  <Wrench size={18} className="text-violet-700" /> 3. Condition &amp; System Status
                </h3>
                <div className="grid gap-x-5 gap-y-3 p-3 md:grid-cols-3">
                  <label className={assetLabelClass}>
                    Initial Condition <span className="text-red-600">*</span>
                    <span className="relative block">
                      <Wrench size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <select required value={newAsset.condition} onChange={(event) => setNewAsset({ ...newAsset, condition: event.target.value })} className={`${assetInputClass} appearance-none pl-9`}>
                        {['New', 'Good', 'Fair', 'Refurbished', 'Damaged', 'Lost'].map((condition) => <option key={condition}>{condition}</option>)}
                      </select>
                      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    </span>
                  </label>
                  <label className={assetLabelClass}>
                    Status <span className="text-red-600">*</span>
                    <span className="relative block">
                      <CircleDot size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <select required value={newAsset.assetStatus} onChange={(event) => {
                        setNewAsset({ ...newAsset, assetStatus: event.target.value });
                        if (event.target.value !== 'Assigned') setSelectedEmployee(null);
                      }} className={`${assetInputClass} appearance-none pl-9`}>
                        <option value="Assigned">Assigned</option>
                        <option value="Available">Available</option>
                        <option value="Under Maintenance">Under Maintenance</option>
                      </select>
                      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    </span>
                  </label>
                  <div className="flex items-center gap-3 pt-2 md:pt-5">
                    <Wifi size={18} className="shrink-0 text-slate-500" />
                    <label className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-slate-700">
                      <input type="checkbox" checked={newAsset.domainAccessGranted} onChange={(event) => setNewAsset({ ...newAsset, domainAccessGranted: event.target.checked })} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      Yes, Campus Wi-Fi and University Email Access Granted
                    </label>
                  </div>
                  <label className={`${assetLabelClass} md:col-span-3`}>
                    <span className="flex items-center gap-2"><FileText size={14} /> Remarks / Notes</span>
                    <textarea rows={2} maxLength={500} value={newAsset.remarks} onChange={(event) => setNewAsset({ ...newAsset, remarks: event.target.value })} placeholder="e.g. 16GB RAM, 512GB SSD, Intel i5, Good condition. Additional notes, terms, or special instructions..." className={`${assetInputClass} resize-y`} />
                    <span className="block text-right font-normal text-slate-500">{newAsset.remarks.length}/500</span>
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2 md:col-span-3">
                    {newAsset.assetStatus !== 'Assigned' && (
                      <label className={assetLabelClass}>
                        Location
                        <span className="relative block">
                          <MapPin size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input value={newAsset.location} onChange={(event) => setNewAsset({ ...newAsset, location: event.target.value })} className={`${assetInputClass} pl-9`} />
                        </span>
                      </label>
                    )}
                    <label className={assetLabelClass}>
                      Purchase Date
                      <span className="relative block">
                        <CalendarDays size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input type="date" value={newAsset.purchaseDate} onChange={(event) => setNewAsset({ ...newAsset, purchaseDate: event.target.value })} className={`${assetInputClass} pl-9`} />
                      </span>
                    </label>
                  </div>
                </div>
              </section>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setIsAddAssetOpen(false)} className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                  <X size={14} /> Cancel
                </button>
                <button type="submit" disabled={isSavingAsset} className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                  <Save size={14} />
                  {isSavingAsset ? 'Saving...' : 'Save Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedAssetForReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-sky-100 bg-sky-50 px-5 py-3">
              <h3 className="text-base font-bold text-sky-900">Asset Details &amp; Action</h3>
              <button type="button" onClick={() => setSelectedAssetForReturn(null)} aria-label="Close asset details" className="rounded p-1 text-slate-500 hover:bg-white hover:text-slate-800">
                <X size={17} />
              </button>
            </div>
            <div className="p-5">
              <p className="text-[11px] text-slate-500">Check the asset and select the appropriate action to update the ICT inventory.</p>

              <dl className="mt-4 grid gap-x-5 gap-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs sm:grid-cols-2">
                <div><dt className="text-slate-500">Asset Name</dt><dd className="mt-0.5 font-semibold text-slate-800">{selectedAssetForReturn.assetName || `${selectedAssetForReturn.brand} ${selectedAssetForReturn.model}`.trim()}</dd></div>
                <div><dt className="text-slate-500">Asset ID</dt><dd className="mt-0.5 font-semibold text-slate-800">{selectedAssetForReturn.assetId}</dd></div>
                <div><dt className="text-slate-500">Serial Number</dt><dd className="mt-0.5 font-semibold text-slate-800">{selectedAssetForReturn.serialNumber || 'Not recorded'}</dd></div>
                <div><dt className="text-slate-500">Assigned To</dt><dd className="mt-0.5 font-semibold text-slate-800">{selectedAssetForReturn.currentAssignment?.employeeName || 'Not recorded'}</dd></div>
              </dl>

              <form onSubmit={(event) => handleReturnConfirm(event, 'Good')} className="mt-5 space-y-4 text-[11px]">

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

              {returnActionError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{returnActionError}</p>}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedAssetForReturn(null)}
                  disabled={isProcessingReturn}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <div className="flex flex-wrap justify-end gap-2">
                  <button type="submit" disabled={isProcessingReturn} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">
                    <CheckCircle2 size={14} />{isProcessingReturn ? 'Processing...' : 'Confirm Return'}
                  </button>
                  <button type="button" disabled={isProcessingReturn} onClick={() => handleReturnConfirm(null, 'Damaged')} className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60">
                    <AlertTriangle size={14} />Report Damaged
                  </button>
                  <button type="button" disabled={isProcessingReturn} onClick={() => handleReturnConfirm(null, 'Lost')} className="inline-flex items-center gap-1.5 rounded-md bg-rose-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-800 disabled:cursor-wait disabled:opacity-60">
                    Report Lost
                  </button>
                </div>
              </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}