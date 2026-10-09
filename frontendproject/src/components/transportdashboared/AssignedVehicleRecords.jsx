import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Bus, CheckCircle2, Eye, LoaderCircle, Plus, Search, X } from 'lucide-react';

const API_URL = 'http://localhost:3000/api/transport/assigned-vehicles';
const CREATE_API_URL = `${API_URL}/records`;
const REQUEST_API_URL = 'http://localhost:3000/api/transport/requests';
const DEPARTMENTS_API_URL = 'http://localhost:3000/api/departments';
const EMPLOYEE_SEARCH_API_URL = 'http://localhost:3000/api/transport/employees/search';
const statusOptions = ['Assigned', 'Returned', 'Available', 'Under Maintenance', 'Lost'];
const vehicleTypes = ['Bus', 'Minibus', 'Sedan', 'SUV', 'Pick-up', 'Pickup', 'Van', 'Truck', 'Motorcycle', 'Other Vehicle'];
const newVehicleStatuses = ['Assigned', 'Available', 'Under Maintenance', 'Lost'];
const vehicleConditions = ['New', 'Good', 'Fair', 'Damaged'];
const emptyVehicleForm = {
  vehicleNumber: '',
  vehicleType: '',
  make: '',
  model: '',
  manufacturingYear: '',
  color: '',
  seatingCapacity: '',
  currentMileage: '',
  chassisNumber: '',
  engineNumber: '',
  purchaseValue: '',
  department: '',
  status: '',
  condition: '',
  employeeId: '',
  employeeName: '',
  assignmentDate: '',
  returnDate: '',
  registrationDate: '',
  registrationExpiryDate: '',
  insuranceExpiryDate: '',
  lastMaintenanceDate: '',
  nextMaintenanceDate: '',
  remarks: '',
};
const vehicleChecklistFields = ['vehicleReturned', 'vehicleCondition', 'vehicleKeysReturned', 'vehicleDocumentsReturned', 'vehicleAccessoriesReturned'];
const transportChecklistFields = [...vehicleChecklistFields, 'noOutstandingIssue', 'vehicleHandover', 'transportRecords', 'noUnreturnedTransportProperty', 'noOtherObligation'];

const authConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
});

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
};

const statusStyle = (status) => {
  if (status === 'Assigned') return 'bg-sky-50 text-sky-700';
  if (status === 'Returned') return 'bg-emerald-50 text-emerald-700';
  if (status === 'Under Maintenance' || status === 'Lost') return 'bg-rose-50 text-rose-700';
  return 'bg-slate-100 text-slate-700';
};

function DetailItem({ label, value }) {
  return (
    <div className="border-b border-slate-100 py-2.5">
      <dt className="text-[10px] font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-800">{value || '—'}</dd>
    </div>
  );
}

