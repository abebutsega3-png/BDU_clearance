import React, { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import { changeMyPassword } from '../../until/MyprofileHelper';

const passwordFields = [
	{ name: 'currentPassword', label: 'Current Password', placeholder: 'Enter current password' },
	{ name: 'newPassword', label: 'New Password', placeholder: 'Enter new password' },
	{ name: 'confirmPassword', label: 'Confirm New Password', placeholder: 'Confirm new password' },
];

export default function DepartmentChangePassword() {
	const { user } = useAuth();
	const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
	const [visibleFields, setVisibleFields] = useState({});
	const [message, setMessage] = useState(null);
	const [saving, setSaving] = useState(false);

	const submit = async (event) => {
		event.preventDefault();
		setMessage(null);
		if (passwords.newPassword !== passwords.confirmPassword) {
			setMessage({ type: 'error', text: 'New passwords do not match.' });
			return;
		}
		setSaving(true);
		try {
			const response = await changeMyPassword(user._id, passwords);
			setMessage({ type: 'success', text: response.message || 'Password updated successfully.' });
			setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
		} catch (error) {
			setMessage({ type: 'error', text: error.response?.data?.message || 'Unable to update password.' });
		} finally {
			setSaving(false);
		}
	};

	const toggleVisibility = (field) => {
		setVisibleFields((current) => ({ ...current, [field]: !current[field] }));
	};

	return (
		<main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-slate-50 px-4 py-8">
			<section className="w-full max-w-md rounded-xl border border-slate-100 bg-white px-5 py-5 shadow-md sm:px-6">
				<Link to="/department-head" className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 transition hover:text-indigo-700">
					<span aria-hidden="true">←</span> Back to Dashboard
				</Link>
				<div className="mt-5 text-center">
					<div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
						<ShieldCheck size={22} />
					</div>
					<h1 className="mt-3 text-lg font-bold text-slate-900">Change Password</h1>
					<p className="mt-1 text-[11px] text-slate-500">You must update your password before continuing.</p>
				</div>

				<form onSubmit={submit} className="mt-4 space-y-3">
					{passwordFields.map(({ name, label, placeholder }) => (
						<label key={name} className="block text-[11px] font-semibold text-slate-700">
							{label}
							<span className="relative mt-1 block">
								<LockKeyhole size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
								<input
									required
									minLength={name === 'currentPassword' ? undefined : 6}
									type={visibleFields[name] ? 'text' : 'password'}
									value={passwords[name]}
									onChange={(event) => setPasswords((current) => ({ ...current, [name]: event.target.value }))}
									placeholder={placeholder}
									className="h-9 w-full rounded-md border border-slate-200 bg-white py-2 pl-8 pr-9 text-xs font-normal text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
								/>
								<button
									type="button"
									onClick={() => toggleVisibility(name)}
									className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
									aria-label={`${visibleFields[name] ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
								>
									{visibleFields[name] ? <EyeOff size={14} /> : <Eye size={14} />}
								</button>
							</span>
						</label>
					))}

					{message && (
						<p role="status" className={`rounded-md px-3 py-2 text-xs ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
							{message.text}
						</p>
					)}

					<button type="submit" disabled={saving} className="w-full rounded-md bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">
						{saving ? 'Updating Password...' : 'Update Password'}
					</button>
				</form>
			</section>
		</main>
	);
}
