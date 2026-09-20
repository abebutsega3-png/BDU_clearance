import React, { useEffect, useState, useMemo } from 'react';
import { FiEdit2, FiEye, FiPlus, FiSearch } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { fetchEmployees } from '../../until/EmployeeHelper';

export default function EmployeeList() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    department: 'All Departments',
    campus: 'All Campuses',
    employmentType: 'All Types',
    status: 'Active'
  });

  const [departments, setDepartments] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [employmentTypes, setEmploymentTypes] = useState([]);

  const loadEmployees = async () => {
    try {
      const data = await fetchEmployees();
      setEmployees(data);
      
      // Extract unique values for filters
      const uniqueDepts = ['All Departments', ...new Set(data.map(e => e.department).filter(Boolean))];
      const uniqueCampuses = ['All Campuses', ...new Set(data.map(e => e.campus).filter(Boolean))];
      const uniqueTypes = ['All Types', ...new Set(data.map(e => e.employmentType).filter(Boolean))];
      
      setDepartments(uniqueDepts);
      setCampuses(uniqueCampuses);
      setEmploymentTypes(uniqueTypes);
    }
    catch (requestError) { 
      setError(requestError.response?.data?.message || 'Unable to load employees.');
    }
    finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    loadEmployees(); 
  }, []);

  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const matchSearch = employee.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.phone?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchDept = filters.department === 'All Departments' || employee.department === filters.department;
      const matchCampus = filters.campus === 'All Campuses' || employee.campus === filters.campus;
      const matchType = filters.employmentType === 'All Types' || employee.employmentType === filters.employmentType;
      const matchStatus = filters.status === 'All' || employee.status === filters.status;
      
      return matchSearch && matchDept && matchCampus && matchType && matchStatus;
    });
  }, [employees, searchTerm, filters]);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleReset = () => {
    setSearchTerm('');
    setFilters({
      department: 'All Departments',
      campus: 'All Campuses',
      employmentType: 'All Types',
      status: 'Active'
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-full">
        {/* Header Section */}
        <div className="mb-6">
          <p className="text-xs text-slate-500">Dashboard / Employees / Employee List</p>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Employee List</h1>
              <p className="mt-1 text-sm text-slate-600">View and manage all employees in the organization.</p>
            </div>
            <button 
              type="button" 
              onClick={() => navigate('/hr-office/add-employee')} 
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <FiPlus /> Add Employee
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <FiSearch className="text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID, phone or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 border-0 bg-transparent outline-none text-sm"
            />
          </div>
        </div>

        {/* Filters Section */}
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
              <select
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Campus</label>
              <select
                value={filters.campus}
                onChange={(e) => handleFilterChange('campus', e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {campuses.map(campus => (
                  <option key={campus} value={campus}>{campus}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Employment Type</label>
              <select
                value={filters.employmentType}
                onChange={(e) => handleFilterChange('employmentType', e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {employmentTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="mt-6 flex-1 rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3 w-12">S NO</th>
                <th className="px-4 py-3">Employee ID</th>
                <th className="px-4 py-3">Photo</th>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Gender</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Employment Type</th>
                <th className="px-4 py-3">Campus</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="w-32 px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {error ? (
                <tr>
                  <td colSpan="12" className="px-4 py-10 text-center text-red-600">{error}</td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan="12" className="px-4 py-10 text-center text-slate-500">Loading employees...</td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="12" className="px-4 py-10 text-center text-slate-500">No employees found.</td>
                </tr>
              ) : (
                filteredEmployees.map((employee, index) => (
                  <tr key={employee._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-center font-medium text-slate-600">{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{employee.employeeId}</td>
                    <td className="px-4 py-3">
                      {employee.photo ? (
                        <img 
                          src={employee.photo} 
                          alt={employee.fullName}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-slate-300 flex items-center justify-center text-xs font-bold text-white">
                          {employee.fullName?.charAt(0) || 'N'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-900">{employee.fullName}</td>
                    <td className="px-4 py-3 text-slate-700">{employee.gender || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{employee.department || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{employee.position || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{employee.employmentType || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{employee.campus || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{employee.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                        employee.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {employee.status}
                      </span>
                    </td>
                    <td className="w-32 px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          type="button" 
                          aria-label="View employee" 
                          onClick={() => navigate(`/hr-office/view-employee/${employee._id}`)}
                          title="View employee"
                          className="inline-flex h-7 w-7 items-center justify-center text-slate-600 hover:text-blue-600"
                        >
                          <FiEye />
                        </button>
                        <button 
                          type="button" 
                          aria-label="Edit employee" 
                          onClick={() => navigate(`/hr-office/edit-employee/${employee._id}`)}
                          title="Edit employee"
                          className="inline-flex h-7 w-7 items-center justify-center text-slate-600 hover:text-blue-600"
                        >
                          <FiEdit2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Results Count */}
        {!loading && !error && (
          <div className="mt-4 text-sm text-slate-600">
            Showing {filteredEmployees.length} of {employees.length} employees
          </div>
        )}
      </div>
    </main>
  );
}
