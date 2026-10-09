import {
  calculateFinancialRecordBalances,
  isFinancialCredit,
  isFinancialPayment,
  isFinancialReversal,
} from './financialRecordBalance.js';

const FINANCIAL_STATUSES = new Set([
  'Cleared',
  'Outstanding',
  'Pending',
  'Under Review',
  'Returned',
  'Rejected',
]);

const normalizeStatus = (request) => {
  const status = String(request.financeStatus || request.status || request.overallStatus || '').trim();
  return status === 'In Progress' ? 'Under Review' : status || 'Pending';
};

const getClearanceReason = (request) =>
  request.clearanceType || request.clearanceReason || request.reason || '';

const getDepartment = (value) => {
  if (typeof value === 'string') return value;
  return value?.name || value?.departmentName || '';
};

export const getFinanceReportDateRange = (filters, now = new Date()) => {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(today);
  const end = new Date(today);
  switch (filters.period) {
    case 'today':
      break;
    case 'weekly': {
      const daysFromMonday = (today.getUTCDay() + 6) % 7;
      start.setUTCDate(start.getUTCDate() - daysFromMonday);
      end.setUTCDate(start.getUTCDate() + 6);
      break;
    }
    case 'monthly':
      start.setUTCDate(1);
      end.setUTCMonth(end.getUTCMonth() + 1, 0);
      break;
    case 'yearly':
      start.setUTCMonth(0, 1);
      end.setUTCMonth(11, 31);
      break;
    case 'custom':
      return { startDate: filters.startDate || '', endDate: filters.endDate || '' };
    default:
      return { startDate: '', endDate: '' };
  }
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

const recordIsDebt = (record) =>
  !isFinancialCredit(record)
  && !isFinancialReversal(record)
  && !(record.type === 'Adjustment' && record.adjustmentDirection === 'Reduce');

const getOutstandingStatus = (request, balance) => {
  if (balance > 0) return 'Outstanding';
  const status = normalizeStatus(request);
  if (['Approved', 'Completed'].includes(status)) return 'Cleared';
  return status;
};

const uniqueSorted = (values) => [...new Set(values.filter(Boolean))].sort((left, right) =>
  String(left).localeCompare(String(right))
);

export const buildFinanceReportData = ({
  requests,
  financialRecords,
  employees,
  filters,
  now = new Date(),
}) => {
  const employeeMap = new Map(employees.map((employee) => [employee.employeeId, employee]));
  const recordsByEmployee = new Map();
  financialRecords.forEach((record) => {
    const employeeRecords = recordsByEmployee.get(record.employeeId) || [];
    employeeRecords.push(record);
    recordsByEmployee.set(record.employeeId, employeeRecords);
  });

  const employeeBalances = new Map();
  recordsByEmployee.forEach((records, employeeId) => {
    const balances = calculateFinancialRecordBalances(records);
    const obligations = records.filter(recordIsDebt).map((record) => {
      const balance = balances.get(record) || { paidAmount: 0, outstandingAmount: 0, status: 'Outstanding' };
      return { record, ...balance };
    });
    employeeBalances.set(employeeId, obligations);
  });

  const range = getFinanceReportDateRange(filters, now);
  const start = range.startDate ? new Date(`${range.startDate}T00:00:00.000Z`) : null;
  const end = range.endDate ? new Date(`${range.endDate}T23:59:59.999Z`) : null;
  const matchedRequests = requests.filter((request) => {
    const createdAt = new Date(request.createdAt || request.requestDate || 0);
    const employee = employeeMap.get(request.employeeId) || {};
    const department = getDepartment(request.department) || employee.department || '';
    const campus = request.campus || request.employee?.campus || employee.campus || '';
    const status = normalizeStatus(request);
    const reason = getClearanceReason(request);
    const dateMatches = (!start || createdAt >= start) && (!end || createdAt <= end);
    return dateMatches
      && (!filters.department || department === filters.department)
      && (!filters.campus || campus === filters.campus)
      && (!filters.clearanceReason || reason === filters.clearanceReason)
      && (!filters.status || getOutstandingStatus(request, getEmployeeBalance(employeeBalances, request.employeeId, filters.debtType)) === filters.status
        || (filters.status !== 'Cleared' && status === filters.status))
      && (!filters.debtType || (employeeBalances.get(request.employeeId) || []).some(({ record }) => record.type === filters.debtType));
  });

  const latestRequestByEmployee = new Map();
  matchedRequests.forEach((request) => {
    const current = latestRequestByEmployee.get(request.employeeId);
    if (!current || new Date(request.createdAt || 0) > new Date(current.createdAt || 0)) {
      latestRequestByEmployee.set(request.employeeId, request);
    }
  });

  const rows = [];
  latestRequestByEmployee.forEach((request, employeeId) => {
    const employee = employeeMap.get(employeeId) || {};
    const obligations = (employeeBalances.get(employeeId) || [])
      .filter(({ record }) => !filters.debtType || record.type === filters.debtType);
    const ledgerRows = obligations.map(({ record, paidAmount, outstandingAmount, status }) => ({
      _id: `${request._id}-${record._id}`,
      requestId: request.requestId || request.requestNumber || String(request._id || ''),
      employeeId,
      employeeName: request.employeeName || employee.fullName || 'Unknown Employee',
      department: getDepartment(request.department) || employee.department || '',
      clearanceReason: getClearanceReason(request),
      debtType: record.type || 'Other',
      debt: Number(record.amount || 0),
      paid: paidAmount,
      balance: outstandingAmount,
      status: getOutstandingStatus(request, outstandingAmount),
      financeStatus: normalizeStatus(request),
      campus: request.campus || request.employee?.campus || employee.campus || '',
    }));

    if (ledgerRows.length) {
      rows.push(...ledgerRows);
      return;
    }

    const fallback = request.financialObligation || {};
    const debt = filters.debtType ? 0 : Number(fallback.amountDue || 0);
    const balance = filters.debtType ? 0 : Number(fallback.balance ?? debt);
    rows.push({
      _id: `${request._id}-financial-obligation`,
      requestId: request.requestId || request.requestNumber || String(request._id || ''),
      employeeId,
      employeeName: request.employeeName || employee.fullName || 'Unknown Employee',
      department: getDepartment(request.department) || employee.department || '',
      clearanceReason: getClearanceReason(request),
      debtType: fallback.type || '',
      debt,
      paid: Math.max(debt - balance, 0),
      balance,
      status: getOutstandingStatus(request, balance),
      financeStatus: normalizeStatus(request),
      campus: request.campus || request.employee?.campus || employee.campus || '',
    });
  });

  const totalsByEmployee = new Map();
  rows.forEach((row) => {
    const total = totalsByEmployee.get(row.employeeId) || { debt: 0, paid: 0, balance: 0 };
    total.debt += row.debt;
    total.paid += row.paid;
    total.balance += row.balance;
    totalsByEmployee.set(row.employeeId, total);
  });

  const summary = {
    totalRequests: matchedRequests.length,
    cleared: [...totalsByEmployee.entries()].filter(([employeeId, totals]) =>
      totals.balance <= 0
      && ['Approved', 'Completed'].includes(normalizeStatus(latestRequestByEmployee.get(employeeId)))
    ).length,
    outstanding: [...totalsByEmployee.values()].filter((totals) => totals.balance > 0).length,
    amountOwed: [...totalsByEmployee.values()].reduce((sum, totals) => sum + totals.balance, 0),
  };

  const clearanceStatus = { cleared: 0, pending: 0, underReview: 0, returned: 0, rejected: 0 };
  latestRequestByEmployee.forEach((request, employeeId) => {
    const status = getOutstandingStatus(
      request,
      getEmployeeBalance(employeeBalances, employeeId, filters.debtType)
    );
    if (status === 'Cleared') clearanceStatus.cleared += 1;
    else if (status === 'Outstanding') clearanceStatus.outstanding = (clearanceStatus.outstanding || 0) + 1;
    else if (status === 'Under Review') clearanceStatus.underReview += 1;
    else if (status === 'Returned') clearanceStatus.returned += 1;
    else if (status === 'Rejected') clearanceStatus.rejected += 1;
    else clearanceStatus.pending += 1;
  });

  const activePaymentIds = new Set(
    financialRecords
      .filter((record) => record.reversalOf)
      .map((record) => String(record.reversalOf))
  );
  const selectedEmployeeIds = new Set(latestRequestByEmployee.keys());
  const monthBuckets = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1));
    return {
      key: date.toISOString().slice(0, 7),
      month: date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
      recovered: 0,
    };
  });
  const monthMap = new Map(monthBuckets.map((month) => [month.key, month]));
  financialRecords.forEach((record) => {
    if (!isFinancialPayment(record) || record.isReversed || activePaymentIds.has(String(record._id))) return;
    if (!selectedEmployeeIds.has(record.employeeId)) return;
    if (filters.debtType) {
      const linkedDebt = financialRecords.find((candidate) => String(candidate._id) === String(record.paymentFor));
      if (linkedDebt?.type !== filters.debtType) return;
    }
    const date = record.paymentDate || record.createdAt;
    if (!date) return;
    const month = monthMap.get(new Date(date).toISOString().slice(0, 7));
    if (month) month.recovered += Number(record.amount || 0);
  });

  return {
    summary,
    clearanceStatus,
    monthlyRecovery: monthBuckets,
    rows: rows.sort((left, right) =>
      right.balance - left.balance || left.employeeName.localeCompare(right.employeeName)
    ),
    options: {
      departments: uniqueSorted(requests.map((request) =>
        getDepartment(request.department) || employeeMap.get(request.employeeId)?.department
      )),
      campuses: uniqueSorted(requests.map((request) =>
        request.campus || request.employee?.campus || employeeMap.get(request.employeeId)?.campus
      )),
      clearanceReasons: uniqueSorted(requests.map(getClearanceReason)),
      debtTypes: uniqueSorted(financialRecords.filter(recordIsDebt).map((record) => record.type)),
    },
    period: { ...range, label: filters.period },
  };
};

