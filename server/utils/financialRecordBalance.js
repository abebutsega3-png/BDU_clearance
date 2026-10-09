const PAYMENT_TYPES = new Set(['Payment / Repayment', 'Payment', 'Repayment']);

export const isFinancialPayment = (record) => PAYMENT_TYPES.has(record.type);
export const isFinancialReversal = (record) => record.type === 'Payment Reversal' || Boolean(record.reversalOf);

export const isFinancialCredit = (record) =>
  (isFinancialPayment(record) && !record.isReversed)
  || (record.type === 'Adjustment' && record.adjustmentDirection === 'Reduce');

export const getFinancialRecordPaidAmount = (record) => {
  if (record.isReversed || isFinancialReversal(record)) return 0;
  if (isFinancialCredit(record)) return Number(record.amount || 0);
  if (record.paidAmount !== undefined) return Number(record.paidAmount || 0);
  return record.status === 'Paid' || record.status === 'Cleared'
    ? Number(record.amount || 0)
    : 0;
};

export const calculateFinancialRecordBalances = (records) => {
  const reversedPaymentIds = new Set(
    records.filter((record) => record.reversalOf).map((record) => String(record.reversalOf))
  );
  const isReversedPayment = (record) =>
    isFinancialPayment(record) && reversedPaymentIds.has(String(record._id));
  const activePayments = records.filter((record) =>
    isFinancialPayment(record) && !isReversedPayment(record) && !record.isReversed
  );
  const linkedPaymentsByRecord = new Map();
  activePayments.filter((record) => record.paymentFor).forEach((payment) => {
    const targetId = String(payment.paymentFor);
    linkedPaymentsByRecord.set(
      targetId,
      (linkedPaymentsByRecord.get(targetId) || 0) + Number(payment.amount || 0)
    );
  });
  let unappliedPayments = [
    ...activePayments.filter((record) => !record.paymentFor),
    ...records.filter((record) => record.type === 'Adjustment' && record.adjustmentDirection === 'Reduce'),
  ]
    .reduce((total, record) => total + Number(record.amount || 0), 0);
  const balances = new Map();
  const liabilities = records
    .filter((record) => !isFinancialCredit(record) && !isFinancialReversal(record) && !isReversedPayment(record))
    .sort((left, right) => {
      const leftDate = new Date(left.issueDate || left.createdAt || 0).getTime();
      const rightDate = new Date(right.issueDate || right.createdAt || 0).getTime();
      return leftDate - rightDate;
    });

  records.filter((record) => isFinancialCredit(record) || isFinancialReversal(record) || isReversedPayment(record)).forEach((record) => {
    const amount = Number(record.amount || 0);
    balances.set(record, {
      paidAmount: isFinancialReversal(record) || isReversedPayment(record) ? 0 : amount,
      outstandingAmount: 0,
      status: isFinancialReversal(record) || isReversedPayment(record) ? 'Reversed' : 'Paid',
    });
  });

  liabilities.forEach((record) => {
    const amount = Number(record.amount || 0);
    const originalPaidAmount = Math.min(getFinancialRecordPaidAmount(record), amount);
    const linkedPaymentAmount = linkedPaymentsByRecord.get(String(record._id)) || 0;
    const targetedPaidAmount = Math.min(
      linkedPaymentAmount,
      Math.max(amount - originalPaidAmount, 0)
    );
    const paymentApplied = Math.min(
      unappliedPayments,
      Math.max(amount - originalPaidAmount - targetedPaidAmount, 0)
    );
    unappliedPayments -= paymentApplied;
    const paidAmount = originalPaidAmount + targetedPaidAmount + paymentApplied;
    const outstandingAmount = Math.max(amount - paidAmount, 0);

    balances.set(record, {
      paidAmount,
      outstandingAmount,
      status: paidAmount === 0
        ? 'Outstanding'
        : outstandingAmount === 0
          ? 'Paid'
          : 'Partially Paid',
    });
  });

  return balances;
};

export const calculateFinancialOutstanding = (records) => {
  const reversedPaymentIds = new Set(
    records.filter((record) => record.reversalOf).map((record) => String(record.reversalOf))
  );
  return Math.max(records.reduce((balance, record) => {
    const amount = Number(record.amount || 0);
    if (isFinancialReversal(record)) return balance;
    if (isFinancialPayment(record)) {
      return record.isReversed || reversedPaymentIds.has(String(record._id)) ? balance : balance - amount;
    }
    return isFinancialCredit(record) ? balance - amount : balance + amount - getFinancialRecordPaidAmount(record);
  }, 0), 0);
};
