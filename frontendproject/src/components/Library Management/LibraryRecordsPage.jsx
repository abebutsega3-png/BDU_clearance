import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Eye,
  Filter,
  MoreHorizontal,
  Printer,
  Search,
  X,
} from 'lucide-react';

const LIBRARY_RECORDS_API = 'http://localhost:3000/api/library/records';

const statusCardConfig = [
  { key: 'Borrowed', label: 'Borrowed Materials', icon: BookOpen, tone: 'bg-sky-50 text-sky-700 border-sky-200' },
  { key: 'Outstanding', label: 'Outstanding Materials', icon: AlertTriangle, tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'Overdue', label: 'Overdue Materials', icon: CalendarClock, tone: 'bg-rose-50 text-rose-700 border-rose-200' },
  { key: 'Returned', label: 'Returned Materials', icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

const statusBadge = {
  Borrowed: 'bg-sky-100 text-sky-700',
  Outstanding: 'bg-amber-100 text-amber-700',
  Overdue: 'bg-rose-100 text-rose-700',
  Returned: 'bg-emerald-100 text-emerald-700',
  Lost: 'bg-slate-200 text-slate-700',
};

const MATERIAL_TYPES = ['Book', 'Journal', 'Laptop', 'Equipment', 'Other'];
const MATERIAL_CONDITIONS = ['Good', 'Fair', 'Damaged'];
const MATERIAL_ID_PATTERN = /^[A-Za-z0-9-]+$/;

const getLocalDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getNextDateInputValue = (value) => {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + 1);
  return getLocalDateInputValue(date);
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};

const toCurrency = (value) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? `${amount.toLocaleString()} ETB` : '0 ETB';
};

const normalizeRecord = (record, material = record) => {
  const item = { ...record, ...material };
  const dueDate = item.dueDate || item.returnDueDate || '';
  const status = String(material.status || material.recordStatus || record.recordStatus || '').toLowerCase();
  const dueTimestamp = dueDate ? new Date(dueDate).setHours(0, 0, 0, 0) : NaN;
  const todayTimestamp = new Date().setHours(0, 0, 0, 0);
  let recordStatus = 'Unknown';

  if (status === 'returned') recordStatus = 'Returned';
  else if (status === 'lost') recordStatus = 'Lost';
  else if (Number.isFinite(dueTimestamp) && dueTimestamp < todayTimestamp) recordStatus = 'Overdue';
  else if (status === 'borrowed' || status === 'issued') recordStatus = 'Borrowed';
  else if (status === 'outstanding') recordStatus = 'Outstanding';
  else if (status === 'overdue') recordStatus = 'Overdue';

  return {
    ...item,
    _id: material._id || record._id || record.requestId || record.employeeId,
    sourceMaterialId: material._id || material.materialId || `${record._id}-0`,
    requestId: record.requestId,
    employeeName: record.employeeName || record.employee?.fullName || 'Unknown employee',
    employeeId: record.employeeId || record.employee?.employeeId || '—',
    department: record.department || '',
    campus: record.campus || '',
    materialType: item.materialType || item.material || '',
    title: item.title || item.itemName || '',
    accessionNumber: item.accessionNumber || item.accessCode || item.itemCode || item.materialId || '',
    borrowedDate: item.borrowedDate || item.borrowDate || record.submittedDate || record.createdAt || '',
    dueDate,
    currentCondition: item.currentCondition || item.condition || '',
    fineAmount: Number(item.fineAmount ?? item.outstandingFineAmount ?? 0),
    recordStatus,
  };
};

