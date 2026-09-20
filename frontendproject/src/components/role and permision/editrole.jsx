import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Save, ShieldCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const permissionLabels = ['View', 'Create', 'Edit', 'Delete', 'Approve', 'Reject', 'Export'];
const moduleNames = [
  ['Dashboard', 'Access to dashboard and overview'], ['Users', 'Manage system users'],
  ['Roles', 'Manage roles'], ['Permissions', 'Manage permissions'], ['Employees', 'Manage employee records'],
  ['Departments', 'Manage departments'], ['Clearance Requests', 'Manage clearance requests'],
  ['Finance Clearance', 'Manage finance clearance'], ['Property Clearance', 'Manage property clearance'],
  ['ICT Clearance', 'Manage ICT clearance'], ['Department Clearance', 'Manage department clearance'],
  ['Library Clearance', 'Manage library clearance'], ['Final HR Clearance', 'Manage final HR clearance'],
  ['Reports', 'View and export reports'], ['Notifications', 'Manage notifications'], ['Audit Logs', 'View and export audit logs'],
  ['System Settings', 'Manage system settings'], ['Backup & Maintenance', 'Manage backup and maintenance'],
];
const emptyPermissions = () => moduleNames.map(() => permissionLabels.map(() => false));
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function EditRole() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Active');
  const [permissions, setPermissions] = useState(emptyPermissions);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadRole = async () => {
      try {
        const response = await axios.get(`http://localhost:3000/api/roles/${id}`, { headers: headers() });
        const role = response.data.role;
        setRoleName(role.name || '');
        setDescription(role.description || '');
        setStatus(role.isActive === false ? 'Inactive' : 'Active');
        setPermissions(moduleNames.map(([module]) => permissionLabels.map((label) => role.permissions?.find((permission) => permission.module === module)?.actions?.includes(label.toLowerCase()) || false)));
      } catch (error) {
        setMessage(error.response?.data?.message || 'Unable to load role. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    loadRole();
  }, [id]);

  const updatePermission = (moduleIndex, permissionIndex) => {
    setPermissions((current) => current.map((module, currentModuleIndex) => currentModuleIndex === moduleIndex
      ? module.map((allowed, currentPermissionIndex) => currentPermissionIndex === permissionIndex ? !allowed : allowed) : module));
  };
  const setAllPermissions = (allowed) => setPermissions((current) => current.map((module) => module.map(() => allowed)));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!roleName.trim()) return setMessage('Role name is required.');
    setSaving(true);
    setMessage('');
    try {
      await axios.put(`http://localhost:3000/api/roles/${id}`, {
        name: roleName.trim(), description: description.trim(), status,
        permissions: moduleNames.map(([module], moduleIndex) => ({
          module,
          actions: permissionLabels.filter((_, permissionIndex) => permissions[moduleIndex][permissionIndex]).map((action) => action.toLowerCase()),
        })),
      }, { headers: headers() });
      navigate('/admin/roles-permissions', { state: { success: `Role "${roleName.trim()}" updated successfully.` } });
    } catch (error) {
      setMessage(error.response?.data?.message || (error.request ? 'Unable to reach the server. Please make sure the backend is running.' : 'Unable to update role. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="min-h-[calc(100vh-3rem)] bg-slate-50 p-8 text-center text-sm text-slate-500">Loading role...</main>;
  return <main className="min-h-[calc(100vh-3rem)] bg-slate-50 text-slate-800">
    <div className="border-b border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 sm:px-8"><button onClick={() => navigate('/admin/roles-permissions')} className="font-semibold text-blue-600 hover:underline">Roles &amp; Permissions</button><ChevronRight className="mx-1 inline" size={13} /> Edit Role</div>
    <form onSubmit={handleSubmit} className="mx-auto max-w-[1500px] p-4 sm:p-8"><div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-4 sm:px-6"><h1 className="flex items-center gap-2 text-xl font-bold text-slate-900"><ShieldCheck size={21} className="text-blue-600" /> Edit Role</h1></div>
      <section className="border-b border-slate-200 p-4 sm:p-6"><h2 className="text-sm font-bold text-slate-800">Role Information</h2><div className="mt-4 grid gap-5 md:grid-cols-2">
        <label className="text-xs font-semibold text-slate-700">Role Name<input value={roleName} onChange={(event) => setRoleName(event.target.value)} className="mt-1.5 block w-full rounded border border-slate-300 px-3 py-2.5 text-xs font-normal outline-none focus:border-blue-500" required /></label>
        <label className="text-xs font-semibold text-slate-700">Role Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows="3" className="mt-1.5 block w-full resize-none rounded border border-slate-300 px-3 py-2.5 text-xs font-normal outline-none focus:border-blue-500" /></label>
        <label className="text-xs font-semibold text-slate-700">Role Status<span className="relative mt-1.5 block"><select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full appearance-none rounded border border-slate-300 px-3 py-2.5 text-xs font-normal"><option>Active</option><option>Inactive</option></select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-2.5 text-slate-500" /></span></label>
      </div></section>
      <section className="p-4 sm:p-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-sm font-bold text-slate-800">Set Permissions</h2><p className="mt-1 text-[11px] text-slate-500">Select the permissions that this role will have.</p></div><div className="flex gap-2"><button type="button" onClick={() => setAllPermissions(true)} className="rounded border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600">Select All</button><button type="button" onClick={() => setAllPermissions(false)} className="rounded border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600">Deselect All</button></div></div>
        <div className="mt-4 overflow-x-auto rounded border border-slate-200"><table className="w-full min-w-[680px] border-collapse text-xs"><thead><tr className="bg-slate-50 text-left font-bold text-slate-600"><th className="px-3 py-3">Module / Feature</th>{permissionLabels.map((label) => <th key={label} className="px-2 py-3 text-center">{label}</th>)}</tr></thead><tbody>{moduleNames.map(([name, detail], moduleIndex) => <tr key={name} className="border-t border-slate-100"><td className="px-3 py-3"><div className="flex items-start gap-2"><ChevronDown size={14} className="mt-0.5 text-slate-500" /><span><strong className="block text-slate-700">{name}</strong><small className="block text-[10px] text-slate-500">{detail}</small></span></div></td>{permissionLabels.map((label, permissionIndex) => <td key={label} className="px-2 py-3 text-center"><input type="checkbox" aria-label={`${name} ${label}`} checked={permissions[moduleIndex][permissionIndex]} onChange={() => updatePermission(moduleIndex, permissionIndex)} className="h-4 w-4 accent-blue-600" /></td>)}</tr>)}</tbody></table></div>
      </section>
      <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:px-6"><div>{message && <p className={`text-xs ${message.includes('successfully') ? 'text-emerald-600' : 'text-rose-600'}`}>{message}</p>}</div><div className="flex justify-end gap-2"><button type="button" onClick={() => navigate('/admin/roles-permissions')} className="rounded border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"><Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}</button></div></div>
    </div></form>
  </main>;
}
