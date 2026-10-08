import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Eye,
  LoaderCircle,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';

const separationTypesUrl = 'http://localhost:3000/api/separation-types';
const departmentsUrl = 'http://localhost:3000/api/departments';

const emptyForm = {
  name: '',
  description: '',
  noticePeriodDays: '30',
  requiredDepartments: [],
  requiredDocuments: '',
  isActive: true,
};

const getAuthConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
});

const getErrorMessage = (error) => error.response?.data?.message
  || error.response?.data?.error
  || error.message
  || 'Something went wrong. Please try again.';

const departmentName = (department) => department?.departmentName
  || department?.name
  || department?.department
  || '';

const normalizeType = (type) => ({
  ...type,
  requiredDepartments: Array.isArray(type.requiredDepartments) ? type.requiredDepartments : [],
  requiredDocuments: Array.isArray(type.requiredDocuments) ? type.requiredDocuments : [],
});

const loadSeparationData = async () => {
  const config = getAuthConfig();
  const [typesResponse, departmentsResponse] = await Promise.all([
    axios.get(separationTypesUrl, config),
    axios.get(departmentsUrl, config),
  ]);

  return {
    types: (typesResponse.data?.data || []).map(normalizeType),
    departments: departmentsResponse.data?.departments || [],
  };
};

