import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiArrowLeft, FiCheck, FiUploadCloud } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { createEmployee } from '../../until/EmployeeHelper';

const initialForm = {
  employeeId: `BDU_${new Date().getFullYear()}_${String(Date.now()).slice(-6)}`,
  fullName: '', gender: 'Male', dateOfBirth: '', maritalStatus: '',
  nationality: 'Ethiopian', phone: '', alternativePhone: '', email: '', employmentType: 'Permanent',
  employmentDate: '', status: 'Active', position: '', department: '', campus: '',
  region: '', city: '', subCity: '', woreda: '', kebele: '', houseNumber: '',
  nationalId: '', tin: '', bankAccount: '', emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelationship: '',
  educationLevel: '', notes: '',
};

const inputClass = 'mt-1 h-9 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const phonePattern = /^(?:09[0-9]{8}|\+2519[0-9]{8})$/;
const normalizePhoneNumber = (value) => value.startsWith('+251') ? `0${value.slice(4)}` : value;
const namePattern = /^[\p{L}]+(?:[\s'-]+[\p{L}]+)*$/u;
const houseNumberPattern = /^[\p{L}\p{N}]+(?:[\s/#-]*[\p{L}\p{N}]+)*$/u;
const addressNameFields = ['region', 'city', 'subCity', 'woreda', 'kebele', 'emergencyContactName'];
const gmailPattern = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?@gmail\.com$/i;
const today = new Date();
const maxDateOfBirth = today.toISOString().slice(0, 10);
const minimumDateOfBirth = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toISOString().slice(0, 10);
const maxEmploymentDate = today.toISOString().slice(0, 10);

function Field({ label, name, form, update, required = false, type = 'text', pattern, placeholder, inputMode, minLength, min, max, title, children }) {
  const effectivePattern = name === 'email'
    ? '[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?@gmail\\.com'
    : ['phone', 'alternativePhone', 'emergencyContactPhone'].includes(name)
      ? '(?:09[0-9]{8}|\\+2519[0-9]{8})'
      : addressNameFields.includes(name)
        ? '[\\p{L}]+(?:[\\s\'-]+[\\p{L}]+)*'
        : name === 'houseNumber'
          ? '[\\p{L}\\p{N}]+(?:[\\s/#-]*[\\p{L}\\p{N}]+)*'
        : pattern;
  const effectiveTitle = name === 'email'
    ? 'Use an email address such as name@gmail.com or name123@gmail.com.'
    : ['phone', 'alternativePhone', 'emergencyContactPhone'].includes(name)
      ? 'Use 10 digits starting with 09 or the +2519xxxxxxxx format.'
      : addressNameFields.includes(name)
        ? 'Use letters only; spaces, hyphens, and apostrophes are allowed.'
        : name === 'houseNumber'
          ? 'Use letters, numbers, spaces, hyphens, slashes, or #.'
      : title;
  return <label className="block text-[11px] font-semibold text-slate-700">{label}{required && <span className="text-red-500"> *</span>}{children || <input className={inputClass} name={name} type={type} value={form[name] || ''} onChange={update} required={required} pattern={effectivePattern} placeholder={placeholder} inputMode={inputMode} minLength={minLength} min={min} max={max} title={effectiveTitle} />}</label>;
}

function SelectField({ label, name, options, form, update, required = false }) {
  return <Field label={label} name={name} form={form} update={update} required={required}><select className={inputClass} name={name} value={form[name] || ''} onChange={update} required={required}><option value="">Select {label}</option>{options.map((option) => <option key={option}>{option}</option>)}</select></Field>;
}

function Section({ number, title, children, className = '' }) {
  return <section className={`rounded-md border border-slate-200 bg-white shadow-sm ${className}`}><h2 className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-xs font-bold text-[#1457a6]"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">{number}</span>{title}</h2><div className="grid gap-x-3 gap-y-2.5 p-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div></section>;
}

export default function AddEmployee() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/api/departments', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDepartments(response.data.departments || []);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load departments.');
      }
    };

    const loadPositions = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/api/positions', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPositions(response.data.positions || []);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load positions.');
      }
    };

    loadDepartments();
    loadPositions();
  }, []);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setError('');
    if (!phonePattern.test(form.phone.trim())) { setError('Phone number must contain only digits: use 10 digits starting with 09 or the +2519xxxxxxxx format.'); return; }
    if (form.alternativePhone.trim() && !phonePattern.test(form.alternativePhone.trim())) { setError('Alternative phone number must contain only digits and use the 09xxxxxxxx or +2519xxxxxxxx format.'); return; }
    if (form.emergencyContactPhone.trim() && !phonePattern.test(form.emergencyContactPhone.trim())) { setError('Emergency Contact Phone must contain only digits and use the 09xxxxxxxx or +2519xxxxxxxx format.'); return; }
    if (form.alternativePhone.trim() && normalizePhoneNumber(form.phone.trim()) === normalizePhoneNumber(form.alternativePhone.trim())) { setError('Phone Number and Alternative Phone must be different numbers.'); return; }
    if (!namePattern.test(form.fullName.trim())) { setError('Full Name must contain letters only, with spaces, hyphens, or apostrophes allowed.'); return; }
      if (!form.employmentDate || form.employmentDate > maxEmploymentDate) { setError('Employment Date cannot be in the future.'); return; }
    <Field label="Employment Date" name="employmentDate" form={form} update={update} required type="date" max={maxEmploymentDate} title="Employment Date cannot be in the future." />
    for (const field of addressNameFields) {
      if (form[field].trim() && !namePattern.test(form[field].trim())) { setError(`${field} must contain letters only, with spaces, hyphens, or apostrophes allowed.`); return; }
    }
    if (form.houseNumber.trim() && !houseNumberPattern.test(form.houseNumber.trim())) { setError('House Number may contain letters, numbers, spaces, hyphens, slashes, and # only.'); return; }
    if (!gmailPattern.test(form.email.trim())) { setError('Email address must use the format name@gmail.com or name123@gmail.com.'); return; }
    if (form.dateOfBirth && (form.dateOfBirth > minimumDateOfBirth || form.dateOfBirth > maxDateOfBirth)) { setError('Employee must be at least 18 years old.'); return; }

    setSaving(true);
    const employee = {
      ...form,
      phone: normalizePhoneNumber(form.phone.trim()),
      alternativePhone: form.alternativePhone.trim() ? normalizePhoneNumber(form.alternativePhone.trim()) : '',
      emergencyPhone: form.emergencyContactPhone.trim() ? normalizePhoneNumber(form.emergencyContactPhone.trim()) : '',
      fullName: form.fullName.trim(),
      hireDate: form.employmentDate,
      qualification: form.educationLevel,
      roomNumber: form.houseNumber,
      tinNumber: form.tin,
      emergencyContact: form.emergencyContactName,
      emergencyPhone: form.emergencyContactPhone,
      relationship: form.emergencyContactRelationship,
      address: [form.region, form.city, form.subCity, form.woreda, form.kebele, form.houseNumber].filter(Boolean).join(', '),
    };
    try { await createEmployee(employee); navigate('/hr-office/employees'); } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to add employee.'); } finally { setSaving(false); }
  };

  return <main className="min-h-screen bg-[#f5f7fa] p-3 sm:p-5"><div className="mx-auto max-w-[1320px]">
    <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"><div><p className="text-[10px] text-slate-400">Dashboard <span className="px-1">/</span> Employees <span className="px-1">/</span> Create New Employee</p><h1 className="mt-2 text-lg font-bold text-slate-900">Create New Employee</h1><p className="text-[11px] text-slate-500">Add a new employee to the organization</p></div><button type="button" onClick={() => navigate('/hr-office/employees')} className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-600 shadow-sm"><FiArrowLeft /> Back to Employees</button></div>
    <form onSubmit={submit}>
      <div className="grid gap-3 xl:grid-cols-2"><Section number="1" title="Personal Information"><Field label="Full Name" name="fullName" form={form} update={update} required pattern="[A-Za-z\u1200-\u137F][A-Za-z\u1200-\u137F' -]*" title="Use letters only; spaces, hyphens, and apostrophes are allowed." /><SelectField label="Gender" name="gender" options={['Male', 'Female', 'Other']} form={form} update={update} required /><Field label="Date of Birth" name="dateOfBirth" form={form} update={update} type="date" /><SelectField label="Marital Status" name="maritalStatus" options={['Single', 'Married', 'Divorced', 'Widowed']} form={form} update={update} /><SelectField label="Nationality" name="nationality" options={['Ethiopian', 'Other']} form={form} update={update} required /><Field label="Phone Number" name="phone" form={form} update={update} required type="tel" pattern="09[0-9]{8}" placeholder="0911234567" inputMode="tel" /><Field label="Alternative Phone" name="alternativePhone" form={form} update={update} type="tel" pattern="09[0-9]{8}" placeholder="0911234567" inputMode="tel" /><Field label="Email Address" name="email" form={form} update={update} required type="email" pattern="[^\s@]+@[^\s@]+\.[^\s@]+" title="Enter a valid email address." /></Section>
        <Section number="2" title="Employee Information"><Field label="Employee ID" name="employeeId" form={form} update={update} required /><SelectField label="Employment Type" name="employmentType" options={['Permanent', 'Contract', 'Temporary', 'Intern']} form={form} update={update} required /><Field label="Employment Date" name="employmentDate" form={form} update={update} required type="date" /><SelectField label="Employee Status" name="status" options={['Active', 'Inactive']} form={form} update={update} required /><SelectField label="Position" name="position" options={positions.map((position) => position.title || position.name)} form={form} update={update} required /><SelectField label="Educational Qualification" name="educationLevel" options={['PhD', "Master's Degree", "Bachelor's Degree", 'Diploma', 'Certificate', 'TVET', '12th Grade', '10th Grade', 'Other']} form={form} update={update} required /><SelectField label="Department" name="department" options={departments.map((department) => department.name)} form={form} update={update} required /><SelectField label="Campus" name="campus" options={['Main (Peda) Campus', 'BiT (Poly) Campus', 'Zenzelma Campus', 'Gish Abay Campus', 'Tibebe Ghion Campus', 'Tana Campus', 'Gish Abay / Yibab Campus', 'Selam (EiTEX) Campus', 'Gilgel Abay Campus']} form={form} update={update} required /></Section>
        <Section number="3" title="Contact & Address"><Field label="Region" name="region" form={form} update={update} /><Field label="City" name="city" form={form} update={update} /><Field label="Sub City / District" name="subCity" form={form} update={update} /><Field label="Woreda" name="woreda" form={form} update={update} /><Field label="Kebele" name="kebele" form={form} update={update} /><Field label="House Number" name="houseNumber" form={form} update={update} /><Field label="Emergency Contact Name" name="emergencyContactName" form={form} update={update} /><Field label="Emergency Contact Phone" name="emergencyContactPhone" form={form} update={update} /><Field label="Relationship" name="emergencyContactRelationship" form={form} update={update} /></Section>
        <Section number="4" title="Identification"><Field label="National ID" name="nationalId" form={form} update={update} /><Field label="TIN" name="tin" form={form} update={update} /><Field label="Bank Account" name="bankAccount" form={form} update={update} /></Section>
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-2"><Section number="5" title="Documents" className="h-full"><div className="col-span-full grid grid-cols-2 gap-2 sm:grid-cols-4"><label className="flex h-20 cursor-pointer flex-col items-center justify-center rounded border border-dashed border-slate-300 text-[10px] text-slate-500 hover:border-blue-400"><FiUploadCloud className="mb-1 text-base text-blue-500" />Choose Photo<input type="file" className="hidden" accept="image/*" /></label>{['ID Document', 'Employment Letter', 'Appointment Letter'].map((label) => <div key={label} className="flex h-20 flex-col items-center justify-center rounded border border-dashed border-slate-300 text-[10px] text-slate-400"><FiUploadCloud className="mb-1 text-base" />{label}<span className="text-[9px]">PDF / PNG</span></div>)}</div></Section><Section number="6" title="Additional Information" className="h-full"><Field label="Notes" name="notes" form={form} update={update}><textarea className={`${inputClass} h-20 py-2`} name="notes" value={form.notes} onChange={update} placeholder="Enter any additional information about the employee..." /></Field></Section></div>
      <div className="mt-3 flex flex-col items-start justify-between gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center"><div className="flex items-center gap-2 text-[11px] text-slate-600"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">7</span><strong>Status</strong><span className="ml-3">Employee Status: <b className="text-emerald-600">{form.status}</b></span></div><div className="flex gap-2"><button type="button" onClick={() => navigate('/hr-office/employees')} className="rounded border border-slate-300 px-4 py-2 text-[11px] text-slate-600">Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-60"><FiCheck />{saving ? 'Saving...' : 'Save Employee'}</button></div></div>{error && <p className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-600">{error}</p>}
    </form>
  </div></main>;
}
