import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const EditDepartment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [department, setDepartment] = useState({
    departmentName: '',
    departmentCode: '',
    departmentType: '',
    campus: '',
    departmentHead: '',
    status: 'Active',
  });
  
  const [depLoading, setDepLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Campus አማራጮች እንደ Bahir Dar University አሰራር
  const campusOptions = ['Main Campus', 'BiT', 'EITEX', 'Peda', 'Zenzelma'];
  const typeOptions = ['Academic Department', 'Administrative Department', 'Support Department', 'Service Department', 'Other'];

  useEffect(() => {
    const fetchDepartment = async () => {
      setDepLoading(true);
      try {
        const response = await axios.get(
          `http://localhost:3000/api/departments/${id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        
        if (response.data.success) setDepartment(response.data.department);
      } catch (error) {
        alert(error.response?.data?.message || 'Unable to load department.');
      } finally {
        setDepLoading(false);
      }
    };

    fetchDepartment();
  }, [id]);

  // መረጃውን ወደ ሰርቨር ለመላክ (Update ለማድረግ)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedName = department.departmentName.trim();
    if (!/^[\p{L}]+(?:[\s'-]+[\p{L}]+)*$/u.test(normalizedName)) {
      alert('Department name may contain letters, spaces, apostrophes, and hyphens only.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.put(
        `http://localhost:3000/api/departments/${id}`,
        { ...department, departmentName: normalizedName },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) navigate('/admin/departments', { replace: true });
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to update department.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Edit Department</h2>
        
        {depLoading ? (
          <p className="text-sm text-gray-500">Loading department details...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Department Name */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Department Name</label>
              <input
                type="text"
                value={department?.departmentName || ''}
                onChange={(e) => setDepartment({ ...department, departmentName: e.target.value })}
                pattern="[\p{L}]+(?:[\s'-]+[\p{L}]+)*"
                title="Use letters, spaces, apostrophes, and hyphens only."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                required
              />
            </div>

            {/* Department Code */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Department Code</label>
              <input
                type="text"
                value={department?.departmentCode || ''}
                onChange={(e) => setDepartment({ ...department, departmentCode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                required
              />
            </div>

            {/* Department Type */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Department Type</label>
              <select
                value={department?.departmentType || ''}
                onChange={(e) => setDepartment({ ...department, departmentType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Select Type</option>
                {typeOptions.map((type, idx) => (
                  <option key={idx} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Campus */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Campus</label>
              <select
                value={department?.campus || ''}
                onChange={(e) => setDepartment({ ...department, campus: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Select Campus</option>
                {campusOptions.map((campus, idx) => (
                  <option key={idx} value={campus}>{campus}</option>
                ))}
              </select>
            </div>

            {/* Department Head */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Department Head</label>
              <input
                type="text"
                value={department?.departmentHead || ''}
                onChange={(e) => setDepartment({ ...department, departmentHead: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={department?.status || 'Active'}
                onChange={(e) => setDepartment({ ...department, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Updating...' : 'Update Department'}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
};

export default EditDepartment;