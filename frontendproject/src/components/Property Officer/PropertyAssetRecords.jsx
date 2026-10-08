import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { usePropertyLanguage } from './propertyLanguage';
import { useAuth } from '../../context/authContext';
import {
  Search,
  Eye,
  Boxes,
  Loader2,
  PackageCheck,
  Plus,
  Pencil,
  RotateCcw,
  X,
  Save,
  MapPin,
  AlertCircle,
  Info,
  Tag,
  UserRound
} from 'lucide-react';

const EMPTY_ASSET_FORM = {
  assetId: '',
  assetName: '',
  assetType: 'Electronics',
  category: 'Electronics',
  serialNumber: '',
  handoverVoucher: '',
  model: '',
  employeeName: '',
  employeeId: '',
  department: '',
  campus: 'Main Campus',
  location: '',
  purchaseDate: '',
  purchaseValue: '',
  status: 'Available',
  condition: 'Good',
  remarks: ''
};

const DEFAULT_ASSET_STATUSES = ['Available', 'Assigned', 'Outstanding', 'Damaged', 'Lost', 'Under Maintenance'];
const ASSET_TYPES = ['Laptop', 'Desktop', 'Printer', 'Monitor', 'Furniture', 'Vehicle', 'Other'];
const normalizeEmployeeId = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function AssetField({ label, required = false, children }) {
  const childClasses = children.props.className?.replace('asset-input', '') || '';
  return (
    <label className="block space-y-1 text-[10px] font-semibold text-slate-600">
      <span>{label}{required && <span className="text-rose-600"> *</span>}</span>
      {React.cloneElement(children, {
        className: `w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 ${childClasses}`.trim()
      })}
    </label>
  );
}

