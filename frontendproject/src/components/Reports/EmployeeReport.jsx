import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchEmployees } from '../../until/EmployeeHelper';
import { 
  Users, ChevronLeft, Download, FileSpreadsheet, BarChart3,
  TrendingUp, Activity, AlertCircle
} from 'lucide-react';

export default function EmployeeReport() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');

  useEffect(() => {
    fetchEmployees()
      .then(data => {
        setEmployees(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const departments = useMemo(() => 
    [...new Set(employees.map(e => e.department?.name || e.department || 'Unknown'))],
    [employees]
  );

  const filteredEmployees = useMemo(() => 
    departmentFilter === 'All Departments' 
      ? employees 
      : employees.filter(e => (e.department?.name || e.department) === departmentFilter),
    [employees, departmentFilter]
  );

  const stats = useMemo(() => {
    const total = filteredEmployees.length;
    const active = filteredEmployees.filter(e => String(e.status).toLowerCase() === 'active').length;
    const inactive = total - active;
    const byDepartment = filteredEmployees.reduce((acc, emp) => {
      const dept = emp.department?.name || emp.department || 'Unknown';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});
    const byStatus = filteredEmployees.reduce((acc, emp) => {
      const status = emp.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    return { total, active, inactive, byDepartment, byStatus };
  }, [filteredEmployees]);

  const exportReport = (format) => {
    if (format === 'pdf') {
      window.print();
      return;
    }

    const rows = [
      ['Employee ID', 'Name', 'Department', 'Position', 'Email', 'Phone', 'Status', 'Hire Date'],
      ...filteredEmployees.map(emp => [
        emp.employeeId || '-',
        emp.fullName || emp.name || '-',
        emp.department?.name || emp.department || '-',
        emp.position || '-',
        emp.email || '-',
        emp.phone || '-',
        emp.status || 'Active',
        emp.hireDate ? new Date(emp.hireDate).toLocaleDateString() : '-'
      ])
    ];

    const csv = rows.map(row => 
      row.map(value => `"${String(value).replaceAll('"', '""')}"`)
        .join(',')
    ).join('\n');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'employee-report.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-10">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/hr-office/reports')}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <div className="flex items-center space-x-2">
            <Users size={24} className="text-blue-600" />
            <h1 className="text-xl font-bold text-slate-800">Employee Report</h1>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => exportReport('csv')}
            className="border border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-medium px-3 py-2 rounded flex items-center space-x-1"
          >
            <FileSpreadsheet size={16} />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={() => exportReport('pdf')}
            className="border border-red-500 text-red-500 hover:bg-red-50 font-medium px-3 py-2 rounded flex items-center space-x-1"
          >
            <Download size={16} />
            <span>Export PDF</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm mb-1">Total Employees</p>
            <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
            <p className="text-xs text-slate-400 mt-2">
              <TrendingUp size={12} className="inline mr-1" />
              Registered in system
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm mb-1">Active Employees</p>
            <p className="text-3xl font-bold text-emerald-600">{stats.active}</p>
            <p className="text-xs text-slate-400 mt-2">
              {stats.total ? ((stats.active / stats.total) * 100).toFixed(1) : 0}% of total
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm mb-1">Inactive Employees</p>
            <p className="text-3xl font-bold text-amber-600">{stats.inactive}</p>
            <p className="text-xs text-slate-400 mt-2">
              {stats.total ? ((stats.inactive / stats.total) * 100).toFixed(1) : 0}% of total
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm mb-1">Total Departments</p>
            <p className="text-3xl font-bold text-purple-600">{departments.length}</p>
            <p className="text-xs text-slate-400 mt-2">Across organization</p>
          </div>
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          
          {/* By Department */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center space-x-2">
              <BarChart3 size={16} className="text-blue-600" />
              <span>Employees by Department</span>
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.byDepartment)
                .sort((a, b) => b[1] - a[1])
                .map(([dept, count]) => (
                  <div key={dept}>
                    <div className="flex justify-between text-sm text-slate-600 mb-1">
                      <span>{dept}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600" 
                        style={{ width: `${stats.total ? (count / stats.total) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>

          {/* By Status */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center space-x-2">
              <Activity size={16} className="text-emerald-600" />
              <span>Employees by Status</span>
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.byStatus)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count], idx) => {
                  const colors = ['bg-emerald-600', 'bg-amber-600', 'bg-red-600', 'bg-slate-600'];
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-sm text-slate-600 mb-1">
                        <span>{status}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${colors[idx % colors.length]}`}
                          style={{ width: `${stats.total ? (count / stats.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </div>
        </div>

        {/* Filter and Table */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-700">Employee List</h3>
            <select 
              value={departmentFilter} 
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm text-slate-700 focus:outline-none"
            >
              <option>All Departments</option>
              {departments.map(dept => <option key={dept}>{dept}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-medium">
                  <th className="pb-3">#</th>
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Employee ID</th>
                  <th className="pb-3">Department</th>
                  <th className="pb-3">Position</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="7" className="py-6 text-center text-slate-400">Loading...</td></tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr><td colSpan="7" className="py-6 text-center text-slate-400">No employees found</td></tr>
                ) : (
                  filteredEmployees.map((emp, idx) => (
                    <tr key={emp._id} className="hover:bg-slate-50">
                      <td className="py-3 text-slate-500">{idx + 1}</td>
                      <td className="py-3 font-medium text-slate-800">{emp.fullName || emp.name || '-'}</td>
                      <td className="py-3 text-slate-600">{emp.employeeId || '-'}</td>
                      <td className="py-3 text-slate-600">{emp.department?.name || emp.department || '-'}</td>
                      <td className="py-3 text-slate-600">{emp.position || '-'}</td>
                      <td className="py-3 text-slate-600">{emp.email || '-'}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          String(emp.status).toLowerCase() === 'active' 
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {emp.status || 'Unknown'}
                        </span>
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
