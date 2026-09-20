import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiChevronDown, FiSave } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const initialForm = {
	name: '',
	department: '',
	type: '',
	order: '',
	required: 'Yes',
	status: 'Active',
	description: '',
	role: '',
	approver: '',
	allowRejection: 'Yes',
	allowComments: 'Yes',
};

const fieldClass = 'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

export default function AddClearanceStep() {
	const navigate = useNavigate();
	const [formData, setFormData] = useState(initialForm);
	const [departments, setDepartments] = useState([]);
	const [roles, setRoles] = useState([]);
	const [loadingRoles, setLoadingRoles] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		const loadDepartments = async () => {
			try {
				const token = localStorage.getItem('token');
				const response = await axios.get('http://localhost:3000/api/departments', {
					headers: { Authorization: `Bearer ${token}` },
				});
				setDepartments(response.data.departments || []);
			} catch {
				setDepartments([]);
			}
		};
		loadDepartments();
	}, []);

	useEffect(() => {
		const loadRoles = async () => {
			try {
				const token = localStorage.getItem('token');
				const response = await axios.get('http://localhost:3000/api/roles', {
					headers: { Authorization: `Bearer ${token}` },
				});
				setRoles((response.data.roles || []).filter((role) => role.isActive !== false));
			} catch {
				setRoles([]);
			} finally {
				setLoadingRoles(false);
			}
		};
		loadRoles();
	}, []);

	const handleChange = (event) => {
		setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
		if (error) setError('');
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		if (!formData.name.trim() || !formData.department || !formData.type || !formData.order || !formData.role) {
			setError('Please complete all required fields before saving.');
			return;
		}
		setSaving(true);
		try {
			const token = localStorage.getItem('token');
			await axios.post('http://localhost:3000/api/clearance-steps', formData, {
				headers: { Authorization: `Bearer ${token}` },
			});
			navigate('/admin/clearance-steps');
		} catch (requestError) {
			setError(requestError.response?.data?.message || 'Unable to save clearance step.');
		} finally {
			setSaving(false);
		}
	};

	const input = (name, placeholder, type = 'text') => (
		<input type={type} name={name} value={formData[name]} onChange={handleChange} placeholder={placeholder} className={fieldClass} />
	);

	const select = (name, options, placeholder) => (
		<div className="relative">
			<select name={name} value={formData[name]} onChange={handleChange} className={`${fieldClass} appearance-none pr-9`}>
				<option value="">{placeholder}</option>
				{options.map((option) => <option key={option.value || option} value={option.value || option}>{option.label || option}</option>)}
			</select>
			<FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
		</div>
	);

	return (
		<main className="min-h-screen bg-gray-100 text-slate-900">
			<div className="border-b border-gray-200 bg-white px-6 py-3">
				<div className="mx-auto flex max-w-7xl items-center gap-3 text-sm">
					<button type="button" onClick={() => navigate('/admin')} className="text-blue-700 hover:text-blue-900">Dashboard</button>
					<span className="text-gray-400">&gt;</span>
					<button type="button" onClick={() => navigate('/admin/clearance-steps')} className="text-blue-700 hover:text-blue-900">Clearance Steps</button>
					<span className="text-gray-400">&gt;</span>
					<span className="text-gray-600">Add New Step</span>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="mx-auto max-w-7xl bg-white px-6 py-5">
				<h1 className="text-xl font-bold text-gray-900">Add New Clearance Step</h1>
				<section className="mt-5">
					<h2 className="text-base font-bold text-gray-800">Step Information</h2>
					<p className="mt-1 text-xs text-gray-600">Fill in the details below to add a new clearance step.</p>
					<div className="mt-5 grid grid-cols-1 gap-x-7 gap-y-4 md:grid-cols-2">
						<label className="text-xs font-semibold text-gray-700">Step Name <span className="text-red-500">*</span>{input('name', 'Enter step name')}</label>
						<label className="text-xs font-semibold text-gray-700">Department / Office <span className="text-red-500">*</span>{select('department', departments.map((department) => ({ value: department.id, label: department.name })), 'Select department or office')}</label>
						<label className="text-xs font-semibold text-gray-700">Step Type <span className="text-red-500">*</span>{select('type', ['Clearance', 'Approval', 'Verification'], 'Select step type')}</label>
						<label className="text-xs font-semibold text-gray-700">Step Order <span className="text-red-500">*</span>{input('order', 'Enter order number', 'number')}</label>
						<label className="text-xs font-semibold text-gray-700">Required <span className="text-red-500">*</span>{select('required', ['Yes', 'No'], 'Select required status')}</label>
						<label className="text-xs font-semibold text-gray-700">Step Status{select('status', ['Active', 'Inactive'], 'Select status')}</label>
						<label className="text-xs font-semibold text-gray-700 md:col-span-2">Description (Optional)<textarea name="description" value={formData.description} onChange={handleChange} placeholder="Enter step description" rows="2" className={fieldClass} /></label>
					</div>
				</section>

				<section className="mt-6 border-t border-gray-200 pt-4">
					<h2 className="text-base font-bold text-gray-800">Step Settings</h2>
					<div className="mt-4 grid grid-cols-1 gap-x-7 gap-y-4 md:grid-cols-2">
						<label className="text-xs font-semibold text-gray-700">Assigned Role (Approver) <span className="text-red-500">*</span>{select('role', roles.map((role) => ({ value: role._id || role.id, label: role.name })), loadingRoles ? 'Loading roles...' : 'Select role responsible for this step')}</label>
						<label className="text-xs font-semibold text-gray-700">Approver (User) (Optional){select('approver', ['Any assigned user', 'Specific user'], 'Select specific user (optional)')}</label>
						<label className="text-xs font-semibold text-gray-700">Allow Rejection{select('allowRejection', ['Yes', 'No'], 'Select option')}</label>
						<label className="text-xs font-semibold text-gray-700">Allow Comments{select('allowComments', ['Yes', 'No'], 'Select option')}</label>
					</div>
				</section>

				{error && <p className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
				<div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-4">
					<button type="button" onClick={() => navigate('/admin/clearance-steps')} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
					<button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"><FiSave /> {saving ? 'Saving...' : 'Save Step'}</button>
				</div>
			</form>
		</main>
	);
}
