import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchEmployee, updateEmployee } from '../../until/EmployeeHelper';

export default function EditEmployee() {
  const { id } = useParams(); const navigate = useNavigate(); const [form, setForm] = useState(null); const [error, setError] = useState('');
  useEffect(() => { fetchEmployee(id).then(setForm).catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load employee.')); }, [id]);
  if (error) return <main className="p-6 text-red-600">{error}</main>; if (!form) return <main className="p-6 text-slate-500">Loading employee...</main>;
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value }); const submit = async (event) => { event.preventDefault(); try { await updateEmployee(id, form); navigate(`/hr-office/view-employee/${id}`); } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to update employee.'); } };
  return <main className="min-h-screen bg-slate-50 p-4 md:p-6"><div className="mx-auto max-w-3xl"><h1 className="mb-5 text-xl font-bold">Edit Employee</h1><form onSubmit={submit} className="rounded-xl border bg-white p-5 shadow-sm"><div className="grid gap-4 sm:grid-cols-2">{['fullName', 'department', 'position', 'campus', 'phone', 'email', 'status'].map((name) => <label key={name} className="text-xs font-semibold capitalize">{name}<input name={name} value={form[name] || ''} onChange={update} className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-normal" /></label>)}</div>{error && <p className="mt-4 text-sm text-red-600">{error}</p>}<button className="mt-5 rounded-md bg-blue-600 px-4 py-2 text-sm text-white">Update Employee</button></form></div></main>;
}
