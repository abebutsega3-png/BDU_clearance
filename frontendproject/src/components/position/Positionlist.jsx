import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiEye } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const statusOptions = ['All Status', 'Active', 'Inactive'];

export default function PositionList() {
  const navigate = useNavigate();
  const [positions, setPositions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/api/positions', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPositions(response.data.positions || []);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load positions.');
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();
  }, []);

  const departmentOptions = useMemo(
    () => ['All Departments', ...new Set(positions.map((item) => item.department).filter(Boolean))],
    [positions]
  );

  const filteredPositions = useMemo(() => {
    return positions.filter((position) => {
      const matchesSearch = position.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment = departmentFilter === 'All Departments' || position.department === departmentFilter;
      const matchesStatus = statusFilter === 'All Status' || position.status === statusFilter;
      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [positions, searchTerm, departmentFilter, statusFilter]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-4 flex items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="cursor-pointer hover:text-blue-600">Dashboard</span>
            <span>{'>'}</span>
            <span className="cursor-pointer hover:text-blue-600">Position / Job Title</span>
            <span>{'>'}</span>
            <span className="font-medium text-slate-700">All Positions</span>
          </div>
        </div>

        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">All Positions / Job Titles</h1>
            <p className="mt-1 text-sm text-slate-500">Manage all job positions in the university</p>
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
              <div className="relative w-full md:max-w-[320px]">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search position by name..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-slate-400" />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Filter by Department</label>
                  <select
                    value={departmentFilter}
                    onChange={(event) => setDepartmentFilter(event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {departmentOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Filter by Status</label>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/admin/add-position')}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
            >
              <FiPlus className="text-base" />
              Add New Position
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <span className="text-sm font-medium text-slate-700">Total Positions: {filteredPositions.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Position / Job Title</th>
                  <th className="px-4 py-3">Department / Office</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created At</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-10 text-center text-sm text-slate-500">
                      Loading positions...
                    </td>
                  </tr>
                ) : filteredPositions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-10 text-center text-sm text-slate-500">
                      No positions match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredPositions.map((position, index) => (
                    <tr key={position.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{position.title}</td>
                      <td className="px-4 py-3 text-slate-600">{position.department}</td>
                      <td className="px-4 py-3 text-slate-600">{position.description || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            position.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {position.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {position.createdAt ? new Date(position.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 text-lg">
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/view-position/${position.id}`)}
                            className="text-blue-600 hover:text-blue-800"
                            aria-label="View position"
                          >
                            <FiEye />
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/edit-position/${position.id}`)}
                            className="text-blue-600 hover:text-blue-800"
                            aria-label="Edit position"
                          >
                            <FiEdit2 />
                          </button>
                          <button type="button" className="text-red-600 hover:text-red-800" aria-label="Delete position">
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
