import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchEmployee } from '../../until/EmployeeHelper';

export default function ViewEmployee() {
  const { id } = useParams(); const navigate = useNavigate(); const [employee, setEmployee] = useState(null); const [error, setError] = useState('');
  useEffect(() => { fetchEmployee(id).then(setEmployee).catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load employee.')); }, [id]);
  if (error) return <main className="p-6 text-red-600">{error}</main>; if (!employee) return <main className="p-6 text-slate-500">Loading employee...</main>;
  return <main className="min-h-screen bg-slate-50 p-4 md:p-6"><div className="mx-auto max-w-3xl"><div className="mb-5 flex items-center justify-between"><h1 className="text-xl font-bold text-slate-900">Employee Information</h1><button type="button" onClick={() => navigate(`/hr-office/edit-employee/${id}`)} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white">Edit</button></div><div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">{['employeeId', 'fullName', 'gender', 'department', 'position', 'campus', 'employmentType', 'phone', 'email', 'status'].map((field) => <div key={field}><p className="text-xs capitalize text-slate-500">{field}</p><p className="mt-1 text-sm font-semibold text-slate-800">{employee[field] || '-'}</p></div>)}</div></div></main>;
}
