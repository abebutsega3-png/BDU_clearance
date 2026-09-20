import React, { useEffect, useMemo, useState } from 'react';
import { FiChevronDown, FiEdit2, FiEye, FiKey, FiPlus, FiSearch, FiUser, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { fetchUsers, resetUserPassword } from '../../until/UserHelper';

const roleOptions = ['All', 'Administrator', 'HR Officer', 'Department Approver', 'Employee'];
const statusOptions = ['All', 'Active', 'Deactivated', 'Pending Setup'];

export default function UsersList() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [role, setRole] = useState('All');
  const [department, setDepartment] = useState('All Departments');
  const [status, setStatus] = useState('All');

  // Reset Password Modal States
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setUsers(await fetchUsers());
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load users.');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

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

  const departments = [...new Set(users.map((user) => user.department).filter(Boolean))];
  const filteredUsers = useMemo(() => users.filter((user) => {
    const query = searchTerm.toLowerCase();
    return [user.name, user.username, user.email].some((value) => String(value || '').toLowerCase().includes(query))
      && (role === 'All' || user.role === role)
      && (department === 'All Departments' || user.department === department)
      && (status === 'All' || user.status === (status === 'Deactivated' ? 'Inactive' : status));
  }), [users, searchTerm, role, department, status]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div><p className="text-xs text-slate-500"><span className="text-blue-700">Home</span><span className="mx-1">/</span><span className="text-blue-700">Employees &amp; Users</span><span className="mx-1">/</span>Users</p><h1 className="mt-1 text-xl font-bold text-slate-900">Users List</h1></div>
          <button type="button" onClick={() => navigate('/admin/add-user')} className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"><FiPlus /> Add New User</button>
        </div>

        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="relative block"><FiSearch className="absolute left-3 top-2.5 text-slate-400" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
            <FilterSelect label="Role Type" value={role} onChange={setRole} options={roleOptions} />
            <FilterSelect label="Department / Unit" value={department} onChange={setDepartment} options={['All Departments', ...departments]} />
            <FilterSelect label="Status" value={status} onChange={setStatus} options={statusOptions} />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-lg font-bold text-slate-800">System Users</div><div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="border-b border-slate-200 bg-white text-xs uppercase text-slate-600"><tr><th className="px-4 py-3"><input type="checkbox" aria-label="Select all users" /></th><th className="px-4 py-3">Username</th><th className="px-4 py-3">Full Name</th><th className="px-4 py-3">Email Address</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Department/Unit</th><th className="px-4 py-3">Linked Employee ID</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{error ? <tr><td colSpan="9" className="px-4 py-12 text-center text-red-600">{error}</td></tr> : loading ? <tr><td colSpan="9" className="px-4 py-12 text-center text-slate-500">Loading users...</td></tr> : filteredUsers.length === 0 ? <tr><td colSpan="9" className="px-4 py-12 text-center text-slate-500"><FiUser className="mx-auto mb-2 text-2xl text-slate-300" />No users found.</td></tr> : filteredUsers.map((user) => <tr key={user._id || user.username} className="hover:bg-slate-50"><td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${user.username}`} /></td><td className="px-4 py-3 font-medium text-slate-900">{user.username}</td><td className="px-4 py-3 text-slate-700">{user.name || '-'}</td><td className="px-4 py-3 text-slate-700">{user.email || '-'}</td><td className="px-4 py-3 text-slate-700">{user.role || '-'}</td><td className="px-4 py-3 text-slate-700">{user.department || '-'}</td><td className="px-4 py-3 text-slate-700">{user.employeeId || '-'}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${user.status === 'Inactive' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{user.status === 'Inactive' ? 'Deactivated' : user.status || 'Active'}</span></td><td className="px-4 py-3"><div className="flex gap-3"><button type="button" title="View user" onClick={() => navigate(`/admin/view-user/${user._id}`)} className="text-blue-600 hover:text-blue-800"><FiEye /></button><button type="button" title="Edit user" className="text-amber-600 hover:text-amber-800"><FiEdit2 /></button><button type="button" title="Reset Password" onClick={() => handleOpenResetModal(user)} className="text-purple-600 hover:text-purple-800"><FiKey /></button></div></td></tr>)}</tbody></table></div>
        </div>
      </div>

      {/* Reset Password Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Reset Password</h3>
              <button type="button" onClick={() => setIsResetModalOpen(false)} className="text-slate-400 hover:text-slate-600"><FiX className="text-xl" /></button>
            </div>
            <p className="mt-2 text-xs text-slate-500">Resetting password for: <span className="font-semibold text-slate-700">{selectedUserForReset?.username} ({selectedUserForReset?.name})</span></p>

            {resetError && <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-600">{resetError}</div>}
            {resetSuccess && <div className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-600">{resetSuccess}</div>}

            <form onSubmit={handleResetPasswordSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" minLength="8" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" minLength="8" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsResetModalOpen(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                              <button type="submit" disabled={isResetting} className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">{isResetting ? 'Saving...' : 'Update Password'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return <label className="relative block text-xs font-semibold text-slate-700">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 py-2 pr-8 text-sm font-normal text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">{options.map((option) => <option key={option}>{option}</option>)}</select><FiChevronDown className="pointer-events-none absolute right-3 bottom-2.5 text-slate-400" /></label>;
}