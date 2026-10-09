import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  FileText,
  Home,
  Info,
  Plus,
  Search,
  UserRound,
  X,
} from 'lucide-react';

const API_URL = 'http://localhost:3000/api/finance/dashboard/records';
const EMPLOYEE_API_URL = 'http://localhost:3000/api/employee';
const inputClass =
  'w-full rounded-r-md border border-l-0 border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500';
const labelClass = 'mb-1.5 block text-[11px] font-semibold text-slate-700';

const getLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

const getNextDate = (value) => {
  if (!isValidDate(value)) return '';
  const [year, month, day] = value.split('-').map(Number);
  return getLocalDate(new Date(year, month - 1, day + 1));
};

const getInitialForm = () => {
  const issueDate = getLocalDate();
  const due = new Date();
  due.setMonth(due.getMonth() + 2);
  return {
    type: 'Loan',
    adjustmentDirection: 'Increase',
    amount: '',
    paidAmount: '0',
    issueDate,
    dueDate: getLocalDate(due),
    description: '',
    notes: '',
  };
};

const money = (value) =>
  `ETB ${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: 'Bearer ' + token } : {};
};

const getRecordStatus = (amount, paidAmount) => {
  if (amount <= 0) return 'Outstanding';
  if (paidAmount <= 0) return 'Outstanding';
  if (paidAmount >= amount) return 'Paid';
  return 'Partially Paid';
};

const PAYMENT_RECORD_TYPE = 'Payment / Repayment';
const isCreditEntry = (type, adjustmentDirection) =>
  type === PAYMENT_RECORD_TYPE || (type === 'Adjustment' && adjustmentDirection === 'Reduce');

export default function AddFinancialRecord() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [existingOutstanding, setExistingOutstanding] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState('');
  const [form, setForm] = useState(getInitialForm);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [employeeError, setEmployeeError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const response = await axios.get(EMPLOYEE_API_URL, { headers: getAuthHeaders() });
        const data = response.data || {};
        if (!Array.isArray(data.employees)) {
          throw new Error(data.message || 'The employee list response was invalid.');
        }
        setEmployees(data.employees);
      } catch (error) {
        setEmployeeError(error.response?.data?.message || error.message || 'Unable to load employees.');
      } finally {
        setLoadingEmployees(false);
      }
    };

    loadEmployees();
  }, []);

  const amount = Number(form.amount) || 0;
  const paidAmount = Number(form.paidAmount) || 0;
  const today = getLocalDate();
  const issueDateError = !form.issueDate
    ? 'Issue Date is required.'
    : !isValidDate(form.issueDate)
      ? 'Issue Date must be a valid date.'
      : form.issueDate > today
        ? 'Issue Date cannot be in the future.'
        : '';
  const dueDateError = !form.dueDate
    ? 'Due Date is required.'
    : !isValidDate(form.dueDate)
      ? 'Due Date must be a valid date.'
      : form.dueDate <= form.issueDate
        ? 'Due Date must be after Issue Date.'
        : form.dueDate <= today
          ? 'Due Date must be after today.'
          : '';
  const dueDateMin = form.issueDate && form.issueDate >= today
    ? getNextDate(form.issueDate)
    : getNextDate(today);
  const outstandingAmount = existingOutstanding === null
    ? null
    : Math.max(
      existingOutstanding + (isCreditEntry(form.type, form.adjustmentDirection) ? -amount : amount - paidAmount),
      0
    );
  const status = getRecordStatus(amount, paidAmount);
  const matchingEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    if (!query || selectedEmployee) return [];
    return employees
      .filter((employee) =>
        `${employee.fullName || ''} ${employee.employeeId || ''} ${employee.department || ''}`
          .toLowerCase()
          .includes(query)
      )
      .slice(0, 6);
  }, [employeeSearch, employees, selectedEmployee]);

  const updateForm = (event) => {
    const { name, value } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === 'type') {
        next.paidAmount = isCreditEntry(value, current.adjustmentDirection) ? current.amount : '0';
      }
      if (name === 'adjustmentDirection' && current.type === 'Adjustment') {
        next.paidAmount = isCreditEntry(current.type, value) ? current.amount : '0';
      }
      if (name === 'amount' && isCreditEntry(current.type, current.adjustmentDirection)) {
        next.paidAmount = value;
      }
      if (name === 'amount' && getRecordStatus(Number(value) || 0, Number(current.paidAmount) || 0) === 'Paid') {
        next.paidAmount = value;
      }
      if (name === 'paidAmount' && Number(value) > Number(current.amount)) {
        next.paidAmount = current.amount;
      }
      return next;
    });
    setFormError('');
  };

  const selectEmployee = async (employee) => {
    setSelectedEmployee(employee);
    setEmployeeSearch(employee.fullName || employee.employeeId);
    setExistingOutstanding(null);
    setBalanceError('');
    setLoadingBalance(true);
    setFormError('');
    try {
      const response = await axios.get(API_URL, {
        params: { employeeId: employee.employeeId },
        headers: getAuthHeaders(),
      });
      const totalOutstanding = Number(response.data?.summary?.totalOutstanding);
      if (!response.data?.success || !Number.isFinite(totalOutstanding)) {
        throw new Error(response.data?.message || 'Unable to calculate the employee balance.');
      }
      setExistingOutstanding(totalOutstanding);
    } catch (error) {
      setExistingOutstanding(null);
      setBalanceError(error.response?.data?.message || error.message || 'Unable to calculate the employee balance.');
    } finally {
      setLoadingBalance(false);
    }
  };

  const clearSelectedEmployee = () => {
    setSelectedEmployee(null);
    setEmployeeSearch('');
    setExistingOutstanding(0);
    setBalanceError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!selectedEmployee?.employeeId) {
      setFormError('Select an employee from the search results.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Amount must be greater than zero.');
      return;
    }
    if (!Number.isFinite(paidAmount) || paidAmount < 0 || paidAmount > amount) {
      setFormError('Paid amount must be between zero and the total amount.');
      return;
    }
    if (isCreditEntry(form.type, form.adjustmentDirection) && paidAmount !== amount) {
      setFormError('A repayment or balance-reducing adjustment must be recorded as fully applied.');
      return;
    }
    if (issueDateError) {
      setFormError(issueDateError);
      return;
    }
    if (dueDateError) {
      setFormError(dueDateError);
      return;
    }
    if (!form.description.trim()) {
      setFormError('Description / reason is required.');
      return;
    }

    try {
      setSaving(true);
      const response = await axios.post(
        API_URL,
        {
          employeeId: selectedEmployee.employeeId,
          type: form.type,
          ...(form.type === 'Adjustment' ? { adjustmentDirection: form.adjustmentDirection } : {}),
          amount,
          paidAmount,
          status,
          issueDate: form.issueDate,
          dueDate: form.dueDate,
          description: form.description.trim(),
          notes: form.notes.trim(),
        },
        { headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' } }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to save financial record.');
      }
      navigate('/finance-office/records', {
        state: { successMessage: 'Financial record saved successfully.' },
      });
    } catch (error) {
      setFormError(error.response?.data?.message || error.message || 'Unable to save financial record.');
    } finally {
      setSaving(false);
    }
  };

  const summaryRows = [
    ['Employee', selectedEmployee?.fullName || 'Select an employee'],
    ['Employee ID', selectedEmployee?.employeeId || '—'],
    ['Department', selectedEmployee?.department || '—'],
    ['Record Type', form.type],
    ...(form.type === 'Adjustment' ? [['Adjustment Direction', form.adjustmentDirection]] : []),
    ['Amount', money(amount)],
    ['Paid Amount', money(paidAmount)],
  ];

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-[11px] text-slate-500">
          <Link to="/finance-office/records" className="inline-flex items-center gap-1 hover:text-blue-600">
            <Home size={13} />
            Financial Records
          </Link>
          <span className="text-slate-300">›</span>
          <span className="font-medium text-slate-700">Add Record</span>
        </nav>

        <header className="mb-5 flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white">
            <Plus size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Add Financial Record</h1>
            <p className="text-xs text-slate-500">Record employee financial obligation (loan, advance, payment, etc.)</p>
          </div>
        </header>

        <div className="grid items-start gap-4 lg:grid-cols-[1.8fr_1fr]">
          <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            {formError && (
              <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {formError}
              </div>
            )}

            <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <label htmlFor="employeeSearch" className={labelClass}>Employee <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="flex">
                    <span className="flex items-center rounded-l-md border border-r-0 border-slate-200 bg-slate-50 px-3 text-slate-500">
                      <UserRound size={15} />
                    </span>
                    <input
                      id="employeeSearch"
                      value={employeeSearch}
                      onChange={(event) => {
                        setEmployeeSearch(event.target.value);
                        if (selectedEmployee) {
                          setSelectedEmployee(null);
                          setExistingOutstanding(0);
                          setBalanceError('');
                          setLoadingBalance(false);
                        }
                      }}
                      placeholder={loadingEmployees ? 'Loading employees...' : 'Search by name or employee ID...'}
                      disabled={loadingEmployees || Boolean(employeeError)}
                      autoComplete="off"
                      className={`${inputClass} rounded-r-none`}
                    />
                    <span className="flex items-center rounded-r-md border border-l-0 border-slate-200 bg-white px-3 text-slate-500">
                      {selectedEmployee ? (
                        <button type="button" onClick={clearSelectedEmployee} aria-label="Clear employee">
                          <X size={14} />
                        </button>
                      ) : (
                        <Search size={14} />
                      )}
                    </span>
                  </div>
                  {matchingEmployees.length > 0 && (
                    <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                      {matchingEmployees.map((employee) => (
                        <button
                          key={employee._id || employee.employeeId}
                          type="button"
                          onClick={() => selectEmployee(employee)}
                          className="flex w-full items-start gap-2 border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-blue-50"
                        >
                          <UserRound size={15} className="mt-0.5 text-blue-600" />
                          <span>
                            <span className="block text-xs font-semibold text-slate-800">{employee.fullName}</span>
                            <span className="text-[10px] text-slate-500">
                              Employee ID: {employee.employeeId} · {employee.department || 'Department unavailable'}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {employeeError ? (
                  <p role="alert" className="mt-1 text-[10px] text-red-600">{employeeError}</p>
                ) : selectedEmployee ? (
                  <div className="mt-2 flex items-center gap-3 rounded-md border border-blue-100 bg-blue-50/70 p-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <UserRound size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-bold text-slate-800">{selectedEmployee.fullName}</span>
                      <span className="mt-0.5 block text-[10px] text-slate-500">
                        Employee ID: {selectedEmployee.employeeId}
                      </span>
                      <span className="block text-[10px] text-slate-500">Department: {selectedEmployee.department || 'N/A'}</span>
                    </span>
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  </div>
                ) : employeeSearch && !loadingEmployees && matchingEmployees.length === 0 ? (
                  <p className="mt-1 text-[10px] text-slate-500">No matching employees found.</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="recordType" className={labelClass}>Record Type <span className="text-red-500">*</span></label>
                <div className="flex">
                  <span className="flex items-center rounded-l-md border border-r-0 border-slate-200 bg-slate-50 px-3 text-slate-500">
                    <FileText size={15} />
                  </span>
                  <select id="recordType" name="type" value={form.type} onChange={updateForm} className={`${inputClass} appearance-none`}>
                    <option value="Loan">Loan</option>
                    <option value="Salary Advance">Salary Advance</option>
                    <option value="Other Financial Obligation">Other Financial Obligation</option>
                    <option value={PAYMENT_RECORD_TYPE}>{PAYMENT_RECORD_TYPE}</option>
                    <option value="Adjustment">Adjustment</option>
                  </select>
                  <span className="flex items-center rounded-r-md border border-l-0 border-slate-200 bg-white px-2 text-slate-500">
                    <ChevronDown size={14} />
                  </span>
                </div>
              </div>

              {form.type === 'Adjustment' && (
                <div>
                  <label htmlFor="adjustmentDirection" className={labelClass}>Adjustment Direction <span className="text-red-500">*</span></label>
                  <div className="flex">
                    <span className="flex items-center rounded-l-md border border-r-0 border-slate-200 bg-slate-50 px-3 text-slate-500">
                      <FileText size={15} />
                    </span>
                    <select
                      id="adjustmentDirection"
                      name="adjustmentDirection"
                      value={form.adjustmentDirection}
                      onChange={updateForm}
                      className={`${inputClass} appearance-none`}
                    >
                      <option value="Increase">Increase outstanding balance</option>
                      <option value="Reduce">Reduce outstanding balance</option>
                    </select>
                    <span className="flex items-center rounded-r-md border border-l-0 border-slate-200 bg-white px-2 text-slate-500">
                      <ChevronDown size={14} />
                    </span>
                  </div>
                </div>
              )}

              <MoneyField label="Amount (ETB)" name="amount" value={form.amount} onChange={updateForm} required />
              <DateField
                label="Issue Date"
                name="issueDate"
                value={form.issueDate}
                onChange={updateForm}
                max={today}
                error={issueDateError}
                required
              />
              <DateField
                label="Due Date"
                name="dueDate"
                value={form.dueDate}
                onChange={updateForm}
                min={dueDateMin}
                error={dueDateError}
                required
              />
              <MoneyField
                label="Paid Amount (ETB)"
                name="paidAmount"
                value={form.paidAmount}
                onChange={updateForm}
                required
                readOnly={isCreditEntry(form.type, form.adjustmentDirection)}
              />

              <div>
                <label className={labelClass}>Payment Status <span className="text-slate-400">(Calculated automatically)</span></label>
                <div className="flex h-[38px] items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3">
                  <span className={`h-2 w-2 rounded-full ${
                    status === 'Outstanding' ? 'bg-red-500' : status === 'Partially Paid' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                  <span className={`text-xs font-semibold ${
                    status === 'Outstanding' ? 'text-red-700' : status === 'Partially Paid' ? 'text-amber-700' : 'text-emerald-700'
                  }`}>{status}</span>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="description" className={labelClass}>Description / Reason <span className="text-red-500">*</span></label>
                <div className="flex">
                  <span className="flex items-start rounded-l-md border border-r-0 border-slate-200 bg-slate-50 px-3 py-3 text-slate-500">
                    <FileText size={15} />
                  </span>
                  <textarea
                    id="description"
                    name="description"
                    value={form.description}
                    onChange={updateForm}
                    maxLength={500}
                    rows={3}
                    required
                    placeholder="Describe the reason for this financial record..."
                    className={`${inputClass} resize-y rounded-r-md`}
                  />
                </div>
                <p className="mt-1 text-right text-[10px] text-slate-400">{form.description.length}/500</p>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="notes" className={labelClass}>Notes <span className="font-normal text-slate-400">(Optional)</span></label>
                <div className="flex">
                  <span className="flex items-start rounded-l-md border border-r-0 border-slate-200 bg-slate-50 px-3 py-3 text-slate-500">
                    <FileText size={15} />
                  </span>
                  <textarea
                    id="notes"
                    name="notes"
                    value={form.notes}
                    onChange={updateForm}
                    maxLength={500}
                    rows={2}
                    placeholder="Additional notes..."
                    className={`${inputClass} resize-y rounded-r-md`}
                  />
                </div>
                <p className="mt-1 text-right text-[10px] text-slate-400">{form.notes.length}/500</p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 rounded-md bg-slate-50 p-3">
              <button
                type="button"
                onClick={() => navigate('/finance-office/records')}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
              >
                <ArrowLeft size={13} /> Cancel
              </button>
              <button
                type="submit"
                disabled={saving || loadingEmployees || loadingBalance || Boolean(employeeError) || Boolean(balanceError) || Boolean(issueDateError) || Boolean(dueDateError)}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                <CheckCircle2 size={14} />
                {saving ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </form>

          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-slate-900">Record Summary</h2>
            <div className="space-y-3 rounded-md border border-blue-100 bg-blue-50/30 p-3">
              {summaryRows.map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3 text-[10px]">
                  <span className="text-slate-500">{label}</span>
                  <span className="max-w-[60%] break-words text-right font-medium text-slate-800">{value}</span>
                </div>
              ))}
              <div className="flex items-start justify-between gap-3 border-t border-blue-100 pt-3 text-[10px]">
                <span className="text-slate-500">Outstanding after this record</span>
                <span className={`text-right font-bold ${outstandingAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {loadingBalance ? 'Calculating...' : outstandingAmount === null ? 'Unavailable' : money(outstandingAmount)}
                </span>
              </div>
              {balanceError && (
                <p role="alert" className="border-t border-blue-100 pt-2 text-[10px] text-red-600">
                  {balanceError}
                </p>
              )}
              <div className="flex items-center justify-between gap-3 text-[10px]">
                <span className="text-slate-500">Status</span>
                <span className={`rounded-full px-2 py-1 font-semibold ${
                  status === 'Outstanding'
                    ? 'bg-red-100 text-red-700'
                    : status === 'Partially Paid'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {status}
                </span>
              </div>
            </div>

            <div className="mt-3 flex gap-2 rounded-md border border-teal-100 bg-teal-50 p-3 text-[10px] leading-relaxed text-teal-800">
              <Info size={15} className="mt-0.5 shrink-0 text-teal-700" />
              <p>This record will be added to the employee's financial history and used in the clearance evaluation process.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function MoneyField({ label, name, value, onChange, required, readOnly = false }) {
  return (
    <div>
      <label htmlFor={name} className={labelClass}>{label} {required && <span className="text-red-500">*</span>}</label>
      <div className="flex">
        <span className="flex items-center rounded-l-md border border-r-0 border-slate-200 bg-slate-50 px-3 text-slate-500">
          <CircleDollarSign size={15} />
        </span>
        <input
          id={name}
          name={name}
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={onChange}
          required={required}
          readOnly={readOnly}
          placeholder="0.00"
          className={`${inputClass} ${readOnly ? 'cursor-not-allowed bg-slate-50' : ''}`}
        />
      </div>
    </div>
  );
}

function DateField({ label, name, value, onChange, min, max, error, required }) {
  return (
    <div>
      <label htmlFor={name} className={labelClass}>{label} {required && <span className="text-red-500">*</span>}</label>
      <div className="flex">
        <span className="flex items-center rounded-l-md border border-r-0 border-slate-200 bg-slate-50 px-3 text-slate-500">
          <CalendarDays size={15} />
        </span>
        <input
          id={name}
          name={name}
          type="date"
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          className={`${inputClass} ${error ? 'border-red-400 focus:border-red-500' : ''}`}
        />
      </div>
      {error && <p id={`${name}-error`} role="alert" className="mt-1 text-[10px] text-red-600">{error}</p>}
    </div>
  );
}
