import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiSave, FiX, FiBriefcase } from 'react-icons/fi';

export default function AddPosition() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    department: '',
    description: '',
    status: 'Active',
  });
  const [departments, setDepartments] = useState([]);
  const [charCount, setCharCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/api/departments', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDepartments(response.data.departments || []);
      } catch {
        setDepartments([]);
      }
    };

    loadDepartments();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'description') {
      setCharCount(value.length);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedTitle = formData.title.trim();
    if (!/^[\p{L}]+(?:[\s'-]+[\p{L}]+)*$/u.test(normalizedTitle)) {
      setErrorMessage('Position title may contain letters, spaces, apostrophes, and hyphens only.');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:3000/api/positions',
        {
          title: normalizedTitle,
          code: formData.code,
          department: formData.department,
          description: formData.description,
          status: formData.status,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      navigate('/admin/positions');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Unable to save position. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Add New Position / Job Title</h1>
            <p className="mt-1 text-sm text-slate-500">Create a new position for the university</p>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-700">
              S
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-slate-600">System Administrator</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2 border-b border-slate-200 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 text-blue-700">
              <FiBriefcase className="text-lg" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Position Information</h2>
          </div>

          {errorMessage && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Position Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  pattern="[\p{L}]+(?:[\s'-]+[\p{L}]+)*"
                  title="Use letters, spaces, apostrophes, and hyphens only."
                  placeholder="Enter position title (e.g., Lecturer, Accountant)"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Position Code
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="Enter position code (e.g., POS-001)"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <p className="mt-1 text-xs text-slate-500">Unique code for this position (optional)</p>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Department / Office <span className="text-red-500">*</span>
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              >
                <option value="">Select department or office</option>
                {departments.map((department) => (
                  <option key={department.id || department._id} value={department.name}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                maxLength={500}
                rows={4}
                placeholder="Enter short description of the position and its responsibilities..."
                className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <div className="mt-1 flex justify-end text-xs text-slate-500">
                <span>{charCount}</span>
                <span className="ml-1">/ 500</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => navigate('/admin/positions')}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <FiX className="text-base" />
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <FiSave className="text-base" />
                {saving ? 'Saving...' : 'Save Position'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
