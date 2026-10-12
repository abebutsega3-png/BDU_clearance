import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Plus, Search, GraduationCap, CheckCircle, Clock, 
  AlertTriangle, X, FileText, Send 
} from 'lucide-react';

const RegisterAcademicRecords = () => {
  const [records, setRecords] = useState([]);
  const [overview, setOverview] = useState({
    totalEmployees: 0,
    verifiedRecords: 0,
    pendingVerifications: 0,
    returnedMissing: 0
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    department: '',
    degreeLevel: 'BSc',
    gradYear: '',
    gradInstitution: '',
    documentStatus: 'Pending',
    gradeSubmissionStatus: 'All Submitted'
  });

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Fetch data from MongoDB
  const fetchRecords = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/academic-records', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.data?.success || !Array.isArray(res.data.records)) {
        throw new Error(res.data?.message || 'Academic records were not returned by the server.');
      }
      setRecords(res.data.records);
      setOverview(res.data.overview || {
        totalEmployees: 0,
        verifiedRecords: 0,
        pendingVerifications: 0,
        returnedMissing: 0
      });
    } catch (err) {
      console.error("Error fetching academic records:", err);
      setLoadError(err.response?.data?.message || err.message || 'Unable to load academic records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Form Input Change Handler
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Submit New Academic Record
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/academic-records/add', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setIsModalOpen(false); // Close Modal
        await fetchRecords(); // Refresh list from DB
        setFormData({
          employeeId: '',
          fullName: '',
          department: '',
          degreeLevel: 'BSc',
          gradYear: '',
          gradInstitution: '',
          documentStatus: 'Pending',
          gradeSubmissionStatus: 'All Submitted'
        });
      }
    } catch (err) {
      console.error("Error adding academic record:", err);
      setSubmitError(err.response?.data?.message || err.message || 'Unable to save academic record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-gray-800 font-sans p-6 bg-gray-50 min-h-screen">
      
      {/* 1. Header with Title & Add Record Button */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-600" />
            Academic Records Verification Dashboard
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Verify employee degrees, diplomas, and check educational liabilities[cite: 5, 25].
          </p>
        </div>

        {/* Add Academic Record Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition flex items-center space-x-2 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Academic Record</span>
        </button>
      </div>

      {loadError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{loadError}</span>
          <button type="button" onClick={fetchRecords} className="shrink-0 font-semibold underline">Retry</button>
        </div>
      )}

      {/* 2. Filters Row */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Employee Name or ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 bg-white"
        >
          <option value="All">Status: All (Verified, Pending, Returned)</option>
          <option value="Verified">Verified</option>
          <option value="Pending">Pending</option>
          <option value="Returned">Returned</option>
        </select>
      </div>

      {/* 3. Main Content: Table & Overview Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Table (3 Columns wide) */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Employee Academic Record Verifications</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-3">Employee ID</th>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Degree</th>
                  <th className="p-3">Year</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr><td colSpan="7" className="p-6 text-center text-gray-500">Loading academic records...</td></tr>
                )}
                {!loading && !loadError && records.length === 0 && (
                  <tr><td colSpan="7" className="p-6 text-center text-gray-500">No academic records found.</td></tr>
                )}
                {records.map((rec) => (
                  <tr key={rec._id} className="hover:bg-gray-50 transition">
                    <td className="p-3 font-medium text-gray-800">{rec.employeeId}</td>
                    <td className="p-3 font-semibold text-gray-900">{rec.fullName}</td>
                    <td className="p-3 text-gray-600">{rec.department}</td>
                    <td className="p-3 text-gray-600">{rec.degreeLevel}</td>
                    <td className="p-3 text-gray-500">{rec.gradYear}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${
                        rec.documentStatus === 'Verified' ? 'bg-emerald-100 text-emerald-700' :
                        rec.documentStatus === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {rec.documentStatus}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 rounded hover:bg-blue-100 font-medium text-[11px]">
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Overview Box */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3 text-xs">
            <h4 className="font-bold text-gray-800 border-b pb-2">Department Overviews</h4>
            <div className="p-3 bg-blue-50/50 rounded-lg">
              <p className="text-gray-500">Total Employees</p>
              <p className="text-xl font-bold text-blue-900">{overview.totalEmployees}</p>
            </div>
            <div className="p-3 bg-emerald-50/50 rounded-lg">
              <p className="text-emerald-700">Verified Records</p>
              <p className="text-xl font-bold text-emerald-900">{overview.verifiedRecords}</p>
            </div>
            <div className="p-3 bg-amber-50/50 rounded-lg">
              <p className="text-amber-700">Pending Verifications</p>
              <p className="text-xl font-bold text-amber-900">{overview.pendingVerifications}</p>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Modal Popup: Add Academic Record */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Add New Academic Record</span>
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 text-xs">
              {submitError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-700">{submitError}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Employee ID</label>
                  <input
                    type="text"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. BDU0123"
                    className="w-full p-2 border rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. Fitsum Alemu"
                    className="w-full p-2 border rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. Computer Science"
                    className="w-full p-2 border rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Degree Level</label>
                  <select
                    name="degreeLevel"
                    value={formData.degreeLevel}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded-lg focus:outline-none focus:border-blue-600 bg-white"
                  >
                    <option value="BSc">BSc / Diploma</option>
                    <option value="MSc">MSc / MA</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Graduation Year</label>
                  <input
                    type="number"
                    name="gradYear"
                    value={formData.gradYear}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. 2021"
                    className="w-full p-2 border rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Institution</label>
                  <input
                    type="text"
                    name="gradInstitution"
                    value={formData.gradInstitution}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. BDU / AAU"
                    className="w-full p-2 border rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center space-x-1 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Record'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default RegisterAcademicRecords;