export default function AssignedVehicleRecords() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({ departments: [], vehicleTypes: [], statuses: [] });
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [department, setDepartment] = useState('All');
  const [status, setStatus] = useState('All');
  const [vehicleType, setVehicleType] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [clearanceContext, setClearanceContext] = useState(location.state?.transportClearanceContext || null);
  const [returnReason, setReturnReason] = useState(location.state?.transportClearanceContext?.returnReason || '');
  const [decisionError, setDecisionError] = useState('');
  const [decisionMessage, setDecisionMessage] = useState('');
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [newVehicle, setNewVehicle] = useState(emptyVehicleForm);
  const [addVehicleError, setAddVehicleError] = useState('');
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  const [recordsRefresh, setRecordsRefresh] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeResults, setEmployeeResults] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);

  useEffect(() => {
    setSearch(searchParams.get('search') || '');
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    const loadClearanceContext = async () => {
      const carriedContext = location.state?.transportClearanceContext;
      if (carriedContext?.request) {
        setClearanceContext(carriedContext);
        setReturnReason(carriedContext.returnReason || '');
        return;
      }

      const requestId = searchParams.get('requestId');
      if (!requestId) {
        setClearanceContext(null);
        return;
      }

      try {
        const response = await axios.get(`${REQUEST_API_URL}/${encodeURIComponent(requestId)}`, authConfig());
        if (cancelled) return;
        const request = response.data.request;
        setClearanceContext({
          request,
          recordCheck: request.transportReview || {},
          officerNotes: request.transportReview?.officerNotes || request.officerComment || '',
          returnReason: request.returnReason || '',
        });
        setReturnReason(request.returnReason || '');
      } catch {
        if (!cancelled) setDecisionError('Unable to load the clearance request decision context.');
      }
    };

    loadClearanceContext();
    return () => { cancelled = true; };
  }, [location.state, searchParams]);

  useEffect(() => {
    const controller = new AbortController();
    const loadRecords = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(API_URL, {
          ...authConfig(),
          params: {
            search: search.trim() || undefined,
            department,
            status,
            vehicleType,
          },
          signal: controller.signal,
        });
        setRecords(response.data.records || []);
        setFilters(response.data.filters || { departments: [], vehicleTypes: [], statuses: [] });
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.response?.data?.message || 'Unable to load assigned vehicle records.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadRecords();
    return () => controller.abort();
  }, [search, department, status, vehicleType, recordsRefresh]);

  useEffect(() => {
    const searchTerm = employeeSearch.trim();
    if (!isAddVehicleOpen || !searchTerm || selectedEmployee) return undefined;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setEmployeeSearchLoading(true);
      try {
        const response = await axios.get(EMPLOYEE_SEARCH_API_URL, {
          ...authConfig(),
          params: { search: searchTerm },
          signal: controller.signal,
        });
        setEmployeeResults(Array.isArray(response.data.employees) ? response.data.employees : []);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setEmployeeResults([]);
          setAddVehicleError(requestError.response?.data?.message || 'Unable to search active employees.');
        }
      } finally {
        if (!controller.signal.aborted) setEmployeeSearchLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [employeeSearch, isAddVehicleOpen, selectedEmployee]);

  const addVehicleRecord = async (event) => {
    event.preventDefault();
    setAddVehicleError('');
    const vehicleNumber = newVehicle.vehicleNumber.trim();
    const make = newVehicle.make.trim();
    const model = newVehicle.model.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9-]{1,29}$/.test(vehicleNumber)) {
      setAddVehicleError('Plate number must be 2–30 letters, numbers, or hyphens only.');
      return;
    }
    if (!vehicleTypes.includes(newVehicle.vehicleType)) {
      setAddVehicleError('Select a valid vehicle type.');
      return;
    }
    if (!/[\p{L}]/u.test(make)) {
      setAddVehicleError('Make / Brand is required and cannot contain numbers only.');
      return;
    }
    const chassisNumber = newVehicle.chassisNumber.trim();
    if (!chassisNumber) {
      setAddVehicleError('Chassis / serial number is required.');
      return;
    }
    if (!newVehicleStatuses.includes(newVehicle.status)) {
      setAddVehicleError('Select a valid vehicle status.');
      return;
    }
    if (!vehicleConditions.includes(newVehicle.condition)) {
      setAddVehicleError('Select the vehicle condition.');
      return;
    }
    if (newVehicle.status === 'Assigned' && !selectedEmployee) {
      setAddVehicleError('Search for and select an active employee before assigning this vehicle.');
      return;
    }
    if (selectedEmployee && newVehicle.status !== 'Assigned') {
      setAddVehicleError('Change the vehicle status to Assigned or clear the selected employee.');
      return;
    }
    const currentYear = new Date().getFullYear();
    if (newVehicle.manufacturingYear && (!/^\d{4}$/.test(newVehicle.manufacturingYear)
      || Number(newVehicle.manufacturingYear) < 1900 || Number(newVehicle.manufacturingYear) > currentYear)) {
      setAddVehicleError(`Manufacturing year must be between 1900 and ${currentYear}.`);
      return;
    }
    if (newVehicle.seatingCapacity && (!/^\d+$/.test(newVehicle.seatingCapacity) || Number(newVehicle.seatingCapacity) < 1)) {
      setAddVehicleError('Seating capacity must be a positive whole number.');
      return;
    }
    if (newVehicle.currentMileage && (!/^\d+(?:\.\d{1,2})?$/.test(newVehicle.currentMileage) || Number(newVehicle.currentMileage) < 0)) {
      setAddVehicleError('Current mileage must be a non-negative number.');
      return;
    }
    if (!/^\d+(?:\.\d{1,2})?$/.test(newVehicle.purchaseValue) || !Number.isFinite(Number(newVehicle.purchaseValue)) || Number(newVehicle.purchaseValue) <= 0) {
      setAddVehicleError('Purchase value must be a positive amount in ETB.');
      return;
    }
    const validDate = (date) => {
      if (!date) return true;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
      const [year, month, day] = date.split('-').map(Number);
      const parsed = new Date(Date.UTC(year, month - 1, day));
      return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
    };
    const today = new Date().toISOString().slice(0, 10);
    if (![newVehicle.registrationDate, newVehicle.registrationExpiryDate, newVehicle.insuranceExpiryDate, newVehicle.lastMaintenanceDate, newVehicle.nextMaintenanceDate, newVehicle.assignmentDate, newVehicle.returnDate].every(validDate)) {
      setAddVehicleError('Enter valid calendar dates for the vehicle records.');
      return;
    }
    if (newVehicle.assignmentDate && newVehicle.assignmentDate > today) {
      setAddVehicleError('Assignment date cannot be in the future.');
      return;
    }
    if (newVehicle.returnDate && (!newVehicle.assignmentDate || newVehicle.returnDate <= newVehicle.assignmentDate)) {
      setAddVehicleError('Return / renewal due date must be after the assignment date.');
      return;
    }
    if (newVehicle.registrationDate && newVehicle.registrationDate > today) {
      setAddVehicleError('Registration date cannot be in the future.');
      return;
    }
    if (newVehicle.registrationDate && newVehicle.registrationExpiryDate
      && newVehicle.registrationExpiryDate <= newVehicle.registrationDate) {
      setAddVehicleError('Registration expiry date must be after the registration date.');
      return;
    }
    if (newVehicle.lastMaintenanceDate && newVehicle.lastMaintenanceDate > today) {
      setAddVehicleError('Last maintenance date cannot be in the future.');
      return;
    }
    if (newVehicle.nextMaintenanceDate && newVehicle.nextMaintenanceDate < today) {
      setAddVehicleError('Next maintenance date must be today or in the future.');
      return;
    }
    if (newVehicle.lastMaintenanceDate && newVehicle.nextMaintenanceDate
      && newVehicle.nextMaintenanceDate <= newVehicle.lastMaintenanceDate) {
      setAddVehicleError('Next maintenance date must be after the last maintenance date.');
      return;
    }

    setIsSavingVehicle(true);
    try {
      await axios.post(CREATE_API_URL, {
        ...newVehicle,
        vehicleNumber,
        make,
        model,
        employeeId: selectedEmployee?.employeeId || '',
        employeeName: selectedEmployee?.fullName || '',
        department: selectedEmployee?.department || newVehicle.department,
        remarks: newVehicle.remarks.trim(),
        manufacturingYear: newVehicle.manufacturingYear ? Number(newVehicle.manufacturingYear) : undefined,
        seatingCapacity: newVehicle.seatingCapacity ? Number(newVehicle.seatingCapacity) : undefined,
        currentMileage: newVehicle.currentMileage ? Number(newVehicle.currentMileage) : undefined,
        purchaseValue: Number(newVehicle.purchaseValue),
      }, authConfig());
      setNewVehicle(emptyVehicleForm);
      setEmployeeSearch('');
      setSelectedEmployee(null);
      setEmployeeSearchLoading(false);
      setIsAddVehicleOpen(false);
      setRecordsRefresh((current) => current + 1);
    } catch (requestError) {
      setAddVehicleError(requestError.response?.data?.message || 'Unable to add the vehicle record.');
    } finally {
      setIsSavingVehicle(false);
    }
  };

  const openAddVehicleForm = async () => {
    setAddVehicleError('');
    setNewVehicle(emptyVehicleForm);
    setEmployeeSearch('');
    setEmployeeResults([]);
    setSelectedEmployee(null);
    setEmployeeSearchLoading(false);
    setIsAddVehicleOpen(true);
    setDepartmentsLoading(true);
    try {
      const response = await axios.get(DEPARTMENTS_API_URL, authConfig());
      setDepartments((response.data.departments || [])
        .filter((item) => item.status === 'Active')
        .map((item) => item.name)
        .filter(Boolean));
    } catch (requestError) {
      setAddVehicleError(requestError.response?.data?.message || 'Unable to load departments.');
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const openVehicle = async (vehicleNumber) => {
    setSelectedVehicle({ vehicleNumber });
    setDetailLoading(true);
    setDetailError('');
    try {
      const response = await axios.get(`${API_URL}/${encodeURIComponent(vehicleNumber)}`, authConfig());
      setSelectedVehicle(response.data.vehicle);
    } catch (requestError) {
      setDetailError(requestError.response?.data?.message || 'Unable to load vehicle details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeVehicle = () => {
    setSelectedVehicle(null);
    setDetailError('');
  };

  const clearanceRequest = clearanceContext?.request;
  const recordCheck = clearanceContext?.recordCheck || {};
  const canApproveClearance = clearanceRequest?.status === 'Under Review'
    && recordCheck.hasAssignedVehicle !== null
    && recordCheck.hasAssignedVehicle !== undefined
    && transportChecklistFields.every((field) => ['Cleared', 'N/A'].includes(recordCheck[field]))
    && (recordCheck.hasAssignedVehicle
      ? vehicleChecklistFields.filter((field) => field !== 'vehicleAccessoriesReturned').every((field) => recordCheck[field] === 'Cleared')
      : vehicleChecklistFields.every((field) => recordCheck[field] === 'N/A'));

  const submitClearanceDecision = async (decision) => {
    if (!clearanceRequest?.requestId || decisionLoading) return;
    if (clearanceRequest.status !== 'Under Review') {
      setDecisionError('Start the Transport review before making a decision.');
      return;
    }
    if (decision === 'return' && !returnReason.trim()) {
      setDecisionError('Enter a return reason before returning this request.');
      return;
    }
    if (decision === 'approve' && !canApproveClearance) {
      setDecisionError('Complete every applicable Transport checklist item before approval.');
      return;
    }

    setDecisionLoading(true);
    setDecisionError('');
    setDecisionMessage('');
    try {
      const endpoint = decision === 'approve' ? 'approve' : 'return';
      const body = decision === 'approve'
        ? { recordCheck, officerNotes: clearanceContext.officerNotes || '' }
        : { recordCheck, returnReason: returnReason.trim(), officerComment: clearanceContext.officerNotes || '' };
      await axios.patch(`${REQUEST_API_URL}/${encodeURIComponent(clearanceRequest.requestId)}/${endpoint}`, body, authConfig());
      const status = decision === 'approve' ? 'Approved' : 'Returned';
      setClearanceContext((current) => ({ ...current, request: { ...current.request, status } }));
      setDecisionMessage(decision === 'approve' ? 'Transport clearance approved.' : 'Request returned to the employee.');
    } catch (requestError) {
      setDecisionError(requestError.response?.data?.message || 'Unable to save the Transport clearance decision.');
    } finally {
      setDecisionLoading(false);
    }
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-teal-700">Transport Office</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">Assigned Vehicle Records</h1>
          <p className="mt-1 text-xs text-slate-500">View current assignments and available vehicle assignment history.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-slate-500">{records.length} record{records.length === 1 ? '' : 's'}</p>
          <button
            type="button"
            onClick={openAddVehicleForm}
            className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-800"
          >
            <Plus size={15} />Add Vehicle Record
          </button>
        </div>
      </header>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.5fr)_repeat(3,minmax(145px,1fr))]">
        <label className="relative block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vehicle or employee..." className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-xs outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
        </label>
        <label className="text-[10px] font-semibold text-slate-600">
          <span className="sr-only">Department</span>
          <select value={department} onChange={(event) => setDepartment(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-normal outline-none focus:border-teal-600">
            <option value="All">All Departments</option>
            {filters.departments.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-[10px] font-semibold text-slate-600">
          <span className="sr-only">Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-normal outline-none focus:border-teal-600">
            <option value="All">All Statuses</option>
            {[...new Set([...statusOptions, ...filters.statuses])].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-[10px] font-semibold text-slate-600">
          <span className="sr-only">Vehicle type</span>
          <select value={vehicleType} onChange={(event) => setVehicleType(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-normal outline-none focus:border-teal-600">
            <option value="All">All Vehicle Types</option>
            {filters.vehicleTypes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>

      {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800">{error}</p>}

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Vehicle No.</th>
                <th className="px-4 py-3 font-semibold">Vehicle Type</th>
                <th className="px-4 py-3 font-semibold">Employee</th>
                <th className="px-4 py-3 font-semibold">Employee ID</th>
                <th className="px-4 py-3 font-semibold">Department</th>
                <th className="px-4 py-3 font-semibold">Assigned Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="8" className="px-4 py-12 text-center text-slate-500"><LoaderCircle size={17} className="mr-2 inline animate-spin" />Loading vehicle records...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan="8" className="px-4 py-12 text-center text-slate-500">No matching vehicle records found.</td></tr>
              ) : records.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-teal-800">{vehicle.vehicleNumber}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{vehicle.vehicleType}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">{vehicle.employeeName}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-600">{vehicle.employeeId}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{vehicle.department}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(vehicle.assignedDate)}</td>
                  <td className="px-4 py-3"><span className={`whitespace-nowrap rounded px-2 py-1 text-[10px] font-semibold ${statusStyle(vehicle.status)}`}>{vehicle.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => openVehicle(vehicle.vehicleNumber)} className="inline-flex items-center gap-1.5 rounded bg-teal-700 px-3 py-2 text-[10px] font-semibold text-white hover:bg-teal-800"><Eye size={13} />View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {clearanceRequest && <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-sm font-bold text-slate-900">Transport Clearance Decision</h2><p className="mt-1 text-xs text-slate-500">Request {clearanceRequest.requestId} · {clearanceRequest.employee?.fullName || clearanceRequest.employeeName} · {clearanceRequest.status}</p></div>
          {clearanceRequest.status === 'Under Review' && <span className="rounded-md bg-sky-50 px-2.5 py-1 text-[10px] font-semibold text-sky-700">Under Review</span>}
        </div>
        {decisionError && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{decisionError}</p>}
        {decisionMessage && <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{decisionMessage}</p>}
        {clearanceRequest.status === 'Under Review' && <label className="block text-xs font-semibold text-slate-700">Return Reason <span className="font-normal text-slate-500">(required to return)</span><textarea value={returnReason} onChange={(event) => { setReturnReason(event.target.value); setDecisionError(''); }} rows={2} maxLength={1000} className="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-xs outline-none focus:border-teal-600" placeholder="Explain why the clearance request is being returned." /></label>}
        {clearanceRequest.status === 'Under Review' && !canApproveClearance && <p className="text-[11px] text-amber-700"><AlertTriangle size={13} className="mr-1 inline" />Complete the applicable checklist in the clearance review before approving.</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
          <button type="button" onClick={() => submitClearanceDecision('return')} disabled={decisionLoading || clearanceRequest.status !== 'Under Review' || !returnReason.trim()} className="rounded-md border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50">{decisionLoading ? 'Saving...' : 'Return to Employee'}</button>
          <button type="button" onClick={() => submitClearanceDecision('approve')} disabled={decisionLoading || !canApproveClearance} title={!canApproveClearance ? 'Complete the applicable Transport checklist before approval' : undefined} className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 size={14} />{decisionLoading ? 'Saving...' : 'Approve / Clear'}</button>
        </div>
      </section>}

      {selectedVehicle && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) closeVehicle(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="vehicle-record-title" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-md bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-teal-700"><Bus size={19} /></span>
                <div>
                  <h2 id="vehicle-record-title" className="text-base font-bold text-slate-900">Vehicle Assignment Record</h2>
                  <p className="mt-0.5 text-xs text-slate-500">{selectedVehicle.vehicleNumber}</p>
                </div>
              </div>
              <button type="button" aria-label="Close vehicle details" onClick={closeVehicle} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6">
              {detailLoading ? (
                <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin" />Loading vehicle details...</div>
              ) : detailError ? (
                <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{detailError}</p>
              ) : (
                <>
                  <dl className="grid grid-cols-1 gap-x-5 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailItem label="Vehicle Number" value={selectedVehicle.vehicleNumber} />
                    <DetailItem label="Plate Number" value={selectedVehicle.plateNumber} />
                    <DetailItem label="Vehicle Type" value={selectedVehicle.vehicleType} />
                    <DetailItem label="Make / Model" value={selectedVehicle.makeModel} />
                    <DetailItem label="Manufacturing Year" value={selectedVehicle.manufacturingYear} />
                    <DetailItem label="Color" value={selectedVehicle.color} />
                    <DetailItem label="Seating Capacity" value={selectedVehicle.seatingCapacity} />
                    <DetailItem label="Current Mileage (km)" value={selectedVehicle.currentMileage} />
                    <DetailItem label="Chassis Number (VIN)" value={selectedVehicle.chassisNumber} />
                    <DetailItem label="Engine Number" value={selectedVehicle.engineNumber} />
                    <DetailItem label="Purchase Value (ETB)" value={selectedVehicle.purchaseValue ? Number(selectedVehicle.purchaseValue).toLocaleString() : '—'} />
                    <DetailItem label="Assigned Employee" value={selectedVehicle.employeeName} />
                    <DetailItem label="Employee ID" value={selectedVehicle.employeeId} />
                    <DetailItem label="Department" value={selectedVehicle.department} />
                    <DetailItem label="Registration Date" value={formatDate(selectedVehicle.registrationDate)} />
                    <DetailItem label="Registration Expiry Date" value={formatDate(selectedVehicle.registrationExpiryDate)} />
                    <DetailItem label="Insurance Expiry Date" value={formatDate(selectedVehicle.insuranceExpiryDate)} />
                    <DetailItem label="Last Maintenance Date" value={formatDate(selectedVehicle.lastMaintenanceDate)} />
                    <DetailItem label="Next Maintenance Date" value={formatDate(selectedVehicle.nextMaintenanceDate)} />
                    <DetailItem label="Assignment Date" value={formatDate(selectedVehicle.assignedDate)} />
                    <DetailItem label="Return Date" value={formatDate(selectedVehicle.returnDate)} />
                    <DetailItem label="Assignment Status" value={selectedVehicle.status} />
                    <DetailItem label="Condition" value={selectedVehicle.condition} />
                    <DetailItem label="Remarks" value={selectedVehicle.remarks} />
                  </dl>

                  <section>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div><h3 className="text-sm font-bold text-slate-900">Assignment History</h3><p className="mt-0.5 text-[10px] text-slate-500">Previous and current employee assignments recorded for this vehicle.</p></div>
                      <span className="text-xs text-slate-500">{selectedVehicle.assignmentHistory?.length || 0} entries</span>
                    </div>
                    <div className="overflow-x-auto rounded-md border border-slate-200">
                      <table className="w-full min-w-[680px] text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-2.5">Employee</th><th className="px-3 py-2.5">Employee ID</th><th className="px-3 py-2.5">Department</th><th className="px-3 py-2.5">Assigned Date</th><th className="px-3 py-2.5">Returned Date</th><th className="px-3 py-2.5">Status / Remarks</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedVehicle.assignmentHistory?.length ? selectedVehicle.assignmentHistory.map((entry, index) => (
                            <tr key={`${entry.assignedDate}-${index}`}>
                              <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-800">{entry.employeeName}</td>
                              <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-600">{entry.employeeId}</td>
                              <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{entry.department}</td>
                              <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{formatDate(entry.assignedDate)}</td>
                              <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{formatDate(entry.returnedDate)}</td>
                              <td className="px-3 py-2.5 text-slate-600">{[entry.status, entry.remarks].filter(Boolean).join(' · ') || '—'}</td>
                            </tr>
                          )) : (
                            <tr><td colSpan="6" className="px-3 py-8 text-center text-slate-500">No assignment history has been recorded for this vehicle yet.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}
            </div>

            <footer className="flex justify-end border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
              <button type="button" onClick={closeVehicle} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">Close</button>
            </footer>
          </section>
        </div>
      )}

      {isAddVehicleOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSavingVehicle) setIsAddVehicleOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="add-vehicle-title" className="w-full max-w-3xl overflow-hidden rounded-md bg-white shadow-2xl">
            <header className="flex items-center justify-between bg-teal-700 px-4 py-3 text-white sm:px-5">
              <div>
                <h2 id="add-vehicle-title" className="flex items-center gap-2 text-base font-bold"><Plus size={18} />Add New Vehicle</h2>
                <p className="mt-0.5 pl-6 text-[11px] text-teal-100">Transport Officer · Register a university vehicle</p>
              </div>
              <button type="button" aria-label="Close add vehicle form" disabled={isSavingVehicle} onClick={() => setIsAddVehicleOpen(false)} className="rounded p-1 hover:bg-white/10 disabled:opacity-50"><X size={18} /></button>
            </header>
            <form onSubmit={addVehicleRecord} className="max-h-[80vh] space-y-4 overflow-y-auto p-4 sm:p-5">
              {addVehicleError && <p role="alert" className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{addVehicleError}</p>}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-xs font-semibold text-slate-700">Plate Number *
                  <input required maxLength={30} value={newVehicle.vehicleNumber} onChange={(event) => setNewVehicle({ ...newVehicle, vehicleNumber: event.target.value })} placeholder="e.g. BDU-12345" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-teal-600" />
                </label>
                <label className="text-xs font-semibold text-slate-700">Vehicle Type *
                  <select required value={newVehicle.vehicleType} onChange={(event) => setNewVehicle({ ...newVehicle, vehicleType: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-teal-600">
                    <option value="">Select type</option>
                    {vehicleTypes.map((type) => <option key={type}>{type}</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-700">Make / Brand *
                  <input required maxLength={80} value={newVehicle.make} onChange={(event) => setNewVehicle({ ...newVehicle, make: event.target.value })} placeholder="e.g. Toyota" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-teal-600" />
                </label>
                <label className="text-xs font-semibold text-slate-700">Model
                  <input maxLength={80} value={newVehicle.model} onChange={(event) => setNewVehicle({ ...newVehicle, model: event.target.value })} placeholder="e.g. Hilux" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-teal-600" />
                </label>
                <label className="text-xs font-semibold text-slate-700">Manufacturing Year
                  <input type="number" min="1900" max={new Date().getFullYear()} step="1" value={newVehicle.manufacturingYear} onChange={(event) => setNewVehicle({ ...newVehicle, manufacturingYear: event.target.value })} placeholder="e.g. 2022" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-teal-600" />
                </label>
                <label className="text-xs font-semibold text-slate-700">Color
                  <input maxLength={40} value={newVehicle.color} onChange={(event) => setNewVehicle({ ...newVehicle, color: event.target.value })} placeholder="e.g. White" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-teal-600" />
                </label>
                <label className="text-xs font-semibold text-slate-700">Seating Capacity
                  <input type="number" min="1" step="1" value={newVehicle.seatingCapacity} onChange={(event) => setNewVehicle({ ...newVehicle, seatingCapacity: event.target.value })} placeholder="e.g. 25" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-teal-600" />
                </label>
                <label className="text-xs font-semibold text-slate-700">Current Mileage (km)
                  <input type="number" min="0" step="0.01" value={newVehicle.currentMileage} onChange={(event) => setNewVehicle({ ...newVehicle, currentMileage: event.target.value })} placeholder="e.g. 12500" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-teal-600" />
                </label>
                <label className="text-xs font-semibold text-slate-700">Chassis / Serial Number *
                  <input required minLength={1} maxLength={40} value={newVehicle.chassisNumber} onChange={(event) => setNewVehicle({ ...newVehicle, chassisNumber: event.target.value })} placeholder="Enter unique chassis / serial number" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-teal-600" />
                </label>
                <label className="text-xs font-semibold text-slate-700">Purchase Value (ETB) *
                  <input required type="number" min="0.01" step="0.01" value={newVehicle.purchaseValue} onChange={(event) => setNewVehicle({ ...newVehicle, purchaseValue: event.target.value })} placeholder="e.g. 2500000" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-teal-600" />
                </label>
                <label className="text-xs font-semibold text-slate-700">Engine Number
                  <input maxLength={40} value={newVehicle.engineNumber} onChange={(event) => setNewVehicle({ ...newVehicle, engineNumber: event.target.value })} placeholder="Enter engine number" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-teal-600" />
                </label>
                <div className="relative text-xs font-semibold text-slate-700 sm:col-span-2">
                  <label htmlFor="vehicle-employee-search">Assign to Employee (ID / Name)</label>
                  <div className="relative mt-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input id="vehicle-employee-search" maxLength={100} value={employeeSearch} onChange={(event) => {
                      setEmployeeSearch(event.target.value);
                      setEmployeeSearchLoading(Boolean(event.target.value.trim()));
                      setSelectedEmployee(null);
                      setNewVehicle({ ...newVehicle, employeeId: '', employeeName: '' });
                      setAddVehicleError('');
                    }} placeholder="Search active employee by ID or name" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm font-normal outline-none focus:border-teal-600" />
                    {employeeSearchLoading && <LoaderCircle size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-teal-700" />}
                  </div>
                  {selectedEmployee && (
                    <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-normal text-emerald-900">
                      Selected: <strong>{selectedEmployee.fullName}</strong> · {selectedEmployee.employeeId} · {selectedEmployee.department}
                      <button type="button" onClick={() => {
                        setSelectedEmployee(null);
                        setEmployeeSearch('');
                        setNewVehicle({ ...newVehicle, employeeId: '', employeeName: '' });
                      }} className="ml-2 font-semibold underline">Clear</button>
                    </div>
                  )}
                  {!selectedEmployee && employeeResults.length > 0 && (
                    <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                      {employeeResults.map((employee) => (
                        <li key={employee.employeeId}>
                          <button type="button" onClick={() => {
                            setSelectedEmployee(employee);
                            setEmployeeSearchLoading(false);
                            setAddVehicleError('');
                            setEmployeeSearch(`${employee.fullName} (${employee.employeeId})`);
                            setEmployeeResults([]);
                            setNewVehicle((current) => ({
                              ...current,
                              employeeId: employee.employeeId,
                              employeeName: employee.fullName,
                              department: employee.department || '',
                            }));
                          }} className="w-full px-3 py-2 text-left font-normal hover:bg-teal-50">
                            <span className="font-semibold">{employee.fullName}</span>
                            <span className="ml-2 text-slate-500">{employee.employeeId} · {employee.department}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!selectedEmployee && employeeSearch.trim().length > 0 && !employeeSearchLoading && employeeResults.length === 0 && (
                    <p className="mt-1 text-[11px] font-normal text-slate-500">No active employees found.</p>
                  )}
                </div>
                <label className="text-xs font-semibold text-slate-700">Assigned Department
                  <select value={newVehicle.department} onChange={(event) => setNewVehicle({ ...newVehicle, department: event.target.value })} disabled={departmentsLoading || Boolean(selectedEmployee)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-teal-600 disabled:bg-slate-100">
                    <option value="">{departmentsLoading ? 'Loading departments...' : 'Select department'}</option>
                    {departments.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-700">Vehicle Status *
                  <select required value={newVehicle.status} onChange={(event) => setNewVehicle({ ...newVehicle, status: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-teal-600">
                    <option value="">Select status</option>
                    {newVehicleStatuses.map((statusOption) => <option key={statusOption}>{statusOption}</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-700">Initial Condition *
                  <select required value={newVehicle.condition} onChange={(event) => setNewVehicle({ ...newVehicle, condition: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-teal-600">
                    <option value="">Select condition</option>
                    {vehicleConditions.map((condition) => <option key={condition}>{condition}</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-700">Assignment Date
                  <input type="date" max={new Date().toISOString().slice(0, 10)} value={newVehicle.assignmentDate} onChange={(event) => setNewVehicle({ ...newVehicle, assignmentDate: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-teal-600" />
                </label>
                <label className="text-xs font-semibold text-slate-700">Return / Renewal Due Date
                  <input type="date" min={newVehicle.assignmentDate || undefined} value={newVehicle.returnDate} onChange={(event) => setNewVehicle({ ...newVehicle, returnDate: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-teal-600" />
                </label>
                <label className="text-xs font-semibold text-slate-700">Registration Date
                  <input type="date" max={new Date().toISOString().slice(0, 10)} value={newVehicle.registrationDate} onChange={(event) => setNewVehicle({ ...newVehicle, registrationDate: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-teal-600" />
                </label>
                <label className="text-xs font-semibold text-slate-700">Registration Expiry Date
                  <input type="date" min={newVehicle.registrationDate || undefined} value={newVehicle.registrationExpiryDate} onChange={(event) => setNewVehicle({ ...newVehicle, registrationExpiryDate: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-teal-600" />
                </label>
                <label className="text-xs font-semibold text-slate-700">Insurance Expiry Date
                  <input type="date" min={new Date().toISOString().slice(0, 10)} value={newVehicle.insuranceExpiryDate} onChange={(event) => setNewVehicle({ ...newVehicle, insuranceExpiryDate: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-teal-600" />
                </label>
                <label className="text-xs font-semibold text-slate-700">Last Maintenance Date
                  <input type="date" max={new Date().toISOString().slice(0, 10)} value={newVehicle.lastMaintenanceDate} onChange={(event) => setNewVehicle({ ...newVehicle, lastMaintenanceDate: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-teal-600" />
                </label>
                <label className="text-xs font-semibold text-slate-700">Next Maintenance Date
                  <input type="date" min={new Date().toISOString().slice(0, 10)} value={newVehicle.nextMaintenanceDate} onChange={(event) => setNewVehicle({ ...newVehicle, nextMaintenanceDate: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-teal-600" />
                </label>
                <label className="text-xs font-semibold text-slate-700 sm:col-span-2 lg:col-span-3">Remarks
                  <textarea rows={3} maxLength={1000} value={newVehicle.remarks} onChange={(event) => setNewVehicle({ ...newVehicle, remarks: event.target.value })} placeholder="Optional notes" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-teal-600" />
                </label>
              </div>
              <footer className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button type="button" disabled={isSavingVehicle} onClick={() => setIsAddVehicleOpen(false)} className="rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isSavingVehicle} className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50">
                  {isSavingVehicle ? <><LoaderCircle size={14} className="animate-spin" />Saving...</> : <><Plus size={14} />Save Vehicle</>}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}