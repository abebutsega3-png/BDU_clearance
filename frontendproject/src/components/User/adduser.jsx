import React, { useEffect, useState } from 'react';
import { FiChevronDown, FiEdit2, FiEye, FiKey, FiPlus, FiSearch, FiUser, FiX } from 'react-icons/fi';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchUsers, resetUserPassword } from '../../until/UserHelper';
import { useAdminLanguage } from '../admindashboared/AdminLanguage';

const roleOptions = ['All', 'Administrator', 'HR Officer', 'Department Approver', 'Employee'];
const statusOptions = ['All', 'Active', 'Deactivated', 'Pending Setup'];
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function UsersList() {
  const navigate = useNavigate();
  const { t } = useAdminLanguage();
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [role, setRole] = useState('All');
  const [department, setDepartment] = useState('All Departments');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [reloadUsers, setReloadUsers] = useState(0);

  // Reset Password Modal States
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    let isCurrentRequest = true;
    const controller = new AbortController();

    const loadUsers = async () => {
      try {
        const result = await fetchUsers({
          page,
          limit: pageSize,
          search: searchTerm,
          role,
          department,
          status,
        }, { signal: controller.signal });
        if (isCurrentRequest) {
          setUsers(result.users || []);
          setTotalUsers(result.total || 0);
          setDepartments(result.departments || []);
          if (result.page && result.page !== page) setPage(result.page);
        }
      } catch (requestError) {
        if (isCurrentRequest) {
          setError(
            requestError.response?.data?.message
            || (requestError.code === 'ECONNABORTED'
              ? 'The API did not respond within 10 seconds. Check the server and database, then retry.'
              : requestError.request
                ? 'Cannot connect to the API server. Make sure it is running, then try again.'
              : requestError.message || 'Unable to load users.'),
          );
        }
      } finally {
        if (isCurrentRequest) setLoading(false);
      }
    };

    const debounceId = setTimeout(() => void loadUsers(), searchTerm ? 250 : 0);
    return () => {
      isCurrentRequest = false;
      clearTimeout(debounceId);
      controller.abort();
    };
  }, [reloadUsers, page, pageSize, searchTerm, role, department, status]);
  const retryLoadingUsers = () => {
    setLoading(true);
    setError('');
    setReloadUsers((current) => current + 1);
  };

  // Open Reset Password Modal
  const handleOpenResetModal = (user) => {
    setSelectedUserForReset(user);
    setNewPassword('');
    setConfirmPassword('');
    setResetError('');
    setResetSuccess('');
    setIsResetModalOpen(true);
  };

  // Submit Password Reset
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setResetError('Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    setIsResetting(true);
    setResetError('');

    try {
      await resetUserPassword(selectedUserForReset._id, newPassword, confirmPassword);
      setResetSuccess('Password reset successfully!');
      setTimeout(() => {
        setIsResetModalOpen(false);
        setResetSuccess('');
      }, 1500);
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setIsResetting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));
  const visibleUsers = users;
  const updateFilter = (setter, value) => {
    setLoading(true);
    setError('');
    setter(value);
    setPage(1);
  };
  const updatePage = (nextPage) => {
    setLoading(true);
    setError('');
    setPage(nextPage);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div><p className="text-xs text-slate-500"><span className="text-blue-700">{t('Home')}</span><span className="mx-1">/</span><span className="text-blue-700">{t('Employees & Users')}</span><span className="mx-1">/</span>{t('Users')}</p><h1 className="mt-1 text-xl font-bold text-slate-900">{t('Users List')}</h1></div>
          <button type="button" onClick={() => navigate('/admin/add-user')} className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"><FiPlus /> {t('Add New User')}</button>
        </div>

        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="relative block"><FiSearch className="absolute left-3 top-2.5 text-slate-400" /><input value={searchTerm} onChange={(event) => updateFilter(setSearchTerm, event.target.value)} placeholder={t('Search')} className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
            <FilterSelect label={t('Role Type')} value={role} onChange={(value) => updateFilter(setRole, value)} options={roleOptions} t={t} />
            <FilterSelect label={t('Department / Unit')} value={department} onChange={(value) => updateFilter(setDepartment, value)} options={['All Departments', ...departments]} t={t} />
            <FilterSelect label={t('Status')} value={status} onChange={(value) => updateFilter(setStatus, value)} options={statusOptions} t={t} />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-lg font-bold text-slate-800">{t('System Users')}</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-white text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3"><input type="checkbox" aria-label="Select all users" /></th>
                  <th className="px-4 py-3">{t('Username')}</th>
                  <th className="px-4 py-3">{t('Full Name')}</th>
                  <th className="px-4 py-3">{t('Email Address')}</th>
                  <th className="px-4 py-3">{t('Role')}</th>
                  <th className="px-4 py-3">{t('Department/Unit')}</th>
                  <th className="px-4 py-3">{t('Linked Employee ID')}</th>
                  <th className="px-4 py-3">{t('Status')}</th>
                  <th className="px-4 py-3">{t('Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {error ? (
                  <tr><td colSpan="9" className="px-4 py-12 text-center text-red-600">{error}<button type="button" onClick={retryLoadingUsers} className="ml-3 rounded border border-red-200 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50">{t('Retry')}</button></td></tr>
                ) : loading ? (
                  <tr><td colSpan="9" className="px-4 py-12 text-center text-slate-500">{t('Loading users...')}</td></tr>
                ) : totalUsers === 0 ? (
                  <tr><td colSpan="9" className="px-4 py-12 text-center text-slate-500"><FiUser className="mx-auto mb-2 text-2xl text-slate-300" />{t('No users found.')}</td></tr>
                ) : visibleUsers.map((user) => (
                  <tr key={user._id || user.username} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><input type="checkbox" aria-label={`${t('Select all users')}: ${user.username}`} /></td>
                    <td className="px-4 py-3 font-medium text-slate-900">{user.username}</td>
                    <td className="px-4 py-3 text-slate-700">{user.name || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{user.email || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{user.role || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{user.department || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{user.employeeId || '-'}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${user.status === 'Inactive' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{t(user.status === 'Inactive' ? 'Deactivated' : user.status || 'Active')}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button type="button" title={t('View user')} onClick={() => navigate(`/admin/view-user/${user._id}`)} className="text-blue-600 hover:text-blue-800"><FiEye /></button>
                        <button type="button" title={t('Edit user')} className="text-amber-600 hover:text-amber-800"><FiEdit2 /></button>
                        <button type="button" title={t('Reset Password')} onClick={() => handleOpenResetModal(user)} className="text-purple-600 hover:text-purple-800"><FiKey /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && !error && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <button type="button" aria-label={t('Previous')} onClick={() => updatePage(Math.max(1, page - 1))} disabled={page === 1} className="inline-flex h-10 items-center gap-1 rounded-md border border-slate-200 px-4 font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><ChevronLeft size={15} /> {t('Previous')}</button>
                <span className="whitespace-nowrap px-1 font-medium">{t('Page')} {page} {t('of')} {totalPages}</span>
                <button type="button" aria-label={t('Next')} onClick={() => updatePage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="inline-flex h-10 items-center gap-1 rounded-md bg-blue-600 px-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{t('Next')} <ChevronRight size={15} /></button>
              </div>
              <label className="flex items-center gap-2 whitespace-nowrap">{t('Show')}<select aria-label={`${t('Users')} ${t('Show')}`} value={pageSize} onChange={(event) => { setLoading(true); setError(''); setPageSize(Number(event.target.value)); setPage(1); }} className="h-10 rounded-md border border-slate-200 bg-white px-2 text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">{PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}</select>{t('of')} {totalUsers}</label>
            </div>
          )}
        </div>
      </div>

      {/* Reset Password Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">{t('Reset Password')}</h3>
              <button type="button" onClick={() => setIsResetModalOpen(false)} className="text-slate-400 hover:text-slate-600"><FiX className="text-xl" /></button>
            </div>
            <p className="mt-2 text-xs text-slate-500">{t('Resetting password for:')} <span className="font-semibold text-slate-700">{selectedUserForReset?.username} ({selectedUserForReset?.name})</span></p>

            {resetError && <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-600">{resetError}</div>}
            {resetSuccess && <div className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-600">{resetSuccess}</div>}

            <form onSubmit={handleResetPasswordSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">{t('New Password')}</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('Enter new password')} minLength="8" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">{t('Confirm New Password')}</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t('Confirm new password')} minLength="8" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsResetModalOpen(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{t('Cancel')}</button>
                              <button type="submit" disabled={isResetting} className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">{isResetting ? `${t('Saving')}...` : t('Update Password')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function FilterSelect({ label, value, onChange, options, t }) {
  return <label className="relative block text-xs font-semibold text-slate-700">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 py-2 pr-8 text-sm font-normal text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">{options.map((option) => <option key={option} value={option}>{t(option)}</option>)}</select><FiChevronDown className="pointer-events-none absolute right-3 bottom-2.5 text-slate-400" /></label>;
}