import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FiEdit2, FiEye, FiPlus, FiSearch } from 'react-icons/fi';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminLanguage } from '../admindashboared/AdminLanguage';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function DepartmentList() {
  const navigate = useNavigate();
  const { t } = useAdminLanguage();
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
  const totalPages = Math.max(1, Math.ceil(filteredDepartments.length / pageSize));
  const visibleDepartments = filteredDepartments.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="bg-gray-50 min-h-screen p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="text-xs font-bold tracking-wider text-blue-700 uppercase">
              {t('BAHIR DAR UNIVERSITY')}
            </span>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">
              {t('Department Management')}
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              {t('Manage departments participating in the university clearance process.')}
            </p>
          </div>
          <button 
            onClick={() => navigate('/admin/add-department')}
            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg shadow-sm transition-colors text-sm cursor-pointer"
          >
            <FiPlus className="mr-2 text-base" /> {t('Add New Department')}
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="relative max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
              placeholder={t('Search departments')}
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
                <th className="px-5 py-4">{t('S No')}</th>
                <th className="px-5 py-4">{t('Department Name')}</th>
                <th className="px-5 py-4">{t('Code')}</th>
                <th className="px-5 py-4">{t('Type')}</th>
                <th className="px-5 py-4">{t('Campus')}</th>
                <th className="px-5 py-4">{t('Department Head')}</th>
                <th className="px-5 py-4">{t('Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="7" className="px-5 py-8 text-center text-gray-500">{t('Loading departments...')}</td></tr>
              ) : filteredDepartments.length === 0 ? (
                <tr><td colSpan="7" className="px-5 py-8 text-center text-gray-500">{t('No departments found.')}</td></tr>
              ) : visibleDepartments.map((department, index) => (
                <tr key={department.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 text-gray-500">{(page - 1) * pageSize + index + 1}</td>
                  <td className="px-5 py-4 font-medium text-gray-900">{department.name}</td>
                  <td className="px-5 py-4 text-gray-600">{department.code}</td>
                  <td className="px-5 py-4 text-gray-600">{department.type}</td>
                  <td className="px-5 py-4 text-gray-600">{department.campus}</td>
                  <td className="px-5 py-4 text-gray-600">{department.head}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <button type="button" title={t('View department')} onClick={() => navigate(`/admin/view-department/${department.id}`)} className="text-blue-600 hover:text-blue-800">
                        <FiEye />
                      </button>
                      <button type="button" title={t('Edit department')} onClick={() => navigate(`/admin/edit-department/${department.id}`)} className="text-amber-600 hover:text-amber-800">
                        <FiEdit2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  disabled={page === 1}
                  className="inline-flex h-10 items-center gap-1 rounded-md border border-gray-200 px-4 font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft size={15} /> {t('Previous')}
                </button>
                <span className="whitespace-nowrap px-1 font-medium">{t('Page')} {page} {t('of')} {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex h-10 items-center gap-1 rounded-md bg-blue-600 px-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('Next')} <ChevronRight size={15} />
                </button>
              </div>
              <label className="flex items-center gap-2 whitespace-nowrap">
                {t('Show')}
                <select
                  aria-label={t('Departments per page')}
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                  className="h-10 rounded-md border border-gray-200 bg-white px-2 text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
                {t('of')} {filteredDepartments.length}
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}