export default function LibraryRecordsPage() {
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState([]);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [activeAction, setActiveAction] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('employeeId') || '');
  const [statusFilter, setStatusFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [campusFilter, setCampusFilter] = useState('All');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get(LIBRARY_RECORDS_API, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const loaded = Array.isArray(data?.records) ? data.records : [];
        const materialRows = loaded.flatMap((record) => {
          if (Array.isArray(record.materials) && record.materials.length) {
            return record.materials.map((material) => normalizeRecord(record, material));
          }
          const hasLegacyMaterial = record.materialId || record.materialTitle || record.title || record.materialType;
          return hasLegacyMaterial ? [normalizeRecord(record)] : [];
        });
        setRecords(materialRows);
        setError('');
      } catch (loadError) {
        setRecords([]);
        setError(loadError.response?.data?.message || 'Unable to load library records.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [refreshKey]);

  const departmentOptions = useMemo(() => ['All', ...new Set(records.map((record) => record.department).filter(Boolean))], [records]);
  const campusOptions = useMemo(() => ['All', ...new Set(records.map((record) => record.campus).filter(Boolean))], [records]);

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch = !term || [record.employeeName, record.employeeId, record.title, record.accessionNumber, record.materialType, record.department].join(' ').toLowerCase().includes(term);
      const matchesDepartment = departmentFilter === 'All' || record.department === departmentFilter;
      const matchesCampus = campusFilter === 'All' || record.campus === campusFilter;
      const matchesStatus = statusFilter === 'All' || record.recordStatus === statusFilter;
      return matchesSearch && matchesDepartment && matchesCampus && matchesStatus;
    });
  }, [records, search, statusFilter, departmentFilter, campusFilter]);

  const summary = useMemo(() => ({
    Borrowed: records.filter((record) => record.recordStatus === 'Borrowed').length,
    Outstanding: records.filter((record) => record.recordStatus === 'Outstanding').length,
    Overdue: records.filter((record) => record.recordStatus === 'Overdue').length,
    Returned: records.filter((record) => record.recordStatus === 'Returned').length,
  }), [records]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setDepartmentFilter('All');
    setCampusFilter('All');
  };

  const handleMaterialAction = async (record, action, values) => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.patch(
        `${LIBRARY_RECORDS_API}/${encodeURIComponent(record.requestId)}/materials/${encodeURIComponent(record.sourceMaterialId)}/${action}`,
        values,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!data?.success) throw new Error(data?.message || 'Unable to update library material.');
      setActiveAction(null);
      setRefreshKey((current) => current + 1);
    } catch (actionError) {
      throw new Error(actionError.response?.data?.message || actionError.message || 'Unable to update library material.');
    }
  };

  const printReceipt = (record) => {
    const popup = window.open('', '_blank', 'width=720,height=760');
    if (!popup) {
      setError('Allow pop-ups in your browser to print the return receipt.');
      return;
    }
    const safe = (value) => String(value ?? '-').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]);
    popup.document.write(`<!doctype html><html><head><title>Library Return Receipt</title><style>body{font:14px Arial,sans-serif;margin:40px;color:#172033}h1{color:#0f766e}table{border-collapse:collapse;width:100%;margin-top:24px}td{border:1px solid #cbd5e1;padding:10px}td:first-child{font-weight:bold;width:34%}</style></head><body><h1>Library Office</h1><h2>Material Return Receipt</h2><table><tr><td>Employee</td><td>${safe(record.employeeName)} (${safe(record.employeeId)})</td></tr><tr><td>Department</td><td>${safe(record.department)}</td></tr><tr><td>Clearance Request</td><td>${safe(record.requestId)}</td></tr><tr><td>Material</td><td>${safe(record.title)}</td></tr><tr><td>ISBN / Accession</td><td>${safe(record.isbn || record.materialId || record.accessionNumber)}</td></tr><tr><td>Borrowed Date</td><td>${safe(formatDate(record.borrowedDate))}</td></tr><tr><td>Returned Date</td><td>${safe(formatDate(record.returnDate || new Date()))}</td></tr><tr><td>Condition</td><td>${safe(record.currentCondition || record.condition)}</td></tr><tr><td>Fine Amount</td><td>${safe(toCurrency(record.fineAmount))}</td></tr></table><p>Printed: ${safe(new Date().toLocaleString())}</p><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Library office</p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight text-slate-900">Library Records</h1>
          <p className="mt-2 text-sm text-slate-500">Manage borrowed, outstanding, overdue, and returned library materials.</p>
        </div>
        <button type="button" onClick={() => setShowIssueModal(true)} className="rounded-lg bg-teal-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800">
          + Issue / Assign Sample Material
        </button>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {statusCardConfig.map(({ key, label, icon: Icon, tone }) => (
          <div key={key} className={`rounded-xl border p-4 shadow-sm ${tone}`}>
            <div className="mb-3 flex items-center justify-between">
              <div className="rounded-lg bg-white/60 p-2">
                <Icon size={20} />
              </div>
              <span className="text-lg font-bold text-slate-900">{summary[key] ?? 0}</span>
            </div>
            <p className="text-sm font-semibold text-slate-700">{label}</p>
          </div>
        ))}
      </section>

      {error && <p className="mt-4 text-xs text-amber-700">{error}</p>}

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
          <Filter size={16} className="text-teal-700" />
          Search &amp; Filter
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
          <label className="relative block">
            <Search size={15} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search library records..."
              className="w-full rounded-md border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-teal-600 focus:bg-white"
            />
          </label>

          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-teal-600 focus:bg-white">
            {departmentOptions.map((option) => (
              <option key={option} value={option}>{option === 'All' ? 'All Departments' : option}</option>
            ))}
          </select>

          <select value={campusFilter} onChange={(event) => setCampusFilter(event.target.value)} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-teal-600 focus:bg-white">
            {campusOptions.map((option) => (
              <option key={option} value={option}>{option === 'All' ? 'All Campuses' : option}</option>
            ))}
          </select>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-teal-600 focus:bg-white">
            <option value="All">All Statuses</option>
            {Object.keys(statusBadge).map((status) => (
              <option key={status} value={status}>{status === 'Returned' ? 'Return' : status}</option>
            ))}
          </select>

          <button type="button" onClick={clearFilters} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">
            <X size={14} />
            Reset
          </button>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-400">Loading library records...</div>
          ) : (
            <table className="min-w-[1260px] w-full text-left text-sm">
              <thead className="bg-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">BDU</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Material Type</th>
                  <th className="px-4 py-3">Title / Accession</th>
                  <th className="px-4 py-3">Borrowed Date</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Fine Amount</th>
                  <th className="sticky right-0 z-20 min-w-48 bg-slate-100 px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-sm text-slate-400">
                      No library records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record, index) => (
                    <tr key={`${record.requestId || record.employeeId}-${record._id}-${index}`} className="hover:bg-slate-50">
                      <td className="px-4 py-4 text-slate-600">{index + 1}</td>
                      <td className="px-4 py-4 font-semibold text-slate-700">{record.requestId || record.employeeId || 'BDU'}</td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-800">{record.employeeName}</div>
                        <div className="text-xs text-slate-500">{record.employeeId}</div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{record.department}</td>
                      <td className="px-4 py-4 text-slate-600">{record.materialType}</td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-800">{record.title}</div>
                        <div className="text-xs text-slate-500">{record.accessionNumber}</div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{formatDate(record.borrowedDate)}</td>
                      <td className="px-4 py-4 text-slate-600">{formatDate(record.dueDate)}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadge[record.recordStatus] || 'bg-slate-100 text-slate-600'}`}>
                          {record.recordStatus === 'Returned' ? 'Return' : record.recordStatus}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-slate-800">{toCurrency(record.fineAmount)}</td>
                      <td className="sticky right-0 z-10 bg-white px-3 py-3 text-right shadow-[-8px_0_12px_-10px_rgba(15,23,42,0.35)] group-hover:bg-slate-50">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => setSelectedDetails(record)} title="View details" aria-label="View details" className="rounded-md border border-slate-200 p-2 text-teal-700 hover:bg-teal-50">
                            <Eye size={16} />
                          </button>
                          <details className="group relative">
                            <summary title="More actions" aria-label="More actions" className="list-none cursor-pointer rounded-md border border-slate-200 p-2 text-slate-700 hover:bg-slate-50">
                              <MoreHorizontal size={16} />
                            </summary>
                            <div className="absolute right-0 z-30 mt-1 flex min-w-52 flex-col rounded-lg border border-slate-200 bg-white p-1 text-left shadow-xl">
                              <ActionMenuButton onClick={() => { setSelectedDetails(record); }}>View Details</ActionMenuButton>
                              <ActionMenuButton onClick={() => setActiveAction({ record, action: 'return' })} disabled={['Returned', 'Lost'].includes(record.recordStatus)}>Mark as Returned</ActionMenuButton>
                              <ActionMenuButton onClick={() => setActiveAction({ record, action: 'damage' })} disabled={record.recordStatus === 'Lost' || (record.recordStatus === 'Returned' && record.currentCondition === 'Damaged')}>Report Damaged</ActionMenuButton>
                              <ActionMenuButton onClick={() => setActiveAction({ record, action: 'lost' })} disabled={!['Borrowed', 'Outstanding', 'Overdue'].includes(record.recordStatus)}>Report Lost</ActionMenuButton>
                              <ActionMenuButton onClick={() => setActiveAction({ record, action: 'adjust' })}>Update Condition / Fine</ActionMenuButton>
                              <ActionMenuButton onClick={() => printReceipt(record)} disabled={record.recordStatus !== 'Returned'}>
                                <span className="inline-flex items-center gap-2"><Printer size={14} /> Print Return Slip / Receipt</span>
                              </ActionMenuButton>
                            </div>
                          </details>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
      {showIssueModal && (
        <IssueMaterialModal
          onCancel={() => setShowIssueModal(false)}
          onAssigned={() => setRefreshKey((current) => current + 1)}
        />
      )}
      {selectedDetails && <MaterialDetailsModal record={selectedDetails} onClose={() => setSelectedDetails(null)} onPrint={() => printReceipt(selectedDetails)} />}
      {activeAction && (
        <MaterialActionModal
          record={activeAction.record}
          action={activeAction.action}
          onCancel={() => setActiveAction(null)}
          onSubmit={(values) => handleMaterialAction(activeAction.record, activeAction.action, values)}
        />
      )}
    </main>
  );
}

