import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFinanceReportData,
  normalizeFinanceReportFilters,
  validateFinanceReportDateRange,
} from '../utils/financeReportData.js';

const reportInputs = (paymentAmount, status = 'Pending') => ({
  requests: [{
    _id: 'request-1',
    requestId: 'CLR-001',
    employeeId: 'BDU-001',
    employeeName: 'Aster Tesfaye',
    department: 'Computer Science',
    campus: 'Main Campus',
    clearanceType: 'Resignation',
    financeStatus: status,
    createdAt: new Date('2026-10-08T10:00:00.000Z'),
  }],
  financialRecords: [
    {
      _id: 'debt-1',
      employeeId: 'BDU-001',
      type: 'Loan',
      amount: 5000,
      paidAmount: 0,
      issueDate: new Date('2026-10-01T00:00:00.000Z'),
    },
    {
      _id: 'payment-1',
      employeeId: 'BDU-001',
      type: 'Payment / Repayment',
      amount: paymentAmount,
      paidAmount: paymentAmount,
      paymentFor: 'debt-1',
      paymentDate: new Date('2026-10-08T00:00:00.000Z'),
      paymentMethod: 'Bank Transfer',
    },
  ],
  employees: [{
    employeeId: 'BDU-001',
    fullName: 'Aster Tesfaye',
    department: 'Computer Science',
    campus: 'Main Campus',
  }],
  filters: normalizeFinanceReportFilters({
    period: 'monthly',
    department: 'Computer Science',
    campus: 'Main Campus',
    clearanceReason: 'Resignation',
  }),
  now: new Date('2026-10-08T12:00:00.000Z'),
});

test('builds report totals from financial ledger payments and current balances', () => {
  const report = buildFinanceReportData(reportInputs(2000));

  assert.deepEqual(report.summary, {
    totalRequests: 1,
    cleared: 0,
    outstanding: 1,
    amountOwed: 3000,
  });
  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0].requestId, 'CLR-001');
  assert.equal(report.rows[0].debt, 5000);
  assert.equal(report.rows[0].paid, 2000);
  assert.equal(report.rows[0].balance, 3000);
  assert.equal(report.rows[0].status, 'Outstanding');
  assert.equal(report.monthlyRecovery.find((month) => month.key === '2026-10').recovered, 2000);
});

test('counts a finance-approved employee as cleared only after the debt is paid', () => {
  const report = buildFinanceReportData(reportInputs(5000, 'Approved'));

  assert.equal(report.summary.cleared, 1);
  assert.equal(report.summary.outstanding, 0);
  assert.equal(report.summary.amountOwed, 0);
  assert.equal(report.rows[0].status, 'Cleared');
  assert.equal(report.clearanceStatus.cleared, 1);
});

test('filters detailed rows and balances by debt type', () => {
  const input = reportInputs(2000);
  input.financialRecords.push({
    _id: 'advance-1',
    employeeId: 'BDU-001',
    type: 'Salary Advance',
    amount: 1000,
    paidAmount: 0,
    issueDate: new Date('2026-10-02T00:00:00.000Z'),
  });
  input.filters.debtType = 'Loan';

  const report = buildFinanceReportData(input);

  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0].debtType, 'Loan');
  assert.equal(report.summary.amountOwed, 3000);
});

test('excludes reversed payments from monthly debt recovery', () => {
  const input = reportInputs(2000);
  input.financialRecords[1].isReversed = true;
  input.financialRecords.push({
    _id: 'reversal-1',
    employeeId: 'BDU-001',
    type: 'Payment Reversal',
    amount: 2000,
    reversalOf: 'payment-1',
    paymentDate: new Date('2026-10-09T00:00:00.000Z'),
  });

  const report = buildFinanceReportData(input);

  assert.equal(report.summary.amountOwed, 5000);
  assert.equal(report.monthlyRecovery.find((month) => month.key === '2026-10').recovered, 0);
});

test('requires valid and ordered dates for a custom report period', () => {
  const filters = normalizeFinanceReportFilters({
    period: 'custom',
    startDate: '2026-10-09',
    endDate: '2026-10-08',
  });
  assert.equal(validateFinanceReportDateRange(filters), 'The start date must be on or before the end date.');
  assert.match(validateFinanceReportDateRange(normalizeFinanceReportFilters({
    period: 'custom',
    startDate: '2026-02-30',
    endDate: '2026-03-01',
  })), /valid calendar dates/);
});
