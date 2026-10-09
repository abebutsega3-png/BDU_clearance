import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateFinancialOutstanding,
  calculateFinancialRecordBalances,
} from '../utils/financialRecordBalance.js';

test('applies a record-linked payment only to its selected obligation', () => {
  const firstLoan = {
    _id: 'loan-1',
    type: 'Loan',
    amount: 5000,
    paidAmount: 0,
    issueDate: '2026-10-01',
  };
  const secondLoan = {
    _id: 'loan-2',
    type: 'Loan',
    amount: 3000,
    paidAmount: 0,
    issueDate: '2026-10-02',
  };
  const payment = {
    _id: 'payment-1',
    type: 'Payment / Repayment',
    amount: 2000,
    paidAmount: 2000,
    paymentFor: 'loan-2',
  };
  const records = [firstLoan, secondLoan, payment];
  const balances = calculateFinancialRecordBalances(records);

  assert.equal(balances.get(firstLoan).outstandingAmount, 5000);
  assert.equal(balances.get(secondLoan).outstandingAmount, 1000);
  assert.equal(balances.get(secondLoan).paidAmount, 2000);
  assert.equal(calculateFinancialOutstanding(records), 6000);
});

test('reversing a record-linked payment restores only that obligation balance', () => {
  const loan = {
    _id: 'loan-1',
    type: 'Loan',
    amount: 5000,
    paidAmount: 0,
  };
  const payment = {
    _id: 'payment-1',
    type: 'Payment / Repayment',
    amount: 2000,
    paidAmount: 2000,
    paymentFor: 'loan-1',
  };
  const reversal = {
    _id: 'reversal-1',
    type: 'Payment Reversal',
    amount: 2000,
    reversalOf: 'payment-1',
    paymentFor: 'loan-1',
  };
  const records = [loan, payment, reversal];
  const balances = calculateFinancialRecordBalances(records);

  assert.equal(balances.get(loan).outstandingAmount, 5000);
  assert.equal(balances.get(loan).paidAmount, 0);
  assert.equal(calculateFinancialOutstanding(records), 5000);
});

test('continues applying legacy unlinked repayments in FIFO order', () => {
  const firstLoan = {
    _id: 'loan-1',
    type: 'Loan',
    amount: 5000,
    paidAmount: 0,
    issueDate: '2026-10-01',
  };
  const secondLoan = {
    _id: 'loan-2',
    type: 'Loan',
    amount: 3000,
    paidAmount: 0,
    issueDate: '2026-10-02',
  };
  const legacyPayment = {
    _id: 'payment-1',
    type: 'Payment / Repayment',
    amount: 2000,
    paidAmount: 2000,
  };
  const balances = calculateFinancialRecordBalances([firstLoan, secondLoan, legacyPayment]);

  assert.equal(balances.get(firstLoan).outstandingAmount, 3000);
  assert.equal(balances.get(secondLoan).outstandingAmount, 3000);
});