function getEmployeeBalance(employeeBalances, employeeId, debtType) {
  return (employeeBalances.get(employeeId) || [])
    .filter(({ record }) => !debtType || record.type === debtType)
    .reduce((total, obligation) => total + obligation.outstandingAmount, 0);
}

export const normalizeFinanceReportFilters = (rawFilters = {}) => {
  const allowedPeriods = new Set(['today', 'weekly', 'monthly', 'yearly', 'custom']);
  const status = String(rawFilters.status || '').trim();
  return {
    period: allowedPeriods.has(rawFilters.period) ? rawFilters.period : 'monthly',
    startDate: String(rawFilters.startDate || '').trim(),
    endDate: String(rawFilters.endDate || '').trim(),
    department: String(rawFilters.department || '').trim(),
    campus: String(rawFilters.campus || '').trim(),
    clearanceReason: String(rawFilters.clearanceReason || '').trim(),
    debtType: String(rawFilters.debtType || '').trim(),
    status: FINANCIAL_STATUSES.has(status) ? status : '',
  };
};

export const validateFinanceReportDateRange = (filters) => {
  if (filters.period !== 'custom') return '';
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(filters.startDate) || !datePattern.test(filters.endDate)) {
    return 'Choose both valid dates for the custom date range.';
  }
  const isCalendarDate = (value) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day;
  };
  if (!isCalendarDate(filters.startDate) || !isCalendarDate(filters.endDate)) {
    return 'Choose valid calendar dates for the custom date range.';
  }
  if (filters.startDate > filters.endDate) {
    return 'The start date must be on or before the end date.';
  }
  return '';
};