export default function HRSeparationTypes() {
  const [types, setTypes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await loadSeparationData();
      setTypes(data.types);
      setDepartments(data.departments);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;
    loadSeparationData()
      .then((data) => {
        if (!isCurrent) return;
        setTypes(data.types);
        setDepartments(data.departments);
      })
      .catch((requestError) => {
        if (isCurrent) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });

    return () => { isCurrent = false; };
  }, []);

  const filteredTypes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return types;
    return types.filter((type) => [
      type.name,
      type.description,
      ...type.requiredDocuments,
      ...type.requiredDepartments.map(departmentName),
    ].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [search, types]);

  const openCreate = () => {
    setFormData(emptyForm);
    setDialog({ mode: 'create' });
    setError('');
  };

  const openEdit = (type) => {
    setFormData({
      name: type.name || '',
      description: type.description || '',
      noticePeriodDays: type.noticePeriodDays ?? '30',
      requiredDepartments: type.requiredDepartments.map((department) => (
        typeof department === 'string' ? department : department._id
      )).filter(Boolean),
      requiredDocuments: type.requiredDocuments.join(', '),
      isActive: type.isActive !== false,
    });
    setDialog({ mode: 'edit', type });
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    const payload = {
      ...formData,
      name: formData.name.trim(),
      description: formData.description.trim(),
      noticePeriodDays: Number(formData.noticePeriodDays),
      requiredDocuments: formData.requiredDocuments
        .split(',')
        .map((document) => document.trim())
        .filter(Boolean),
    };

    try {
      const config = getAuthConfig();
      if (dialog.mode === 'edit') {
        await axios.put(`${separationTypesUrl}/${dialog.type._id}`, payload, config);
        setNotice('Separation type updated successfully.');
      } else {
        await axios.post(separationTypesUrl, payload, config);
        setNotice('Separation type added successfully.');
      }
      setDialog(null);
      await fetchData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (type) => {
    setBusyId(type._id);
    setError('');
    setNotice('');
    try {
      await axios.patch(`${separationTypesUrl}/${type._id}/toggle-status`, {}, getAuthConfig());
      setTypes((currentTypes) => currentTypes.map((currentType) => (
        currentType._id === type._id
          ? { ...currentType, isActive: !currentType.isActive }
          : currentType
      )));
      setNotice(`${type.name} ${type.isActive ? 'deactivated' : 'activated'} successfully.`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyId('');
    }
  };

  const handleDelete = async (type) => {
    if (!window.confirm(`Permanently delete "${type.name}"? Existing clearance requests will not be changed.`)) {
      return;
    }
    setBusyId(type._id);
    setError('');
    setNotice('');
    try {
      await axios.delete(`${separationTypesUrl}/${type._id}`, getAuthConfig());
      setTypes((currentTypes) => currentTypes.filter((currentType) => currentType._id !== type._id));
      setNotice(`${type.name} deleted successfully.`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyId('');
    }
  };

  return (
    <section className="min-h-[calc(100vh-8rem)] rounded-xl bg-slate-50 p-4 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Separation Types</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage separation types, required departments, documents and notice periods.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <Plus size={17} /> Add New Type
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button>
        </div>
      )}
      {notice && (
        <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-700">{types.length} separation types</p>
          <label className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 sm:max-w-xs">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search separation types..."
              className="min-w-0 flex-1 outline-none placeholder:text-slate-400"
              aria-label="Search separation types"
            />
          </label>
        </div>

        {loading ? (
          <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <LoaderCircle size={18} className="animate-spin" /> Loading separation types...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50">
                <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Required Departments</th>
                  <th className="px-4 py-3">Required Documents</th>
                  <th className="px-4 py-3">Notice Period</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTypes.map((type) => (
                  <tr key={type._id} className="align-top transition hover:bg-slate-50/70">
                    <td className="px-4 py-4 text-sm font-semibold text-slate-800">{type.name}</td>
                    <td className="max-w-56 px-4 py-4 text-sm text-slate-600">{type.description || '—'}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${type.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {type.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {type.requiredDepartments.length
                        ? type.requiredDepartments.map((department) => (
                          typeof department === 'string' ? department : departmentName(department)
                        )).filter(Boolean).join(', ')
                        : '—'}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {type.requiredDocuments.length ? type.requiredDocuments.join(', ') : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                      {type.noticePeriodDays > 0 ? `${type.noticePeriodDays} days` : 'N/A'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDialog({ mode: 'view', type })}
                          aria-label={`View ${type.name}`}
                          title="View"
                          className="rounded-md p-2 text-blue-600 hover:bg-blue-50"
                        ><Eye size={16} /></button>
                        <button
                          type="button"
                          onClick={() => openEdit(type)}
                          aria-label={`Edit ${type.name}`}
                          title="Edit"
                          className="rounded-md p-2 text-blue-600 hover:bg-blue-50"
                        ><Pencil size={16} /></button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(type)}
                          disabled={busyId === type._id}
                          aria-label={`${type.isActive ? 'Deactivate' : 'Activate'} ${type.name}`}
                          title={type.isActive ? 'Deactivate' : 'Activate'}
                          className={`relative h-5 w-9 rounded-full transition disabled:opacity-50 ${type.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${type.isActive ? 'left-[18px]' : 'left-0.5'}`} />
                        </button>
                        <div className="group relative">
                          <button
                            type="button"
                            aria-label={`More actions for ${type.name}`}
                            title="More actions"
                            className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                          ><MoreVertical size={16} /></button>
                          <div className="invisible absolute right-0 top-full z-10 w-36 rounded-lg border border-slate-200 bg-white py-1 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                            <button
                              type="button"
                              onClick={() => handleDelete(type)}
                              disabled={busyId === type._id}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                            ><Trash2 size={15} /> Delete Type</button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTypes.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-4 py-12 text-center text-sm text-slate-500">
                      {search ? 'No separation types match your search.' : 'No separation types found. Add a type to get started.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dialog && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setDialog(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="separation-dialog-title"
            className="my-auto max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="separation-dialog-title" className="font-semibold text-slate-900">
                  {dialog.mode === 'create' ? 'Add New Separation Type' : dialog.mode === 'edit' ? 'Edit Separation Type' : dialog.type.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {dialog.mode === 'view' ? 'Separation type details.' : 'Configure the required clearance information.'}
                </p>
              </div>
              <button type="button" onClick={() => setDialog(null)} aria-label="Close dialog" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            {dialog.mode === 'view' ? (
              <dl className="grid gap-4 p-5 sm:grid-cols-2">
                <div><dt className="text-xs font-semibold uppercase text-slate-500">Type Name</dt><dd className="mt-1 text-sm text-slate-800">{dialog.type.name}</dd></div>
                <div><dt className="text-xs font-semibold uppercase text-slate-500">Status</dt><dd className="mt-1 text-sm text-slate-800">{dialog.type.isActive ? 'Active' : 'Inactive'}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase text-slate-500">Description</dt><dd className="mt-1 text-sm text-slate-800">{dialog.type.description || '—'}</dd></div>
                <div><dt className="text-xs font-semibold uppercase text-slate-500">Notice Period</dt><dd className="mt-1 text-sm text-slate-800">{dialog.type.noticePeriodDays > 0 ? `${dialog.type.noticePeriodDays} days` : 'N/A'}</dd></div>
                <div><dt className="text-xs font-semibold uppercase text-slate-500">Required Departments</dt><dd className="mt-1 text-sm text-slate-800">{dialog.type.requiredDepartments.map((department) => typeof department === 'string' ? department : departmentName(department)).filter(Boolean).join(', ') || '—'}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase text-slate-500">Required Documents</dt><dd className="mt-1 text-sm text-slate-800">{dialog.type.requiredDocuments.join(', ') || '—'}</dd></div>
              </dl>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 p-5">
                <label className="block text-sm font-medium text-slate-700">
                  Type Name <span className="text-red-500">*</span>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g. Resignation"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Description <span className="text-red-500">*</span>
                  <textarea
                    required
                    rows={3}
                    maxLength={500}
                    value={formData.description}
                    onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                    className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Describe this separation type"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Required Departments
                  <select
                    multiple
                    value={formData.requiredDepartments}
                    onChange={(event) => setFormData({
                      ...formData,
                      requiredDepartments: Array.from(event.target.selectedOptions, (option) => option.value),
                    })}
                    className="mt-1.5 min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {departments.map((department) => (
                      <option key={department.id || department._id} value={department.id || department._id}>
                        {departmentName(department)}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs font-normal text-slate-500">Hold Ctrl (Windows) or Command (Mac) to select multiple departments.</span>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Required Documents
                  <input
                    type="text"
                    value={formData.requiredDocuments}
                    onChange={(event) => setFormData({ ...formData, requiredDocuments: event.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Resignation Letter, ID Card"
                  />
                  <span className="mt-1 block text-xs font-normal text-slate-500">Separate document names with commas.</span>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Required Notice Period (days) <span className="text-red-500">*</span>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.noticePeriodDays}
                      onChange={(event) => setFormData({ ...formData, noticePeriodDays: event.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Status
                    <select
                      value={formData.isActive ? 'active' : 'inactive'}
                      onChange={(event) => setFormData({ ...formData, isActive: event.target.value === 'active' })}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                </div>
                {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button type="button" onClick={() => setDialog(null)} disabled={saving} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    {saving && <LoaderCircle size={15} className="animate-spin" />}
                    {dialog.mode === 'edit' ? 'Update' : 'Save'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
