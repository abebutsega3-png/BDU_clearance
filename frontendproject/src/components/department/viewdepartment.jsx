import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaBuilding, FaCheckCircle, FaEdit, FaGlobe, FaUserTie } from 'react-icons/fa';

const DetailItem = ({ label, value }) => (
	<div className="border-b border-slate-100 py-3 last:border-b-0">
		<dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
		<dd className="mt-1 text-sm font-medium text-slate-800">{value || 'Not provided'}</dd>
	</div>
);

const ViewDepartment = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const [department, setDepartment] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		const fetchDepartment = async () => {
			try {
				const response = await axios.get(`http://localhost:3000/api/departments/${id}`, {
					headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
				});
				setDepartment(response.data.department);
			} catch (requestError) {
				setError(requestError.response?.data?.message || 'Unable to load department details.');
			} finally {
				setLoading(false);
			}
		};

		fetchDepartment();
	}, [id]);

	if (loading) {
		return <div className="p-6 text-sm text-slate-500">Loading department details...</div>;
	}

	if (error || !department) {
		return (
			<div className="p-6">
				<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
					{error || 'Department not found.'}
				</div>
				<button type="button" onClick={() => navigate('/admin/departments')} className="mt-4 text-sm font-medium text-blue-700 hover:text-blue-900">
					Back to departments
				</button>
			</div>
		);
	}

	const isActive = department.isApprovingDepartment ?? department.status === 'Active';

	return (
		<div className="min-h-screen bg-slate-50 p-6">
			<div className="mx-auto max-w-6xl">
				<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-widest text-blue-700">BDU Employee Clearance System</p>
						<h1 className="mt-1 text-2xl font-bold text-slate-900">Department Details</h1>
						<p className="mt-1 text-sm text-slate-500">Review the department information used for employee clearance routing.</p>
					</div>
					<div className="flex gap-2">
						<button type="button" onClick={() => navigate('/admin/departments')} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
							<FaArrowLeft size={13} /> Back
						</button>
						<button type="button" onClick={() => navigate(`/admin/edit-department/${id}`)} className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700">
							<FaEdit size={13} /> Edit Department
						</button>
					</div>
				</div>

				<div className="grid gap-6 lg:grid-cols-3">
					<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
						<div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-4">
							<div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><FaBuilding size={20} /></div>
							<div>
								<h2 className="text-lg font-semibold text-slate-900">{department.departmentName}</h2>
								<p className="text-sm text-slate-500">Department code: {department.departmentCode}</p>
							</div>
						</div>
						<dl className="grid gap-x-8 md:grid-cols-2">
							<DetailItem label="Department name" value={department.departmentName} />
							<DetailItem label="Department code" value={department.departmentCode} />
							<DetailItem label="Department type / role" value={department.departmentType} />
							<DetailItem label="Department head / employee" value={department.departmentHead} />
							<DetailItem label="Delegated assistant" value={department.delegatedAssistant} />
							<DetailItem label="Campus" value={department.campus} />
							<DetailItem label="Building" value={department.building} />
							<DetailItem label="Office / room" value={department.office} />
						</dl>
					</section>

					<aside className="space-y-6">
						<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
							<div className="mb-4 flex items-center gap-2 text-slate-800"><FaCheckCircle className="text-green-600" /><h2 className="font-semibold">Clearance status</h2></div>
							<div className={`rounded-lg p-4 ${isActive ? 'bg-green-50' : 'bg-yellow-50'}`}>
								<p className={`text-sm font-semibold ${isActive ? 'text-green-700' : 'text-yellow-700'}`}>{isActive ? 'Active approving department' : 'Inactive department'}</p>
								<p className="mt-1 text-xs text-slate-600">This status controls whether the department can participate in employee clearance approval.</p>
							</div>
						</section>
						<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
							<div className="mb-3 flex items-center gap-2 text-slate-800"><FaUserTie className="text-blue-600" /><h2 className="font-semibold">Responsible employee</h2></div>
							<p className="text-sm font-medium text-slate-800">{department.departmentHead || 'Not assigned'}</p>
							<p className="mt-1 text-xs text-slate-500">Department head responsible for this clearance office.</p>
						</section>
						<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
							<div className="mb-3 flex items-center gap-2 text-slate-800"><FaGlobe className="text-blue-600" /><h2 className="font-semibold">Location</h2></div>
							<p className="text-sm font-medium text-slate-800">{department.campus || 'Campus not provided'}</p>
							<p className="mt-1 text-xs text-slate-500">{[department.building, department.office].filter(Boolean).join(' - ') || 'Building and office not provided'}</p>
						</section>
					</aside>
				</div>
			</div>
		</div>
	);
};

export default ViewDepartment;
