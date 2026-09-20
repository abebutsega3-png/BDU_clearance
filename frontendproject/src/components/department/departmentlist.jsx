import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FiEdit2, FiEye, FiPlus, FiSearch } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

export default function DepartmentList() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/api/departments', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDepartments(response.data.departments || []);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load departments.');
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  const filteredDepartments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return departments;

    return departments.filter((department) =>
      [department.name, department.code, department.type, department.campus, department.head]
        .some((value) => String(value || '').toLowerCase().includes(query))
    );
  }, [departments, searchTerm]);

  return (
    <div className="bg-gray-50 min-h-screen p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="text-xs font-bold tracking-wider text-blue-700 uppercase">
              Bahir Dar University
            </span>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">
              Department Management
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Manage departments participating in the university clearance process.
            </p>
          </div>
          <button 
            onClick={() => navigate('/admin/add-department')}
            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg shadow-sm transition-colors text-sm cursor-pointer"
          >
            <FiPlus className="mr-2 text-base" /> Add New Department
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="relative max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search departments"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 border-b border-gray-200 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-5 py-4">S No</th>
                <th className="px-5 py-4">Department Name</th>
                <th className="px-5 py-4">Code</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Campus</th>
                <th className="px-5 py-4">Department Head</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="7" className="px-5 py-8 text-center text-gray-500">Loading departments...</td></tr>
              ) : filteredDepartments.length === 0 ? (
                <tr><td colSpan="7" className="px-5 py-8 text-center text-gray-500">No departments found.</td></tr>
              ) : filteredDepartments.map((department, index) => (
                <tr key={department.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 text-gray-500">{index + 1}</td>
                  <td className="px-5 py-4 font-medium text-gray-900">{department.name}</td>
                  <td className="px-5 py-4 text-gray-600">{department.code}</td>
                  <td className="px-5 py-4 text-gray-600">{department.type}</td>
                  <td className="px-5 py-4 text-gray-600">{department.campus}</td>
                  <td className="px-5 py-4 text-gray-600">{department.head}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <button type="button" title="View department" onClick={() => navigate(`/admin/view-department/${department.id}`)} className="text-blue-600 hover:text-blue-800">
                        <FiEye />
                      </button>
                      <button type="button" title="Edit department" onClick={() => navigate(`/admin/edit-department/${department.id}`)} className="text-amber-600 hover:text-amber-800">
                        <FiEdit2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}