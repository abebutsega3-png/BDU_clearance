import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, UserCircle } from 'lucide-react';
import { fetchUser } from '../../until/UserHelper';

const detailFields = [
	['Username', 'username'],
	['Full Name', 'name'],
	['Email Address', 'email'],
	['Role', 'role'],
	['Department / Unit', 'department'],
	['Linked Employee ID', 'employeeId'],
	['Status', 'status'],
];

export default function ViewUser() {
	const { id } = useParams();
	const navigate = useNavigate();
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		if (!id) {
			setError('User ID is missing. Please return to the users list and select a user.');
			setLoading(false);
			return undefined;
		}

		fetchUser(id)
			.then((userData) => setUser(userData))
			.catch((requestError) => setError(requestError.response?.data?.message || requestError.message || 'Unable to load user information.'))
			.finally(() => setLoading(false));

		return undefined;
	}, [id]);

	if (loading) return <main className="p-6 text-sm text-slate-500">Loading user information...</main>;
	if (error || !user) return <main className="p-6"><p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error || 'User not found.'}</p><button type="button" onClick={() => navigate('/admin/users')} className="mt-4 text-sm text-blue-700">Back to users</button></main>;

	return (
		<main className="min-h-screen bg-slate-50 p-4 md:p-6">
			<div className="mx-auto max-w-5xl">
				<div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div><p className="text-xs text-slate-500"><span className="text-blue-700">Home</span><span className="mx-1">/</span><span className="text-blue-700">Employees &amp; Users</span><span className="mx-1">/</span>Users</p><h1 className="mt-1 text-2xl font-bold text-slate-900">User Information</h1></div>
					<div className="flex gap-2"><button type="button" onClick={() => navigate('/admin/users')} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"><ArrowLeft className="h-4 w-4" /> Back</button><button type="button" onClick={() => navigate(`/admin/edit-user/${id}`)} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm text-white"><Edit2 className="h-4 w-4" /> Edit User</button></div>
				</div>
				<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
					<div className="mb-6 flex items-center gap-4 border-b border-slate-200 pb-5"><UserCircle className="h-14 w-14 text-blue-600" /><div><h2 className="text-lg font-bold text-slate-900">{user.name || user.username}</h2><p className="text-sm text-slate-500">{user.username}</p></div></div>
					<dl className="grid gap-x-8 md:grid-cols-2">{detailFields.map(([label, key]) => <div key={key} className="border-b border-slate-100 py-3"><dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium text-slate-800">{user[key] || 'Not provided'}</dd></div>)}</dl>
				</section>
			</div>
		</main>
	);
}
