import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bus, Eye, LoaderCircle, Search, X } from 'lucide-react';

const API_URL = 'http://localhost:3000/api/transport/assigned-vehicles';
const statusOptions = ['Assigned', 'Returned', 'Available', 'Under Maintenance', 'Lost'];

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
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({ departments: [], vehicleTypes: [], statuses: [] });
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [status, setStatus] = useState('All');
  const [vehicleType, setVehicleType] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

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
  }, [search, department, status, vehicleType]);

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

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-teal-700">Transport Office</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">Assigned Vehicle Records</h1>
          <p className="mt-1 text-xs text-slate-500">View current assignments and available vehicle assignment history.</p>
        </div>
        <p className="text-xs text-slate-500">{records.length} record{records.length === 1 ? '' : 's'}</p>
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
                    <DetailItem label="Assigned Employee" value={selectedVehicle.employeeName} />
                    <DetailItem label="Employee ID" value={selectedVehicle.employeeId} />
                    <DetailItem label="Department" value={selectedVehicle.department} />
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
    </section>
  );
}