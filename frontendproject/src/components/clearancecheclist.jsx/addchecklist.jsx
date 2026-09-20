import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiChevronDown, FiPlus, FiSave, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const initialForm = {
	name: 'Borrowed Books Returned',
	step: '',
	description: 'Verify that all borrowed library books have been returned by the employee.',
	order: '1',
	required: 'Yes',
	status: 'Active',
};

const fieldClass = 'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

export default function AddChecklist() {
	const navigate = useNavigate();
	const [formData, setFormData] = useState(initialForm);
	const [steps, setSteps] = useState([]);
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		const loadSteps = async () => {
			try {
				const token = localStorage.getItem('token');
				const response = await axios.get('http://localhost:3000/api/clearance-steps', { headers: { Authorization: `Bearer ${token}` } });
				setSteps(response.data.steps || []);
			} catch {
				setSteps([]);
			}
		};
		loadSteps();
	}, []);

	const handleChange = (event) => {
		setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
		if (error) setError('');
	};

	const saveChecklist = async (event, addAnother = false) => {
		event.preventDefault();
		if (!formData.name.trim() || !formData.step || !formData.order) {
			setError('Please complete all required fields before saving.');
			return;
		}
		setSaving(true);
		try {
			const savedItems = JSON.parse(localStorage.getItem('checklistItems') || '[]');
			localStorage.setItem('checklistItems', JSON.stringify([{ ...formData, id: Date.now() }, ...savedItems]));
			if (addAnother) {
				setFormData({ ...initialForm, name: '', description: '' });
			} else {
				navigate('/admin/clearance-checklist');
			}
		} catch {
			setError('Unable to save checklist item.');
		} finally {
			setSaving(false);
		}
	};

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
			<div className="border-b border-gray-200 bg-white px-6 py-4">
				<div className="mx-auto flex max-w-7xl items-center justify-between gap-3 text-xs text-gray-500">
					<h1 className="text-xl font-bold text-gray-900">Add New Clearance Checklist</h1>
					<div><button type="button" onClick={() => navigate('/admin')} className="hover:text-blue-700">Dashboard</button><span className="mx-2">/</span><button type="button" onClick={() => navigate('/admin/clearance-checklist')} className="hover:text-blue-700">Clearance Checklist</button><span className="mx-2">/</span><span className="text-blue-700">Add New</span></div>
				</div>
			</div>

			<form onSubmit={saveChecklist} className="mx-auto mt-0 max-w-7xl bg-white px-6 py-5">
				<section>
					<h2 className="border-b border-gray-200 pb-3 text-sm font-semibold text-blue-700">Checklist Information</h2>
					<div className="mt-5 grid grid-cols-1 gap-x-7 gap-y-4 md:grid-cols-2">
						<label className="text-xs font-semibold text-gray-700">Checklist Name <span className="text-red-500">*</span><input name="name" value={formData.name} onChange={handleChange} placeholder="Enter checklist name" className={fieldClass} /></label>
						<label className="text-xs font-semibold text-gray-700">Clearance Step <span className="text-red-500">*</span>{select('step', steps.map((step) => ({ value: step.id, label: step.name })), 'Select clearance step')}</label>
						<label className="text-xs font-semibold text-gray-700 md:col-span-2">Description<textarea name="description" value={formData.description} onChange={handleChange} placeholder="Enter checklist description" rows="3" className={fieldClass} /></label>
						<label className="text-xs font-semibold text-gray-700">Checklist Order <span className="text-red-500">*</span><input type="number" min="1" name="order" value={formData.order} onChange={handleChange} placeholder="Enter order" className={fieldClass} /><span className="mt-1 block text-[11px] font-normal text-gray-500">Enter the order/sequence of this checklist item.</span></label>
						<label className="text-xs font-semibold text-gray-700">Required <span className="text-red-500">*</span>{select('required', ['Yes', 'No'], 'Select required status')}<span className="mt-1 block text-[11px] font-normal text-gray-500">Is this checklist item required?</span></label>
						<label className="text-xs font-semibold text-gray-700">Status <span className="text-red-500">*</span>{select('status', ['Active', 'Inactive'], 'Select status')}<span className="mt-1 block text-[11px] font-normal text-gray-500">Select the status of this checklist item.</span></label>
					</div>
				</section>

				{error && <p className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
				<div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
					<button type="button" onClick={() => navigate('/admin/clearance-checklist')} className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-100 px-4 py-2.5 text-sm text-gray-700 hover:bg-slate-200"><FiX /> Cancel</button>
					<button type="button" disabled={saving} onClick={(event) => saveChecklist(event, true)} className="inline-flex items-center justify-center gap-2 rounded-md border border-blue-300 px-4 py-2.5 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-60"><FiPlus /> Save &amp; Add Another</button>
					<button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"><FiSave /> {saving ? 'Saving...' : 'Save'}</button>
				</div>
			</form>
		</main>
	);
}
