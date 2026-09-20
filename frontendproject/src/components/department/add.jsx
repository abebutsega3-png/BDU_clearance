import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaBuilding, FaGlobe, FaToggleOn } from 'react-icons/fa';

export default function AddDepartment() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    departmentName: '',
    departmentCode: '',
    description: '',
    departmentType: 'Academic Department',
    campus: '',
    collegeInstitute: '',
    building: '',
    office: '',
    status: 'Active',
  });

  // ለሎዲንግ እና ለተለያዩ ማሳወቂያዎች የሚረዱ ስቴቶች
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // ተጠቃሚው ማስተካከል ሲጀምር የድሮውን ኤረር ማጥፋት
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedName = formData.departmentName.trim();
    if (!/^[\p{L}]+(?:[\s'-]+[\p{L}]+)*$/u.test(normalizedName)) {
      setErrorMessage('Department name may contain letters, spaces, apostrophes, and hyphens only.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:3000/api/departments',
        { ...formData, departmentName: normalizedName },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      navigate('/admin/departments', { replace: true });
    } catch (err) {
      console.error('Error adding department:', err);

      if (err.response?.status === 409) {
        setErrorMessage(err.response.data?.message || 'Department code or name already exists.');
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('token');
        setErrorMessage(err.response.data?.message || 'Your session is not valid. Please log in again.');
      } else if (err.response?.status === 400) {
        setErrorMessage(err.response.data?.message || 'Please complete all required fields.');
      } else if (err.response?.status === 503) {
        setErrorMessage(err.response.data?.message || 'Database unavailable. Please start MongoDB and try again.');
      } else {
        setErrorMessage(err.response?.data?.message || err.message || 'Failed to register department. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-6 border-b pb-3">Add New Department</h2>
        
        {/* የስህተት ወይም የማስጠንቀቂያ መልእክት ማሳያ */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 3-Column Grid Layout matching the design */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            
            {/* Column 1: Basic Department Info */}
            <div className="space-y-4 p-4 bg-slate-50/50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2 text-slate-700 font-medium text-sm border-b pb-2">
                <FaBuilding className="text-blue-600" />
                <span>Basic Department Info</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Department Name (የክፍል ስም) *</label>
                <input 
                  type="text" 
                  name="departmentName" 
                  placeholder="Enter department name"
                  value={formData.departmentName} 
                  onChange={handleChange} 
                  pattern="[\p{L}]+(?:[\s'-]+[\p{L}]+)*"
                  title="Use letters, spaces, apostrophes, and hyphens only."
                  required 
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows="3" placeholder="Short department description" className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Department Code (የክፍል አቋርጭ ኮድ) *</label>
                <input 
                  type="text" 
                  name="departmentCode" 
                  placeholder="Enter code (e.g., CS, FIN)"
                  value={formData.departmentCode} 
                  onChange={handleChange} 
                  required 
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Department Type (የክፍል ዓይነት) *</label>
                <select 
                  name="departmentType" 
                  value={formData.departmentType} 
                  onChange={handleChange} 
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="Academic Department">Academic Department</option>
                  <option value="Administrative Department">Administrative Department</option>
                  <option value="Support Department">Support Department</option>
                </select>
              </div>
            </div>

            {/* Column 2: Location & Campus */}
            <div className="space-y-4 p-4 bg-slate-50/50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2 text-slate-700 font-medium text-sm border-b pb-2">
                <FaGlobe className="text-blue-600" />
                <span>Location & Campus</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Campus</label>
                <select 
                  name="campus" 
                  value={formData.campus} 
                  onChange={handleChange} 
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Select campus (Optional)</option>
                  <option value="Main (Peda) Campus">Main (Peda) Campus</option>
                  <option value="BiT (Poly) Campus">BiT (Poly) Campus</option>
                  <option value="Zenzelma Campus">Zenzelma Campus</option>
                  <option value="Gish Abay Campus">Gish Abay Campus</option>
                  <option value="Tibebe Ghion Campus">Tibebe Ghion Campus</option>
                  <option value="Tana Campus">Tana Campus</option>
                  <option value="Gish Abay / Yibab Campus">Gish Abay / Yibab Campus</option>
                  <option value="Selam (EiTEX) Campus">Selam (EiTEX) Campus</option>
                  <option value="Gilgel Abay Campus">Gilgel Abay Campus</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">College / Institute</label>
                <input type="text" name="collegeInstitute" value={formData.collegeInstitute} onChange={handleChange} placeholder="e.g., College of Computing (Optional)" className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Building Name/Number (ህንፃ)</label>
                <input 
                  type="text" 
                  name="building" 
                  placeholder="e.g., Block 42"
                  value={formData.building} 
                  onChange={handleChange} 
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Office / Room Number (የቢሮ ቁጥር)</label>
                <input 
                  type="text" 
                  name="office" 
                  placeholder="e.g., Room 204"
                  value={formData.office} 
                  onChange={handleChange} 
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" 
                />
              </div>
            </div>

            {/* Column 3: Department Status */}
            <div className="space-y-4 p-4 bg-slate-50/50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2 text-slate-700 font-medium text-sm border-b pb-2">
                <FaToggleOn className="text-blue-600" />
                <span>Department Status</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status *</label>
                <select name="status" value={formData.status} onChange={handleChange} required className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

          </div>

          {/* Form Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button 
              type="button" 
              onClick={() => navigate('/admin/departments')} 
              className="px-4 py-2 border border-gray-300 rounded text-xs hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-5 py-2 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}