function IssueMaterialModal({ onCancel, onAssigned }) {
  const [employees, setEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [message, setMessage] = useState('');
  const [employeeLoadError, setEmployeeLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const today = new Date();
  const todayValue = getLocalDateInputValue(today);
  const defaultDueDate = new Date(today);
  defaultDueDate.setDate(defaultDueDate.getDate() + 31);
  const [form, setForm] = useState({
    materialType: 'Book',
    title: '',
    materialId: '',
    publicationYear: String(today.getFullYear()),
    condition: 'Good',
    borrowDate: todayValue,
    dueDate: getLocalDateInputValue(defaultDueDate),
    remark: '',
  });

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get('http://localhost:3000/api/employee', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setEmployees(Array.isArray(data?.employees) ? data.employees.filter((employee) => employee.status === 'Active') : []);
      } catch (loadError) {
        setEmployeeLoadError(loadError.response?.data?.message || 'Unable to load active employees. Please try again.');
      }
    };

    loadEmployees();
  }, []);

  const employeeOptions = employees.map((employee) => ({
    ...employee,
    displayName: employee.fullName || [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' '),
  }));
  const normalizedEmployeeSearch = employeeSearch.trim().toLocaleLowerCase();
  const selectedByIdOrLabel = employeeOptions.find((employee) => (
    [employee.employeeId, `${employee.employeeId} / ${employee.displayName}`]
      .some((value) => value.toLocaleLowerCase() === normalizedEmployeeSearch)
  ));
  const nameMatches = employeeOptions.filter((employee) => employee.displayName.toLocaleLowerCase() === normalizedEmployeeSearch);
  const selectedEmployee = selectedByIdOrLabel || (nameMatches.length === 1 ? nameMatches[0] : null);
  const inputClassName = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100';
  const updateForm = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setMessage('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!selectedEmployee) {
      setMessage('Select an employee from the employee list.');
      return;
    }
    if (!selectedEmployee.displayName?.trim() || /^\d+$/.test(selectedEmployee.displayName.trim())
      || !selectedEmployee.department?.trim() || /^\d+$/.test(selectedEmployee.department.trim())
      || !selectedEmployee.campus?.trim() || /^\d+$/.test(selectedEmployee.campus.trim())) {
      setMessage('Selected employee name, department, and campus must contain valid database text values.');
      return;
    }
    if (!form.title.trim()) {
      setMessage('Book title / name is required.');
      return;
    }
    if (!MATERIAL_ID_PATTERN.test(form.materialId.trim())) {
      setMessage('Accession / ISBN / Tag Number may contain letters, numbers, and hyphens only.');
      return;
    }
    if (form.publicationYear && (!/^\d{4}$/.test(form.publicationYear) || Number(form.publicationYear) > today.getFullYear() || Number(form.publicationYear) < 1000)) {
      setMessage(`Publication year must be a valid four-digit year between 1000 and ${today.getFullYear()}.`);
      return;
    }
    if (!MATERIAL_TYPES.includes(form.materialType) || !MATERIAL_CONDITIONS.includes(form.condition)) {
      setMessage('Select a valid material type and initial condition.');
      return;
    }
    if (!form.borrowDate || form.borrowDate > todayValue) {
      setMessage('Issue / Borrowed Date must be valid and cannot be in the future.');
      return;
    }
    if (!form.dueDate || form.dueDate < todayValue || form.dueDate <= form.borrowDate) {
      setMessage('Due Date must be valid, not in the past, and after the borrowed date.');
      return;
    }
    if (form.title.trim().length > 200 || form.remark.trim().length > 1000) {
      setMessage('Title must be 200 characters or fewer and remark must be 1000 characters or fewer.');
      return;
    }

    try {
      setSaving(true);
      setMessage('');
      const token = localStorage.getItem('token');
      const { data } = await axios.post(LIBRARY_RECORDS_API, {
        employeeId: selectedEmployee.employeeId,
        ...form,
        title: form.title.trim(),
        materialId: form.materialId.trim(),
        remark: form.remark.trim(),
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!data?.success) throw new Error(data?.message || 'Unable to assign material.');
      onAssigned();
      onCancel();
    } catch (submitError) {
      setMessage(submitError.response?.data?.message || submitError.message || 'Unable to assign material.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-3"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}
    >
      <form onSubmit={submit} className="my-auto w-full max-w-2xl space-y-3 rounded-xl bg-white p-4 shadow-2xl sm:p-5" role="dialog" aria-modal="true" aria-labelledby="issue-material-title">
        <h2 id="issue-material-title" className="text-lg font-bold text-slate-900">Issue / Assign Sample Material (DEMO/TESTING)</h2>

        <fieldset className="space-y-2">
          <legend className="text-xs font-bold uppercase tracking-wide text-slate-700">Section 1: Employee Details</legend>
          <label className="block text-xs font-medium text-slate-700">
            Select Employee (Search)
            <input
              list="library-employee-options"
              value={employeeSearch}
              onChange={(event) => { setEmployeeSearch(event.target.value); setMessage(''); }}
              placeholder="Search by employee ID or name"
              required
              aria-invalid={Boolean(employeeLoadError)}
              className={inputClassName}
            />
            <datalist id="library-employee-options">
              {employeeOptions.map((employee) => (
                <React.Fragment key={employee.employeeId}>
                  <option value={employee.employeeId} />
                  <option value={employee.displayName} />
                  <option value={`${employee.employeeId} / ${employee.displayName}`} />
                </React.Fragment>
              ))}
            </datalist>
            {employeeLoadError && <span role="alert" className="mt-1 block text-rose-600">{employeeLoadError}</span>}
            {!selectedEmployee && nameMatches.length > 1 && <span className="mt-1 block text-amber-700">More than one employee has this name. Search by employee ID to select the right person.</span>}
          </label>
          <label className="block text-xs font-medium text-slate-700">
            Employee Name (Auto-filled)
            <input
              value={selectedEmployee?.displayName || ''}
              readOnly
              placeholder="Select an employee"
              className={`${inputClassName} bg-slate-100 text-slate-600`}
            />
          </label>
          <label className="block text-xs font-medium text-slate-700">
            Department / Campus (Auto-filled)
            <input
              value={selectedEmployee ? `${selectedEmployee.department || ''} / ${selectedEmployee.campus || ''}` : ''}
              readOnly
              placeholder="Select an employee"
              className={`${inputClassName} bg-slate-100 text-slate-600`}
            />
          </label>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-xs font-bold uppercase tracking-wide text-slate-700">Section 2: Material Details</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-700">
              Material Type
              <select name="materialType" value={form.materialType} onChange={updateForm} required className={inputClassName}>
                {MATERIAL_TYPES.map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Book Title / Name
              <input name="title" value={form.title} onChange={updateForm} required maxLength={200} className={inputClassName} />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Accession / ISBN / Tag Number
              <input name="materialId" value={form.materialId} onChange={updateForm} required maxLength={100} pattern="[A-Za-z0-9-]+" title="Use letters, numbers, and hyphens only." className={inputClassName} />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Publication Year
              <input type="text" inputMode="numeric" name="publicationYear" value={form.publicationYear} minLength={4} maxLength={4} pattern="[0-9]{4}" title={`Enter a four-digit year from 1000 to ${today.getFullYear()}.`} onChange={updateForm} className={inputClassName} />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Initial Condition
              <select name="condition" value={form.condition} onChange={updateForm} required className={inputClassName}>
                {MATERIAL_CONDITIONS.map((condition) => <option key={condition}>{condition}</option>)}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-xs font-bold uppercase tracking-wide text-slate-700">Section 3: Loan &amp; Schedule</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-700">
              Issue / Borrowed Date
              <input type="date" name="borrowDate" value={form.borrowDate} max={todayValue} onChange={updateForm} required className={inputClassName} />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Due Date
              <input type="date" name="dueDate" value={form.dueDate} min={form.borrowDate ? getNextDateInputValue(form.borrowDate) : todayValue} onChange={updateForm} required className={inputClassName} />
            </label>
            <label className="block text-xs font-medium text-slate-700 sm:col-span-2">
              Remark / Note
              <textarea name="remark" value={form.remark} onChange={updateForm} rows="2" maxLength={1000} className={inputClassName} />
            </label>
          </div>
        </fieldset>

        {message && <p role="status" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60">
            {saving ? 'Assigning...' : 'Assign Material'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ActionMenuButton({ children, disabled = false, onClick }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.currentTarget.closest('details')?.removeAttribute('open');
        onClick();
      }}
      disabled={disabled}
      className="rounded px-3 py-2 text-left text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-800 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-white"
    >
      {children}
    </button>
  );
}

function MaterialDetailsModal({ record, onClose, onPrint }) {
  const profile = record.employeeProfile || {};
  const details = [
    ['Employee Name', record.employeeName || profile.fullName],
    ['Employee ID', record.employeeId || profile.employeeId],
    ['Department', record.department || profile.department],
    ['Position', profile.position],
    ['Campus', record.campus || profile.campus],
    ['Clearance Request', record.requestId],
    ['Material Type', record.materialType],
    ['Title / Name', record.title],
    ['ISBN', record.isbn || record.materialId],
    ['Accession Number', record.accessionNumber || record.materialId],
    ['Publication Year', record.publicationYear],
    ['Condition', record.currentCondition || record.condition],
    ['Status', record.recordStatus],
    ['Borrowed Date', formatDate(record.borrowedDate)],
    ['Due Date', formatDate(record.dueDate)],
    ['Returned Date', formatDate(record.returnDate)],
    ['Fine Amount', toCurrency(record.fineAmount)],
    ['Fine Paid', toCurrency(record.finePaidAmount)],
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-3" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="library-material-details" className="my-auto w-full max-w-2xl rounded-xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Library Office</p>
            <h2 id="library-material-details" className="mt-1 text-xl font-bold text-slate-900">Material &amp; Borrower Details</h2>
            <p className="mt-1 text-xs text-slate-500">{record.requestId || 'Library record'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close details" className="rounded-md px-2 py-1 text-lg text-slate-500 hover:bg-slate-100">×</button>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label} className="rounded-md bg-slate-50 px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
              <dd className="mt-1 break-words text-sm font-medium text-slate-800">{value || '-'}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
          {record.recordStatus === 'Returned' && <button type="button" onClick={onPrint} className="inline-flex items-center gap-2 rounded-lg border border-teal-200 px-3 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50"><Printer size={15} /> Print Receipt</button>}
          <button type="button" onClick={onClose} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900">Close</button>
        </div>
      </section>
    </div>
  );
}

function MaterialActionModal({ record, action, onCancel, onSubmit }) {
  const labels = {
    return: 'Mark Material as Returned',
    damage: 'Report Damaged Material',
    lost: 'Report Lost Material',
    adjust: 'Update Condition / Fine',
  };
  const [form, setForm] = useState({
    amount: action === 'adjust' ? String(record.fineAmount || 0) : '',
    note: '',
    condition: action === 'damage' ? 'Damaged' : action === 'lost' ? 'Lost' : record.currentCondition || record.condition || 'Good',
    status: action === 'return' || action === 'damage' ? 'Returned' : action === 'lost' ? 'Lost' : record.recordStatus,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inputClassName = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100';
  const needsFine = ['damage', 'lost', 'adjust'].includes(action);

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        amount: form.amount === '' ? undefined : Number(form.amount),
      });
    } catch (actionError) {
      setError(actionError.message || 'Unable to complete the action.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-3" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onCancel(); }}>
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="library-action-title" className="my-auto w-full max-w-lg space-y-4 rounded-xl bg-white p-5 shadow-2xl">
        <div>
          <h2 id="library-action-title" className="text-lg font-bold text-slate-900">{labels[action]}</h2>
          <p className="mt-1 text-xs text-slate-500">{record.title} · {record.employeeName} ({record.employeeId})</p>
        </div>
        {action === 'return' && (
          <label className="block text-sm font-medium text-slate-700">Condition on return
            <select name="condition" value={form.condition} onChange={update} className={inputClassName}>
              {['Good', 'Fair', 'Damaged'].map((condition) => <option key={condition}>{condition}</option>)}
            </select>
          </label>
        )}
        {needsFine && (
          <label className="block text-sm font-medium text-slate-700">{action === 'adjust' ? 'New fine total (ETB)' : 'Fine / compensation (ETB)'}
            <input type="number" name="amount" value={form.amount} min={action === 'adjust' ? '0' : '0.01'} step="0.01" required onChange={update} className={inputClassName} />
          </label>
        )}
        {action === 'adjust' && (
          <>
            <label className="block text-sm font-medium text-slate-700">Condition
              <select name="condition" value={form.condition} onChange={update} className={inputClassName}>
                {['Good', 'Fair', 'Damaged', 'Lost'].map((condition) => <option key={condition}>{condition}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">Status
              <select name="status" value={form.status} onChange={update} className={inputClassName}>
                {['Borrowed', 'Outstanding', 'Overdue', 'Returned', 'Lost'].map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
          </>
        )}
        {action !== 'return' && (
          <label className="block text-sm font-medium text-slate-700">Note / reason
            <textarea name="note" value={form.note} onChange={update} rows="3" required={action === 'damage' || action === 'lost'} className={inputClassName} placeholder="Add a short note for the record" />
          </label>
        )}
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button type="button" disabled={saving} onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">{saving ? 'Saving...' : 'Confirm'}</button>
        </div>
      </form>
    </div>
  );
}
