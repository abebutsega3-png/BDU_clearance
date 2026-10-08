import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Camera } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import { fetchMyProfile, getMyProfileHeaders, updateMyProfile } from '../../until/MyprofileHelper';
import UniversitySeal from '../UniversitySeal';

export default function DepartmentProfile() {
	const { user, login } = useAuth();
	const [profile, setProfile] = useState({});
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState('');

	useEffect(() => {
		if (!user?._id) return;
		fetchMyProfile(user._id)
			.then((data) => setProfile(data))
			.catch(() => setMessage('Unable to load profile information.'));
	}, [user?._id]);

	const current = { ...user, ...profile };
	const update = (field, nextValue) => setProfile((previous) => ({ ...previous, [field]: nextValue }));

	const save = async (event) => {
		event.preventDefault();
		setSaving(true);
		setMessage('');
		try {
			const response = await updateMyProfile(user._id, {
				name: current.name,
				email: current.email,
				phoneNumber: current.phoneNumber,
				gender: current.gender,
			});
			const updated = response.data || response;
			setProfile(updated);
			login({ ...user, ...updated });
			setMessage('Profile changes saved successfully.');
		} catch (error) {
			setMessage(error.response?.data?.message || 'Unable to save profile changes.');
		} finally {
			setSaving(false);
		}
	};

	const changePhoto = async (event) => {
		const file = event.target.files?.[0];
		if (!file) return;
		if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
			setMessage('Choose an image up to 2MB.');
			return;
		}

		const reader = new FileReader();
		reader.onload = async () => {
			try {
				const response = await axios.put(
					`http://localhost:3000/api/profile/${user._id}`,
					{ profileImage: reader.result },
					{ headers: getMyProfileHeaders() },
				);
				const updated = response.data.data || response.data;
				setProfile(updated);
				login({ ...user, ...updated });
				setMessage('Profile photo updated successfully.');
			} catch (error) {
				setMessage(error.response?.data?.message || 'Unable to update profile photo.');
			}
		};
		reader.readAsDataURL(file);
	};

	return (
		<main className="space-y-5 bg-slate-50 px-4 py-6 text-slate-700 sm:px-6">
			<section className="mx-auto max-w-md rounded-xl border border-slate-100 bg-white px-5 py-5 shadow-sm sm:px-6">
				<div className="border-b border-slate-100 pb-4">
					<p className="text-[10px] font-bold uppercase tracking-wide text-teal-700">Account</p>
					<h1 className="mt-1 text-xl font-bold text-slate-900">Profile</h1>
					<p className="mt-1 text-xs text-slate-500">Your authenticated account details.</p>
				</div>

				<form onSubmit={save} className="pt-4">
					<div className="mb-5 flex items-center gap-3">
						<div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-slate-100 bg-white">
							{current.profileImage
								? <img src={current.profileImage} alt="Department Head profile" className="h-full w-full object-cover" />
								: <UniversitySeal className="h-12 w-12" />}
						</div>
						<label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-[11px] font-semibold text-teal-800 hover:bg-teal-100">
							<Camera size={13} /> Change Profile Photo
							<input type="file" accept="image/png,image/jpeg,image/gif" onChange={changePhoto} className="sr-only" />
						</label>
					</div>

					<div className="space-y-3.5">
						<ProfileField label="Full Name" value={current.name || ''} onChange={(value) => update('name', value)} required />
						<ProfileField label="Email Address" type="email" value={current.email || ''} onChange={(value) => update('email', value)} required />
						<ProfileField label="Role / Title" value={current.position || 'Department Head'} readOnly />
						<ProfileField label="Department" value={current.department || 'Not assigned'} readOnly />
						<ProfileField label="Phone Number" type="tel" value={current.phoneNumber || ''} onChange={(value) => update('phoneNumber', value)} placeholder="Enter phone number" />
					</div>

					{message && <p role="status" className="mt-4 rounded-md bg-teal-50 px-3 py-2 text-xs text-teal-800">{message}</p>}

					<button type="submit" disabled={saving} className="mt-5 inline-flex items-center justify-center rounded-md bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60">
						{saving ? 'Saving Profile...' : 'Save Profile Changes'}
					</button>
				</form>
			</section>

		</main>
	);
}

function ProfileField({ label, value, onChange, type = 'text', placeholder, readOnly = false, required = false }) {
	return (
		<label className="block text-[11px] font-semibold text-slate-700">
			{label}
			<input
				type={type}
				value={value}
				onChange={onChange ? (event) => onChange(event.target.value) : undefined}
				placeholder={placeholder}
				readOnly={readOnly}
				required={required}
				className={`mt-1 block h-9 w-full rounded-md border px-3 text-xs font-medium text-slate-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 ${readOnly ? 'border-slate-100 bg-slate-100 text-slate-500' : 'border-slate-300 bg-white'}`}
			/>
		</label>
	);
}