export default function AssetRecords() {
  const { t } = usePropertyLanguage();
  const { logout } = useAuth();
  const [searchParams] = useSearchParams();
  const selectedEmployeeId = searchParams.get('employeeId') || '';
  const selectedRequestId = searchParams.get('requestId') || '';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [assets, setAssets] = useState([]);

  const [searchTerm, setSearchTerm] = useState(selectedEmployeeId);
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [filterOptions, setFilterOptions] = useState({ assetTypes: [], departments: [], campuses: [] });
  const [configuredCategories, setConfiguredCategories] = useState([]);
  const [configuredStatuses, setConfiguredStatuses] = useState([]);

  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetHistory, setAssetHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState('');
  const [assetForm, setAssetForm] = useState(EMPTY_ASSET_FORM);
  const [savingAsset, setSavingAsset] = useState(false);
  const [formError, setFormError] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employeeLoadError, setEmployeeLoadError] = useState('');
  const [employeeAuthExpired, setEmployeeAuthExpired] = useState(false);
  const [employeeLookupAttempted, setEmployeeLookupAttempted] = useState(false);
  const employeeLookupStarted = useRef(false);
  const [assignmentEnabled, setAssignmentEnabled] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeeResults, setShowEmployeeResults] = useState(false);
  const [activeEmployeeResult, setActiveEmployeeResult] = useState(0);
  const [pendingReturnAsset, setPendingReturnAsset] = useState(null);
  const [returningAssetId, setReturningAssetId] = useState('');
  const [actionError, setActionError] = useState('');

  const fetchAssetRecords = useCallback(async () => {
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
      setLoadError('');
      setFilterOptions({
        assetTypes: res.data?.filters?.assetTypes || [],
        departments: res.data?.filters?.departments || [],
        campuses: res.data?.filters?.campuses || []
      });
    } catch (err) {
      console.error('Error fetching asset records:', err);
      setAssets([]);
      setLoadError(err.response?.data?.message || 'Unable to load property asset records. Check the server connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedEmployeeId]);

  useEffect(() => {
    setSearchTerm(selectedEmployeeId);
  }, [selectedEmployeeId]);

  useEffect(() => {
    fetchAssetRecords();
  }, [fetchAssetRecords]);

  useEffect(() => {
    let active = true;
    const fetchAssetSettings = async () => {
      try {
        const response = await axios.get('/api/property/profile/me', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
        });
        const settings = response.data?.profile?.propertySettings || {};
        if (!active) return;
        setConfiguredCategories(Array.isArray(settings.assetCategories) ? settings.assetCategories : []);
        setConfiguredStatuses(Array.isArray(settings.assetStatuses) ? settings.assetStatuses : []);
      } catch (error) {
        console.error('Unable to load configured asset categories and statuses:', error);
        if (active) setSettingsError(error.response?.data?.message || 'Unable to load configured asset settings.');
      }
    };
    fetchAssetSettings();
    return () => { active = false; };
  }, []);

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

  const openAssetForm = (asset = null) => {
    setFormError('');
    setActionError('');
    setEditingAssetId(asset?.assetId || '');
    setEmployeeLoadError('');
    setEmployeeAuthExpired(false);
    setEmployeeLookupAttempted(false);
    employeeLookupStarted.current = false;
    setEmployeeSearch(asset?.employeeId && asset.employeeId !== 'N/A' ? asset.employeeId : '');
    setShowEmployeeResults(false);
    setAssignmentEnabled(Boolean(asset?.employeeId && asset.employeeId !== 'N/A'));
    const defaultCategory = configuredCategories.find((item) => item.enabled !== false)?.name || filterOptions.assetTypes[0] || 'Electronics';
    setAssetForm(asset ? {
      ...EMPTY_ASSET_FORM,
      ...asset,
      assetId: asset.assetId || '',
      assetType: asset.assetType || asset.category || 'General Equipment',
      category: asset.category || asset.assetType || 'General Equipment',
      purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().slice(0, 10) : '',
      purchaseValue: asset.purchaseValue ? String(asset.purchaseValue) : '',
      assignedDate: asset.assignedDate ? new Date(asset.assignedDate).toISOString().slice(0, 10) : ''
    } : {
      ...EMPTY_ASSET_FORM,
      assetId: `BDU-PA-${globalThis.crypto?.randomUUID?.().slice(0, 8).toUpperCase() || Date.now().toString(36).toUpperCase()}`,
      category: defaultCategory,
      assetType: 'Laptop'
    });
    setIsAssetFormOpen(true);
  };

  useEffect(() => {
    if (!isAssetFormOpen || !assignmentEnabled || employeeLookupStarted.current) return;
    let active = true;
    employeeLookupStarted.current = true;
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      setEmployeeLoadError('');
      try {
        const response = await axios.get('http://localhost:3000/api/employee', {
          headers: { Authorization: `******'token') || ''}` },
          suppressAutomaticLogout: true
        });
        const records = Array.isArray(response.data?.employees) ? response.data.employees : [];
        if (!active) return;
        setEmployees(records);
      } catch (error) {
        console.error('Unable to load employees for asset assignment:', error);
        if (active && error.response?.status === 401) {
          setEmployeeAuthExpired(true);
          setEmployeeLoadError(t(
            'Your session expired. Sign in again to search employees.',
            'የመግቢያ ጊዜዎ አብቅቷል። ሰራተኞችን ለመፈለግ እንደገና ይግቡ።'
          ));
        } else if (active) {
          setEmployeeLoadError(error.response?.data?.message || t('Unable to load employees. Please retry.', 'ሰራተኞችን መጫን አልተቻለም። እንደገና ይሞክሩ።'));
        }
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
    return () => { active = false; };
  }, [isAssetFormOpen, assignmentEnabled, employeeLookupAttempted, logout, t]);

  const matchingEmployees = employees.filter((employee) => {
    const term = employeeSearch.trim().toLowerCase();
    if (!term) return true;
    const normalizedTerm = normalizeEmployeeId(term);
    return String(employee.employeeId || '').toLowerCase().includes(term)
      || (normalizedTerm && normalizeEmployeeId(employee.employeeId).includes(normalizedTerm))
      || String(employee.fullName || '').toLowerCase().includes(term)
      || String(employee.department || '').toLowerCase().includes(term);
  }).sort((left, right) => {
    const query = normalizeEmployeeId(employeeSearch);
    if (!query) return 0;
    const leftId = normalizeEmployeeId(left.employeeId);
    const rightId = normalizeEmployeeId(right.employeeId);
    const rank = (id) => id === query ? 0 : id.startsWith(query) ? 1 : id.includes(query) ? 2 : 3;
    return rank(leftId) - rank(rightId)
      || String(left.employeeId || '').localeCompare(String(right.employeeId || ''));
  });
  const visibleEmployeeResults = matchingEmployees.slice(0, 8);

  const selectEmployee = (employee) => {
    setAssetForm((form) => ({
      ...form,
      employeeId: employee.employeeId,
      employeeName: employee.fullName,
      department: employee.department || employee.departmentName || '',
      status: 'Assigned'
    }));
    setEmployeeSearch(employee.employeeId);
    setShowEmployeeResults(false);
    setActiveEmployeeResult(0);
  };

  const handleEmployeeSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      setShowEmployeeResults(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setShowEmployeeResults(true);
      setActiveEmployeeResult((index) => Math.min(index + 1, Math.max(0, visibleEmployeeResults.length - 1)));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveEmployeeResult((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === 'Enter' && showEmployeeResults) {
      event.preventDefault();
      if (visibleEmployeeResults[activeEmployeeResult]) selectEmployee(visibleEmployeeResults[activeEmployeeResult]);
    }
  };

  const handleSaveAsset = async (event) => {
    event.preventDefault();
    setFormError('');
    const purchaseValue = assetForm.purchaseValue === '' ? 0 : Number(assetForm.purchaseValue);
    if (!Number.isFinite(purchaseValue) || purchaseValue < 0) {
      setFormError(t('Purchase value must be zero or greater.', 'የግዢ ዋጋ ዜሮ ወይም ከዚያ በላይ መሆን አለበት።'));
      return;
    }
    if (assetForm.employeeId.trim() && !assetForm.employeeName.trim()) {
      setFormError(t('Enter the assigned employee name, or clear the employee ID.', 'የተመደበውን የሰራተኛ ስም ያስገቡ ወይም የሰራተኛ መለያ ቁጥሩን ያጥፉ።'));
      return;
    }
    if (assignmentEnabled && !employees.some((employee) => employee.employeeId === assetForm.employeeId.trim())) {
      setFormError(t('Select a valid employee from the employee list.', 'ከሰራተኞች ዝርዝር ትክክለኛ ሰራተኛ ይምረጡ።'));
      return;
    }
    if (!String(assetForm.assetId || '').trim()) {
      setFormError(t('Asset tag / property code is required.', 'የንብረት መለያ / ኮድ ያስፈልጋል።'));
      return;
    }

    setSavingAsset(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...assetForm,
        assetId: assetForm.assetId.trim(),
        purchaseValue,
        purchaseDate: assetForm.purchaseDate || null,
        employeeName: assignmentEnabled ? assetForm.employeeName.trim() : 'Unknown Employee',
        employeeId: assignmentEnabled ? assetForm.employeeId.trim() : 'N/A',
        department: assignmentEnabled ? assetForm.department.trim() || 'N/A' : 'N/A',
        status: assignmentEnabled ? 'Assigned' : assetForm.status === 'Assigned' ? 'Available' : assetForm.status
      };
      const response = editingAssetId
        ? await axios.patch(`http://localhost:3000/api/property/dashboard/assets/${encodeURIComponent(editingAssetId)}`, payload, {
            headers: { Authorization: `Bearer ${token || ''}` }
          })
        : await axios.post('http://localhost:3000/api/property/dashboard/assets', payload, {
            headers: { Authorization: `Bearer ${token || ''}` }
          });
      const savedAsset = response.data?.asset;
      if (!savedAsset) throw new Error(t('The server did not return the saved asset.', 'አገልጋዩ የተመዘገበውን ንብረት አልመለሰም።'));
      setAssets((current) => editingAssetId
        ? current.map((asset) => asset.assetId === editingAssetId ? savedAsset : asset)
        : [savedAsset, ...current]);
      setIsAssetFormOpen(false);
      setAssetForm({ ...EMPTY_ASSET_FORM });
      setEditingAssetId('');
    } catch (err) {
      console.error('Unable to save property asset:', err);
      setFormError(err.response?.data?.message || err.message || t('Unable to save asset details.', 'የንብረቱን ዝርዝር ማስቀመጥ አልተቻለም።'));
    } finally {
      setSavingAsset(false);
    }
  };

  const handleReturnToStore = async () => {
    if (!pendingReturnAsset) return;
    setReturningAssetId(pendingReturnAsset.assetId);
    setActionError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `http://localhost:3000/api/property/dashboard/assets/${encodeURIComponent(pendingReturnAsset.assetId)}/return-to-store`,
        {},
        { headers: { Authorization: `Bearer ${token || ''}` } }
      );
      const savedAsset = response.data?.asset;
      if (!savedAsset) throw new Error(t('The server did not return the updated asset.', 'አገልጋዩ የተዘመነውን ንብረት አልመለሰም።'));
      setAssets((current) => current.map((asset) => asset.assetId === savedAsset.assetId ? savedAsset : asset));
      if (selectedAsset?.assetId === savedAsset.assetId) setSelectedAsset(savedAsset);
      setPendingReturnAsset(null);
    } catch (err) {
      console.error('Unable to return asset to store:', err);
      setActionError(err.response?.data?.message || err.message || t('Unable to return this asset to store.', 'ይህን ንብረት ወደ መጋዘን መመለስ አልተቻለም።'));
      setPendingReturnAsset(null);
    } finally {
      setReturningAssetId('');
    }
  };

  const summary = {
    total: assets.length,
    assigned: assets.filter((item) => ['assigned', 'outstanding'].includes(String(item.status || '').toLowerCase())).length,
    available: assets.filter((item) => ['available', 'returned'].includes(String(item.status || '').toLowerCase())).length,
    damaged: assets.filter((item) => String(item.status || '').toLowerCase() === 'damaged').length,
    lost: assets.filter((item) => String(item.status || '').toLowerCase() === 'lost').length,
    purchaseValue: assets.reduce((totalValue, item) => totalValue + (Number(item.purchaseValue) || 0), 0)
  };
  const formatCurrency = (value) => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)} ETB`;

  const filteredAssets = assets.filter((item) => {
    const searchable = [
      item.employeeName,
      item.employeeId,
      item.assetId,
      item.assetName,
      item.model,
      item.serialNumber,
      item.location
    ].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch =
      (!searchTerm || searchable.includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    const matchesType = typeFilter === 'All' || (item.category || item.assetType) === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status, inventoryStatus = status) => {
    const configuredColor = configuredStatuses.find((item) => item.name.toLowerCase() === String(inventoryStatus || '').toLowerCase())?.color;
    const colorClasses = {
      Blue: 'bg-blue-100 text-blue-800 border-blue-200',
      Green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      Red: 'bg-rose-100 text-rose-800 border-rose-200',
      Orange: 'bg-amber-100 text-amber-800 border-amber-200',
      Purple: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    if (configuredColor && colorClasses[configuredColor]) return colorClasses[configuredColor];
    switch (status) {
      case 'Assigned':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Returned':
      case 'Available':
      case 'New':
      case 'Good':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Outstanding':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Fair':
      case 'Under Maintenance':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Damaged':
      case 'Lost':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const employeeAssets = filteredAssets;
  const employeeSummary = employeeAssets.length > 0 ? employeeAssets[0] : null;
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-xs text-slate-500">
        <Loader2 className="animate-spin mr-2" size={18} />
        <span>{t('Loading property inventory...', 'የንብረት ዝርዝር በመጫን ላይ...')}</span>
      </div>
    );
  }

  return (
    <main className="min-h-screen space-y-4 bg-slate-50 p-4 text-xs text-slate-700 sm:p-5">
      <section className="flex flex-col justify-between gap-3 rounded-lg border border-teal-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Boxes className="shrink-0 text-teal-700" size={22} />
          <div>
            <h1 className="text-base font-bold text-slate-900">{t('Asset Records - Central Inventory Management', 'የንብረት መዝገቦች - ማዕከላዊ የንብረት አስተዳደር')}</h1>
            <p className="mt-0.5 text-[10px] text-slate-500">{t('Track university assets, assignments, condition, and purchase information.', 'የዩኒቨርሲቲውን ንብረቶች፣ ምደባዎች፣ ሁኔታ እና የግዢ መረጃ ይከታተሉ።')}</p>
          </div>
        </div>
        <button type="button" onClick={() => openAssetForm()} className="inline-flex items-center justify-center gap-2 self-start rounded-md bg-teal-700 px-3 py-2 font-semibold text-white shadow-sm hover:bg-teal-800 sm:self-auto">
          <Plus size={15} /> {t('Add New Asset', 'አዲስ ንብረት ጨምር')}
        </button>
      </section>

      {selectedEmployeeId && (
        <section className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sky-900">
          <span>{t('Clearance asset check for', 'የንብረት ማጣሪያ ለ')} <strong>{employeeSummary?.employeeName || t('Employee', 'ሰራተኛ')}</strong> ({selectedEmployeeId})</span>
          {selectedRequestId && <span className="text-[10px]">{t('Request:', 'ጥያቄ፡')} {selectedRequestId}</span>}
        </section>
      )}

      {loadError && (
        <p role="alert" className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700">
          <AlertCircle size={15} />           {loadError === 'Unable to load property asset records. Check the server connection and try again.' ? t(loadError, 'የንብረት መዝገቦችን መጫን አልተቻለም። የአገልጋዩን ግንኙነት ያረጋግጡና እንደገና ይሞክሩ።') : loadError}
          <button type="button" onClick={fetchAssetRecords} className="ml-auto font-semibold underline">{t('Retry', 'እንደገና ሞክር')}</button>
        </p>
      )}
      {settingsError && (
        <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
          {settingsError === 'Unable to load configured asset settings.' ? t(settingsError, 'የተዋቀሩትን የንብረት ቅንብሮች መጫን አልተቻለም።') : settingsError} {t('Using existing inventory values until settings can be loaded.', 'ቅንብሮች እስኪጫኑ ድረስ ያሉትን የንብረት እሴቶች በመጠቀም ላይ።')}
        </p>
      )}
      {actionError && (
        <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700">{actionError}</p>
      )}

      <section className="space-y-2">
        <h2 className="font-bold text-slate-800">{t('Summary', 'ማጠቃለያ')}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {[
            { label: t('Total Assets', 'ጠቅላላ ንብረቶች'), value: summary.total, color: 'border-slate-200 text-slate-900' },
            { label: t('Assigned', 'የተመደቡ'), value: summary.assigned, color: 'border-blue-200 text-blue-800' },
            { label: t('Available / In Store', 'ዝግጁ / በመጋዘን ውስጥ'), value: summary.available, color: 'border-emerald-200 text-emerald-800' },
            { label: t('Damaged', 'የተበላሹ'), value: summary.damaged, color: 'border-amber-200 text-amber-800' },
            { label: t('Lost / Write-off', 'የጠፉ / ከመዝገብ የተሰረዙ'), value: summary.lost, color: 'border-rose-200 text-rose-800' },
            { label: t('Total Value', 'ጠቅላላ ዋጋ'), value: formatCurrency(summary.purchaseValue), color: 'border-slate-200 text-slate-900' }
          ].map((card) => (
            <div key={card.label} className={`min-w-0 rounded-lg border bg-white p-3 shadow-sm ${card.color}`}>
              <p className="truncate text-[10px] font-semibold text-slate-500">{card.label}</p>
              <p className="mt-1 truncate text-base font-bold">{card.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <h2 className="font-bold text-slate-800">{t('Search & Filter', 'ፈልግ እና አጣራ')}</h2>
        <div className="grid gap-2 md:grid-cols-[minmax(220px,1.3fr)_minmax(180px,1fr)_minmax(180px,1fr)]">
          <label className="relative block">
            <span className="sr-only">{t('Search assets', 'ንብረቶችን ፈልግ')}</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="search"
              placeholder={t('Search assets (by name, ID, or employee)...', 'ንብረቶችን በስም፣ መለያ ወይም በሰራተኛ ፈልግ...')}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-[11px] outline-none focus:border-teal-500"
            />
          </label>
          <label>
            <span className="sr-only">{t('Asset category', 'የንብረት ምድብ')}</span>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[11px] outline-none focus:border-teal-500">
              <option value="All">{t('All Categories', 'ሁሉም ምድቦች')}</option>
              {[...new Set(['Electronics', 'Furniture', ...filterOptions.assetTypes, ...assets.map((asset) => asset.category || asset.assetType)].filter(Boolean))].map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">{t('Asset status', 'የንብረት ሁኔታ')}</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[11px] outline-none focus:border-teal-500">
              <option value="All">{t('All Statuses', 'ሁሉም ሁኔታዎች')}</option>
              {[...new Set([...DEFAULT_ASSET_STATUSES, 'Returned', ...configuredStatuses.map((item) => item.name)])].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2.5">
          <h2 className="flex items-center gap-2 font-bold text-slate-800"><PackageCheck size={15} className="text-teal-700" />{t('Assets Table', 'የንብረቶች ሰንጠረዥ')}</h2>
          <span className="text-[10px] text-slate-500">{t('Showing', 'ከ')} {filteredAssets.length} {t('of', 'ውስጥ')} {assets.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse text-left text-[10px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-slate-600">
                <th className="p-2 font-semibold">{t('BDU Asset ID', 'የBDU ንብረት መለያ')}</th>
                <th className="p-2 font-semibold">{t('Category', 'ምድብ')}</th>
                <th className="p-2 font-semibold">{t('Asset Name / Model', 'የንብረት ስም / ሞዴል')}</th>
                <th className="p-2 font-semibold">{t('Serial Number', 'ተከታታይ ቁጥር')}</th>
                <th className="p-2 font-semibold">{t('Assigned To', 'የተመደበለት')}</th>
                <th className="p-2 font-semibold">{t('Last Handover', 'የመጨረሻ ርክክብ')}</th>
                <th className="p-2 font-semibold">{t('Condition', 'ሁኔታ')}</th>
                <th className="p-2 font-semibold">{t('Location', 'ቦታ')}</th>
                <th className="p-2 font-semibold">{t('Purchase Date', 'የግዢ ቀን')}</th>
                <th className="p-2 text-right font-semibold">{t('Actions', 'ድርጊቶች')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssets.length === 0 ? (
                <tr><td colSpan="10" className="p-8 text-center text-slate-400">{assets.length ? t('No assets match the selected filters.', 'ከተመረጡት ማጣሪያዎች ጋር የሚዛመድ ንብረት የለም።') : t('No property assets have been registered yet.', 'ምንም የንብረት መዝገብ እስካሁን አልተመዘገበም።')}</td></tr>
              ) : filteredAssets.map((item) => (
                <tr key={item.assetId} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap p-2 font-mono font-semibold text-slate-700">{item.assetId}</td>
                  <td className="p-2">{item.category || item.assetType || 'General Equipment'}</td>
                  <td className="p-2">
                    <div className="font-semibold text-slate-800">{item.assetName}</div>
                    <div className="text-slate-500">{item.model || t('Model not recorded', 'ሞዴል አልተመዘገበም')}</div>
                  </td>
                  <td className="p-2 font-mono text-slate-600">{item.serialNumber || '—'}</td>
                  <td className="p-2">
                    <div>{item.employeeId && item.employeeId !== 'N/A' ? item.employeeName : t('In Store', 'በመጋዘን ውስጥ')}</div>
                    {item.employeeId && item.employeeId !== 'N/A' && <div className="text-slate-500">{item.employeeId}</div>}
                  </td>
                  <td className="whitespace-nowrap p-2 text-slate-600">{formatDate(item.assignedDate)}</td>
                  <td className="p-2">
                    <span className={`rounded border px-1.5 py-0.5 font-semibold ${getStatusBadge(item.condition || item.status, item.status)}`}>{item.condition || item.status || 'Good'}</span>
                  </td>
                  <td className="p-2 text-slate-600">{item.location || item.campus || '—'}</td>
                  <td className="whitespace-nowrap p-2 text-slate-600">{formatDate(item.purchaseDate)}</td>
                  <td className="p-2">
                    <div className="flex justify-end gap-1.5">
                      <button type="button" onClick={() => handleViewDetails(item)} title={t('View asset history', 'የንብረት ታሪክ አሳይ')} aria-label={t('View asset', 'ንብረት አሳይ') + ` ${item.assetName}`} className="rounded bg-slate-100 p-1.5 text-slate-700 hover:bg-slate-200"><Eye size={12} /></button>
                      <button type="button" onClick={() => openAssetForm(item)} className="inline-flex items-center gap-1 whitespace-nowrap rounded bg-teal-700 px-2 py-1.5 font-semibold text-white hover:bg-teal-800"><Pencil size={11} /> {t('Edit Details', 'ዝርዝሮችን አርትዕ')}</button>
                      {item.employeeId && item.employeeId !== 'N/A' && (
                        <button type="button" onClick={() => setPendingReturnAsset(item)} disabled={returningAssetId === item.assetId} className="inline-flex items-center gap-1 whitespace-nowrap rounded bg-rose-700 px-2 py-1.5 font-semibold text-white hover:bg-rose-800 disabled:opacity-50">
                          {returningAssetId === item.assetId ? <Loader2 className="animate-spin" size={11} /> : <RotateCcw size={11} />}
                          {t('Unassign / Return to Store', 'ከምደባ አንሳ / ወደ መጋዘን መልስ')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isAssetFormOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm">
          <form onSubmit={handleSaveAsset} className="max-h-[96vh] w-full max-w-5xl space-y-4 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="flex items-center gap-2 font-bold text-slate-900"><Boxes size={17} className="text-teal-700" />{editingAssetId ? t('Edit Asset Details', 'የንብረት ዝርዝሮችን አርትዕ') : t('Register New Asset', 'አዲስ ንብረት መዝግብ')}</h2>
                <p className="mt-0.5 pl-6 text-[10px] text-slate-500">{t('Add a new university asset to the property management system.', 'አዲስ የዩኒቨርሲቲ ንብረት ወደ ንብረት አስተዳደር ስርዓት ያስገቡ።')}</p>
              </div>
              <button type="button" onClick={() => setIsAssetFormOpen(false)} aria-label={t('Close asset form', 'የንብረት ቅጹን ዝጋ')} className="rounded p-1 text-slate-500 hover:bg-slate-100"><X size={17} /></button>
            </div>

            {formError && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-[11px] text-rose-700">{formError}</p>}

            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-xs font-bold text-teal-800"><Tag size={14} />{t('Basic Asset Information', 'መሰረታዊ የንብረት መረጃ')}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <AssetField label={t('Asset Tag / Property Code', 'የንብረት መለያ / ኮድ')} required>
                  <input required value={assetForm.assetId} disabled={Boolean(editingAssetId)} onChange={(event) => setAssetForm((form) => ({ ...form, assetId: event.target.value }))} className="asset-input disabled:bg-slate-100" />
                </AssetField>
                <AssetField label={t('Asset Name', 'የንብረት ስም')} required>
                  <input required value={assetForm.assetName} onChange={(event) => setAssetForm((form) => ({ ...form, assetName: event.target.value }))} placeholder={t('e.g. Dell Latitude 5520', 'ለምሳሌ፦ Dell Latitude 5520')} className="asset-input" />
                </AssetField>
                <AssetField label={t('Asset Category', 'የንብረት ምድብ')} required>
                  <select required value={assetForm.category} onChange={(event) => setAssetForm((form) => ({ ...form, category: event.target.value }))} className="asset-input">
                    {[...new Set([
                      ...configuredCategories.filter((item) => item.enabled !== false).map((item) => item.name),
                      ...(editingAssetId ? filterOptions.assetTypes : []),
                      ...(editingAssetId ? assets.map((asset) => asset.category || asset.assetType) : []),
                      assetForm.category
                    ].filter(Boolean))].map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </AssetField>
                <AssetField label={t('Asset Type', 'የንብረት አይነት')}>
                  <select value={assetForm.assetType} onChange={(event) => setAssetForm((form) => ({ ...form, assetType: event.target.value }))} className="asset-input">
                    {[...new Set([...ASSET_TYPES, assetForm.assetType].filter(Boolean))].map((value) => <option key={value}>{value}</option>)}
                  </select>
                </AssetField>
                <AssetField label={t('Model / Make', 'ሞዴል / አምራች')} required={!editingAssetId}>
                  <input required={!editingAssetId} value={assetForm.model} onChange={(event) => setAssetForm((form) => ({ ...form, model: event.target.value }))} placeholder={t('Model / make', 'ሞዴል / አምራች')} className="asset-input" />
                </AssetField>
                <AssetField label={t('Serial Number', 'ተከታታይ ቁጥር')} required={!editingAssetId}>
                  <input required={!editingAssetId} value={assetForm.serialNumber} onChange={(event) => setAssetForm((form) => ({ ...form, serialNumber: event.target.value }))} className="asset-input" />
                </AssetField>
                <AssetField label={t('Purchase / Acquisition Date', 'የግዢ / የማግኘት ቀን')} required={!editingAssetId}>
                  <input required={!editingAssetId} type="date" value={assetForm.purchaseDate} onChange={(event) => setAssetForm((form) => ({ ...form, purchaseDate: event.target.value }))} className="asset-input" />
                </AssetField>
                <AssetField label={t('Purchase Value (ETB)', 'የግዢ ዋጋ (ብር)')} required={!editingAssetId}>
                  <input required={!editingAssetId} type="number" min="0" step="0.01" value={assetForm.purchaseValue} onChange={(event) => setAssetForm((form) => ({ ...form, purchaseValue: event.target.value }))} className="asset-input" />
                </AssetField>
                <AssetField label={t('Condition', 'ሁኔታ')} required>
                  <select required value={assetForm.condition} onChange={(event) => setAssetForm((form) => ({ ...form, condition: event.target.value }))} className="asset-input">
                    {['New', 'Good', 'Fair', 'Damaged', 'Lost'].map((value) => <option key={value}>{value}</option>)}
                  </select>
                </AssetField>
                <AssetField label={t('Inventory Status', 'የንብረት ሁኔታ')} required>
                  <select required value={assignmentEnabled ? 'Assigned' : assetForm.status === 'Assigned' ? 'Available' : assetForm.status} onChange={(event) => setAssetForm((form) => ({ ...form, status: event.target.value }))} disabled={assignmentEnabled} className="asset-input disabled:bg-slate-100">
                    {[...new Set([...DEFAULT_ASSET_STATUSES, ...configuredStatuses.map((item) => item.name), assetForm.status].filter(Boolean))].map((value) => <option key={value}>{value}</option>)}
                  </select>
                </AssetField>
              </div>
            </section>

            <section className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <UserRound size={16} className="text-teal-700" />
                  <div><h3 className="text-xs font-bold text-slate-800">{t('Employee Assignment', 'ለሰራተኛ ምደባ')}</h3><p className="text-[9px] text-slate-500">{t('Assign this asset to an employee for tracking.', 'ለክትትል ይህን ንብረት ለሰራተኛ ይመድቡ።')}</p></div>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-[10px] font-semibold text-slate-600">
                  <input type="checkbox" checked={assignmentEnabled} onChange={(event) => {
                    const enabled = event.target.checked;
                    setAssignmentEnabled(enabled);
                    employeeLookupStarted.current = false;
                    setEmployeeLookupAttempted(false);
                    setEmployeeLoadError('');
                    setAssetForm((form) => ({
                      ...form,
                      employeeId: enabled ? form.employeeId === 'N/A' ? '' : form.employeeId : '',
                      employeeName: enabled ? form.employeeName : '',
                      department: enabled ? form.department : '',
                      status: enabled ? 'Assigned' : 'Available'
                    }));
                    if (!enabled) setEmployeeSearch('');
                  }} className="sr-only peer" />
                  <span className={`relative h-6 w-11 rounded-full transition ${assignmentEnabled ? 'bg-teal-600' : 'bg-slate-300'} after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition ${assignmentEnabled ? 'after:translate-x-5' : ''}`} />
                  {t('Assign to employee', 'ለሰራተኛ መድብ')}
                </label>
              </div>
              {assignmentEnabled && (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <AssetField label={t('Search Employee by ID', 'ሰራተኛን በመለያ ይፈልጉ')} required>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                        <input
                          required
                          role="combobox"
                          aria-haspopup="listbox"
                          aria-autocomplete="list"
                          aria-expanded={showEmployeeResults}
                          aria-controls="asset-employee-results"
                          aria-activedescendant={showEmployeeResults && matchingEmployees.length ? `asset-employee-option-${activeEmployeeResult}` : undefined}
                          value={employeeSearch}
                          onFocus={() => { setShowEmployeeResults(true); setActiveEmployeeResult(0); }}
                          onKeyDown={handleEmployeeSearchKeyDown}
                          onChange={(event) => {
                          setEmployeeSearch(event.target.value);
                          setShowEmployeeResults(true);
                          setActiveEmployeeResult(0);
                          setAssetForm((form) => ({ ...form, employeeId: '', employeeName: '', department: '' }));
                        }}
                          placeholder={t('Type employee ID (or name)', 'የሰራተኛ መለያ (ወይም ስም) ያስገቡ')}
                          className="asset-input pl-9"
                        />
                        {showEmployeeResults && (
                          <div id="asset-employee-results" role="listbox" aria-label={t('Matching employees', 'የተዛመዱ ሰራተኞች')} className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                            {loadingEmployees && <p className="p-2 text-[10px] text-slate-500">{t('Loading employees...', 'ሰራተኞችን በመጫን ላይ...')}</p>}
                            {!loadingEmployees && visibleEmployeeResults.map((employee, index) => (
                              <button
                                id={`asset-employee-option-${index}`}
                                key={employee._id || employee.employeeId}
                                type="button"
                                role="option"
                                aria-selected={index === activeEmployeeResult}
                                onMouseEnter={() => setActiveEmployeeResult(index)}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => selectEmployee(employee)}
                                className={`block w-full border-b border-slate-100 px-3 py-2 text-left ${index === activeEmployeeResult ? 'bg-teal-50' : 'hover:bg-teal-50'}`}
                              >
                                <span className="block text-[10px] font-bold text-teal-800">{employee.employeeId}</span>
                                <span className="block text-[10px] font-semibold text-slate-800">{employee.fullName}</span>
                                <span className="block text-[9px] text-slate-500">{employee.department || employee.departmentName || t('Department not recorded', 'የሥራ ክፍል አልተመዘገበም')}</span>
                              </button>
                            ))}
                            {!loadingEmployees && matchingEmployees.length > 0 && <p className="sticky bottom-0 border-t border-slate-100 bg-slate-50 px-3 py-1 text-[9px] text-slate-500">{employeeSearch.trim() ? `${matchingEmployees.length} ${t('matching employees', 'የተዛመዱ ሰራተኞች')}${matchingEmployees.length > visibleEmployeeResults.length ? ` · ${t('showing first 8', 'የመጀመሪያዎቹ 8 ይታያሉ')}` : ''}` : t('Start typing an employee ID to narrow the list.', 'ዝርዝሩን ለማጥበብ የሰራተኛ መለያ ያስገቡ።')}</p>}
                            {!loadingEmployees && employees.length > 0 && !matchingEmployees.length && <p className="p-2 text-[10px] text-slate-500">{t('No employees match this search.', 'ከዚህ ፍለጋ ጋር የሚዛመድ ሰራተኛ የለም።')}</p>}
                            {!loadingEmployees && !employees.length && !employeeLoadError && <p className="p-2 text-[10px] text-slate-500">{t('No employees are available.', 'ምንም ሰራተኛ የለም።')}</p>}
                          </div>
                        )}
                      </div>
                    </AssetField>
                    <AssetField label={t('Employee Name', 'የሰራተኛ ስም')} required>
                      <input readOnly required value={assetForm.employeeName === 'Unknown Employee' ? '' : assetForm.employeeName} placeholder={t('Select an employee', 'ሰራተኛ ይምረጡ')} className="asset-input bg-slate-50" />
                    </AssetField>
                    <AssetField label={t('Department', 'የሥራ ክፍል')} required>
                      <input readOnly required value={assetForm.department === 'N/A' ? '' : assetForm.department} placeholder={t('Assigned employee department', 'የተመደበው ሰራተኛ የሥራ ክፍል')} className="asset-input bg-slate-50" />
                    </AssetField>
                    <AssetField label={t('Handover / Property Voucher No.', 'የርክክብ / የንብረት ቫውቸር ቁጥር')}>
                      <input value={assetForm.handoverVoucher} onChange={(event) => setAssetForm((form) => ({ ...form, handoverVoucher: event.target.value }))} placeholder="PV-2023-ICT-015" className="asset-input" />
                    </AssetField>
                  </div>
                  {employeeLoadError && <div role="alert" className="flex items-center justify-between gap-2 rounded border border-rose-200 bg-white p-2 text-[10px] text-rose-700"><span>{employeeLoadError}</span>{employeeAuthExpired ? <button type="button" onClick={logout} className="shrink-0 font-semibold underline">{t('Sign in again', 'እንደገና ይግቡ')}</button> : <button type="button" onClick={() => { employeeLookupStarted.current = false; setEmployeeLookupAttempted((attempt) => !attempt); }} className="shrink-0 font-semibold underline">{t('Retry', 'እንደገና ይሞክሩ')}</button>}</div>}
                  <div className="flex items-start gap-2 rounded border border-blue-100 bg-white p-2 text-[9px] text-blue-700"><Info size={13} className="mt-0.5 shrink-0" /><span>{t('The assigned employee will be linked to this asset for tracking and clearance verification during the exit process.', 'የተመደበው ሰራተኛ በስራ መልቀቂያ ሂደት ውስጥ ለክትትልና ለክሊራንስ ማረጋገጫ ከዚህ ንብረት ጋር ይገናኛል።')}</span></div>
                </>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-xs font-bold text-teal-800"><MapPin size={14} />{t('Location & Remarks', 'ቦታ እና አስተያየቶች')}</h3>
              <div className="grid gap-3 md:grid-cols-3">
                <AssetField label={t('Campus', 'ግቢ')} required={!editingAssetId}>
                  <select required={!editingAssetId} value={assetForm.campus} onChange={(event) => setAssetForm((form) => ({ ...form, campus: event.target.value }))} className="asset-input">
                    {[...new Set([...(filterOptions.campuses || []), 'Main Campus', assetForm.campus].filter(Boolean))].map((value) => <option key={value}>{value}</option>)}
                  </select>
                </AssetField>
                <AssetField label={t('Building / Room / Store Location', 'ሕንፃ / ክፍል / መጋዘን')} required={!editingAssetId}>
                  <input required={!editingAssetId} value={assetForm.location} onChange={(event) => setAssetForm((form) => ({ ...form, location: event.target.value }))} placeholder={t('Building / room / store', 'ህንፃ / ክፍል / መጋዘን')} className="asset-input" />
                </AssetField>
                <AssetField label={t('Remarks', 'አስተያየት')}>
                  <textarea maxLength={500} value={assetForm.remarks} onChange={(event) => setAssetForm((form) => ({ ...form, remarks: event.target.value }))} placeholder={t('Enter remarks', 'አስተያየት ያስገቡ')} className="asset-input min-h-10 resize-y" />
                </AssetField>
              </div>
            </section>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button type="button" onClick={() => setIsAssetFormOpen(false)} className="rounded-md border border-slate-200 px-3 py-2 font-semibold text-slate-600 hover:bg-slate-50">{t('Cancel', 'ሰርዝ')}</button>
              <button type="submit" disabled={savingAsset || (assignmentEnabled && employeeAuthExpired)} className="inline-flex items-center gap-1.5 rounded-md bg-teal-700 px-3 py-2 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60">
                {savingAsset ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {savingAsset ? t('Saving...', 'በማስቀመጥ ላይ...') : editingAssetId ? t('Save Changes', 'ለውጦችን አስቀምጥ') : t('Register Asset', 'ንብረት መዝግብ')}
              </button>
            </div>
          </form>
        </div>
      )}

      {pendingReturnAsset && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4">
          <section className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900">{t('Return Asset to Store?', 'ንብረቱን ወደ መጋዘን መመለስ ይፈልጋሉ?')}</h2>
                <p className="mt-1 text-[11px] text-slate-600">{t('This unassigns', 'ይህ ንብረቱን ከ')} <strong>{pendingReturnAsset.assetName}</strong> ({pendingReturnAsset.assetId}) {t('from', 'ላይ ያለውን ምደባ ያነሳል፣ ከ')} {pendingReturnAsset.employeeName} {t('and records its return in the asset history.', 'ላይ ያስወግዳል እና መመለሱን በንብረት ታሪክ ይመዘግባል።')}</p>
              </div>
              <button type="button" onClick={() => setPendingReturnAsset(null)} aria-label={t('Cancel return', 'መመለሱን ሰርዝ')} className="rounded p-1 text-slate-500 hover:bg-slate-100"><X size={16} /></button>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPendingReturnAsset(null)} className="rounded-md border border-slate-200 px-3 py-2 font-semibold text-slate-600 hover:bg-slate-50">{t('Cancel', 'ሰርዝ')}</button>
              <button type="button" onClick={handleReturnToStore} disabled={Boolean(returningAssetId)} className="inline-flex items-center gap-1.5 rounded-md bg-rose-700 px-3 py-2 font-semibold text-white hover:bg-rose-800 disabled:opacity-60">
                {returningAssetId ? <Loader2 className="animate-spin" size={13} /> : <RotateCcw size={13} />}
                {t('Confirm Return', 'መመለሱን አረጋግጥ')}
              </button>
            </div>
          </section>
        </div>
      )}

      {selectedAsset && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="font-bold text-slate-800">{t('Asset Details', 'የንብረት ዝርዝሮች')}</h3>
            <button
              onClick={() => setSelectedAsset(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              {t('Close', 'ዝጋ')}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
            <div>
              <p className="text-slate-400">{t('Asset Name', 'የንብረት ስም')}</p>
              <p className="font-semibold text-slate-800">{selectedAsset.assetName}</p>
            </div>
            <div>
              <p className="text-slate-400">{t('Asset ID', 'የንብረት መለያ')}</p>
              <p className="font-semibold text-slate-800">{selectedAsset.assetId}</p>
            </div>
            <div>
              <p className="text-slate-400">{t('Employee', 'ሰራተኛ')}</p>
              <p className="font-semibold text-slate-800">{selectedAsset.employeeName}</p>
            </div>
            <div>
              <p className="text-slate-400">{t('Category', 'ምድብ')}</p>
              <p className="font-semibold text-slate-800">{selectedAsset.category || selectedAsset.assetType}</p>
            </div>
            <div>
              <p className="text-slate-400">{t('Employee ID', 'የሰራተኛ መለያ')}</p>
              <p className="font-semibold text-slate-800">{selectedAsset.employeeId}</p>
            </div>
            <div>
              <p className="text-slate-400">{t('Department', 'የስራ ክፍል')}</p>
              <p className="font-semibold text-slate-800">{selectedAsset.department}</p>
            </div>
            <div>
              <p className="text-slate-400">{t('Campus', 'ግቢ')}</p>
              <p className="font-semibold text-slate-800">{selectedAsset.campus}</p>
            </div>
            <div>
              <p className="text-slate-400">{t('Assigned Date', 'የተመደበበት ቀን')}</p>
              <p className="font-semibold text-slate-800">{formatDate(selectedAsset.assignedDate)}</p>
            </div>
            <div>
              <p className="text-slate-400">{t('Return Date', 'የተመለሰበት ቀን')}</p>
              <p className="font-semibold text-slate-800">{formatDate(selectedAsset.returnDate)}</p>
            </div>
            <div>
              <p className="text-slate-400">{t('Status', 'ሁኔታ')}</p>
              <p className="font-semibold text-slate-800">{selectedAsset.status}</p>
            </div>
            <div>
              <p className="text-slate-400">{t('Condition', 'ሁኔታ')}</p>
              <p className="font-semibold text-slate-800">{selectedAsset.condition}</p>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t('History', 'ታሪክ')}</h4>
            {loadingHistory ? (
              <div className="mt-2 flex items-center text-slate-400">
                <Loader2 className="mr-2 animate-spin" size={14} /> {t('Loading asset history...', 'የንብረት ታሪክ በመጫን ላይ...')}
              </div>
            ) : assetHistory.length === 0 ? (
              <p className="mt-2 text-slate-400">{t('No asset history available.', 'ምንም የንብረት ታሪክ የለም።')}</p>
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
    </main>
  );
}