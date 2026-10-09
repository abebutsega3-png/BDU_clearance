import ClearanceRequest from "../models/clearance.js";
import Employee from "../models/employee.js";
import FinancialRecord from "../models/financedashboared.js";
import Notification from "../models/Notification.js";
import AuditLog from "../models/AuditLog.js";
import { recordAuditLog } from './auditLogger.js';
import {
  calculateFinancialRecordBalances,
  calculateFinancialOutstanding,
  getFinancialRecordPaidAmount,
  isFinancialCredit,
  isFinancialPayment,
  isFinancialReversal,
} from "../utils/financialRecordBalance.js";

const isValidDateOnly = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

const normalizeFinanceStatus = (value) => {
  const status = (value || '').toString().trim();
  if (!status) return 'Pending';
  const lower = status.toLowerCase();
  if (lower === 'in progress' || lower === 'under review' || lower === 'review') return 'In Progress';
  return status;
};

export const getFinanceDashboard = async (req, res) => {
  try {
    const financeQueueFilter = {
      departmentStatus: 'Approved',
      ...officeAssignmentFilter('Finance Office'),
    };
    const [
      pending,
      inProgress,
      approved,
      returned,
      outstandingRecords,
      pendingRequests,
      notifications,
      activities
    ] = await Promise.all([
      ClearanceRequest.countDocuments({
        $and: [financeQueueFilter, {
          $or: [
          { financeStatus: 'Pending' },
          { financeStatus: { $exists: false } },
          { financeStatus: null },
          { financeStatus: '' },
          ],
        }],
      }),
      ClearanceRequest.countDocuments({ ...financeQueueFilter, financeStatus: { $in: ['In Progress', 'Under Review'] } }),
      ClearanceRequest.countDocuments({ ...financeQueueFilter, financeStatus: 'Approved' }),
      ClearanceRequest.countDocuments({ ...financeQueueFilter, financeStatus: 'Returned' }),
      FinancialRecord.find({}).sort({ createdAt: -1 }).lean(),
      ClearanceRequest.find({
        $and: [financeQueueFilter, {
          $or: [
          { financeStatus: { $in: ['Pending', 'In Progress', 'Under Review'] } },
          { financeStatus: { $exists: false } },
          { financeStatus: null },
          { financeStatus: '' },
          ],
        }],
      }).sort({ createdAt: -1 }).limit(10).lean(),
      Notification.find({}).sort({ createdAt: -1 }).limit(5).lean(),
      AuditLog.find({
        $or: [
          { module: 'Finance' },
          { module: 'Finance Clearance' },
          { actorRole: { $regex: 'finance', $options: 'i' } }
        ]
      }).sort({ createdAt: -1 }).limit(5).lean()
    ]);

    const employeeIds = [
      ...new Set([
        ...pendingRequests.map((item) => item.employeeId).filter(Boolean),
        ...outstandingRecords.map((item) => item.employeeId).filter(Boolean)
      ])
    ];

    const employees = employeeIds.length
      ? await Employee.find({ employeeId: { $in: employeeIds } }).lean()
      : [];

    const employeeMap = {};
    employees.forEach((employee) => {
      employeeMap[employee.employeeId] = employee;
    });

    const requestsWithEmployee = pendingRequests.map((request) => {
      const employee = employeeMap[request.employeeId] || {};
      return {
        ...request,
        employeeName: employee.fullName || request.employeeName || 'Unknown Employee',
        department: employee.department || request.department || 'N/A',
        position: employee.position || request.position || 'N/A',
        date: request.requestDate || request.submittedDate || request.createdAt,
        status: normalizeFinanceStatus(request.financeStatus)
      };
    });

    const outstandingByEmployee = new Map();
    outstandingRecords.forEach((record) => {
      if (!record.employeeId) return;
      const employeeRecords = outstandingByEmployee.get(record.employeeId) || [];
      employeeRecords.push(record);
      outstandingByEmployee.set(record.employeeId, employeeRecords);
    });
    const obligationsWithEmployee = [...outstandingByEmployee.entries()]
      .map(([employeeId, records]) => {
        const outstandingAmount = calculateFinancialOutstanding(records);
        const employee = employeeMap[employeeId] || {};
        return {
          employeeId,
          employeeName: employee.fullName || 'Unknown Employee',
          name: employee.fullName || 'Unknown Employee',
          item: 'Net outstanding financial obligations',
          amount: `${outstandingAmount.toLocaleString()} ETB`,
          status: outstandingAmount > 0 ? 'Outstanding' : 'Cleared',
        };
      })
      .filter((record) => record.status === 'Outstanding')
      .slice(0, 10);
    const outstandingAmount = [...outstandingByEmployee.values()]
      .reduce((total, records) => total + calculateFinancialOutstanding(records), 0);

    res.status(200).json({
      success: true,
      summary: {
        pending,
        inProgress,
        approved,
        returned,
        outstandingAmount,
        totalRequests: pending + inProgress + approved + returned
      },
      pendingRequests: requestsWithEmployee,
      outstandingObligations: obligationsWithEmployee,
      notifications,
      activities
    });
  } catch (error) {
    console.error('Finance dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load finance dashboard',
      error: error.message
    });
  }
};

export const createFinancialRecord = async (req, res) => {
  try {
    const {
      employeeId,
      type,
      adjustmentDirection,
      amount,
      paidAmount = 0,
      description,
      notes,
      issueDate,
      dueDate,
    } = req.body || {};
    const normalizedEmployeeId = String(employeeId || '').trim();
    if (!normalizedEmployeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required.' });
    }

    const validTypes = [
      'Advance',
      'Loan',
      'Overpayment',
      'Other',
      'Salary Advance',
      'Other Financial Obligation',
      'Payment / Repayment',
      'Adjustment',
    ];
    const normalizedType = String(type || 'Other').trim();
    if (!validTypes.includes(normalizedType)) {
      return res.status(400).json({ success: false, message: 'Invalid financial record type.' });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than zero.' });
    }

    if (normalizedType === 'Adjustment' && !['Increase', 'Reduce'].includes(adjustmentDirection)) {
      return res.status(400).json({ success: false, message: 'Adjustment direction must be Increase or Reduce.' });
    }

    const creditRecord = isFinancialCredit({ type: normalizedType, adjustmentDirection });
    const numericPaidAmount = creditRecord ? numericAmount : Number(paidAmount);
    if (!Number.isFinite(numericPaidAmount) || numericPaidAmount < 0 || numericPaidAmount > numericAmount) {
      return res.status(400).json({ success: false, message: 'Paid amount must be between zero and the total amount.' });
    }

    const expectedStatus = numericPaidAmount === 0
      ? 'Outstanding'
      : numericPaidAmount === numericAmount
        ? 'Paid'
        : 'Partially Paid';
    const normalizedStatus = expectedStatus;

    if (!issueDate) {
      return res.status(400).json({ success: false, message: 'Issue Date is required.' });
    }
    if (!isValidDateOnly(issueDate)) {
      return res.status(400).json({ success: false, message: 'Issue Date must be a valid date.' });
    }
    if (issueDate > new Date().toISOString().slice(0, 10)) {
      return res.status(400).json({ success: false, message: 'Issue Date cannot be in the future.' });
    }
    if (!dueDate) {
      return res.status(400).json({ success: false, message: 'Due Date is required.' });
    }
    if (!isValidDateOnly(dueDate)) {
      return res.status(400).json({ success: false, message: 'Due Date must be a valid date.' });
    }
    if (dueDate <= issueDate) {
      return res.status(400).json({ success: false, message: 'Due Date must be after Issue Date.' });
    }
    if (dueDate <= new Date().toISOString().slice(0, 10)) {
      return res.status(400).json({ success: false, message: 'Due Date must be after today.' });
    }
    if (typeof description !== 'string' || !description.trim() || description.trim().length > 500) {
      return res.status(400).json({ success: false, message: 'Description is required and must be 500 characters or fewer.' });
    }
    if (notes !== undefined && (typeof notes !== 'string' || notes.length > 500)) {
      return res.status(400).json({ success: false, message: 'Notes must be 500 characters or fewer.' });
    }

    const employee = await Employee.findOne({ employeeId: normalizedEmployeeId }).lean();
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const record = await FinancialRecord.create({
      employeeId: normalizedEmployeeId,
      type: normalizedType,
      ...(normalizedType === 'Adjustment' ? { adjustmentDirection } : {}),
      amount: numericAmount,
      paidAmount: numericPaidAmount,
      status: normalizedStatus,
      description: description.trim(),
      notes: notes ? notes.trim() : '',
      issueDate: new Date(`${issueDate}T00:00:00.000Z`),
      dueDate: new Date(`${dueDate}T00:00:00.000Z`),
      paymentDate: numericPaidAmount > 0 ? new Date() : undefined,
    });

    res.status(201).json({
      success: true,
      message: 'Financial record added successfully.',
      record: {
        ...record.toObject(),
        employeeName: employee?.fullName || 'Unknown Employee',
        department: employee?.department || 'N/A',
        employeeType: employee?.employmentType || employee?.employeeType || 'N/A',
      },
    });
  } catch (error) {
    console.error('Create financial record error:', error);
    res.status(500).json({ success: false, message: 'Failed to add financial record.', error: error.message });
  }
};

export const createFinancialPayment = async (req, res) => {
  try {
    const employeeId = String(req.body?.employeeId || '').trim();
    const amount = Number(req.body?.amount);
    const { financialRecordId, paymentDate, paymentMethod, paymentReference, notes } = req.body || {};
    const validPaymentMethods = ['Cash', 'Bank Transfer', 'Other'];

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required.' });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero.' });
    }
    if (!paymentDate || !isValidDateOnly(paymentDate)) {
      return res.status(400).json({ success: false, message: 'A valid payment date is required.' });
    }
    if (paymentDate > new Date().toISOString().slice(0, 10)) {
      return res.status(400).json({ success: false, message: 'Payment date cannot be in the future.' });
    }
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Select a valid payment method.' });
    }
    if (typeof paymentReference !== 'string' || !paymentReference.trim() || paymentReference.trim().length > 100) {
      return res.status(400).json({ success: false, message: 'Payment reference is required and must be 100 characters or fewer.' });
    }
    if (notes !== undefined && (typeof notes !== 'string' || notes.length > 500)) {
      return res.status(400).json({ success: false, message: 'Notes must be 500 characters or fewer.' });
    }

    const employee = await Employee.findOne({ employeeId }).lean();
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const existingRecords = await FinancialRecord.find({ employeeId }).lean();
    const outstandingAmount = calculateFinancialOutstanding(existingRecords);
    let paymentFor = null;
    let payableAmount = outstandingAmount;
    if (financialRecordId) {
      paymentFor = existingRecords.find((record) => String(record._id) === String(financialRecordId));
      if (!paymentFor || isFinancialCredit(paymentFor) || isFinancialReversal(paymentFor)) {
        return res.status(404).json({ success: false, message: 'The selected financial obligation was not found for this employee.' });
      }
      payableAmount = calculateFinancialRecordBalances(existingRecords).get(paymentFor)?.outstandingAmount || 0;
    }
    if (payableAmount <= 0) {
      return res.status(409).json({ success: false, message: 'This financial record has no outstanding balance.' });
    }
    if (amount > payableAmount) {
      return res.status(409).json({
        success: false,
        message: `Payment cannot exceed the outstanding balance of ${payableAmount.toLocaleString()} ETB.`,
        outstandingAmount: payableAmount,
      });
    }

    const recordedBy = req.user?.fullName || req.user?.name || 'Finance Officer';
    const parsedPaymentDate = new Date(`${paymentDate}T00:00:00.000Z`);
    const record = await FinancialRecord.create({
      employeeId,
      type: 'Payment / Repayment',
      amount,
      paidAmount: amount,
      status: 'Paid',
      description: `Payment ${paymentReference.trim()}`,
      notes: notes?.trim() || '',
      issueDate: parsedPaymentDate,
      paymentDate: parsedPaymentDate,
      paymentFor: paymentFor?._id || null,
      paymentMethod,
      paymentReference: paymentReference.trim(),
      recordedBy,
    });

    await recordAuditLog({
      req,
      action: 'CREATE_FINANCIAL_PAYMENT',
      module: 'Finance',
      description: `Recorded ${amount.toLocaleString()} ETB payment ${paymentReference.trim()} for employee ${employeeId}.`,
      newValues: {
        recordId: record._id,
        employeeId,
        amount,
        financialRecordId: paymentFor?._id || null,
        paymentDate: parsedPaymentDate,
        paymentMethod,
        paymentReference: paymentReference.trim(),
        recordedBy,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully.',
      record: {
        ...record.toObject(),
        employeeName: employee.fullName,
        department: employee.department,
        position: employee.position,
      },
      outstandingAmount: calculateFinancialOutstanding([...existingRecords, record.toObject()]),
      recordOutstandingAmount: paymentFor
        ? calculateFinancialRecordBalances([...existingRecords, record.toObject()]).get(paymentFor)?.outstandingAmount || 0
        : undefined,
    });
  } catch (error) {
    console.error('Create financial payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to record payment.', error: error.message });
  }
};

export const updateFinancialRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await FinancialRecord.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Financial record not found.' });
    }
    if (isFinancialCredit(record) || record.reversalOf) {
      return res.status(400).json({ success: false, message: 'Payments and reversals cannot be edited. Record an audited reversal instead.' });
    }

    const { type, adjustmentDirection, amount, issueDate, dueDate, description, notes } = req.body || {};
    const validTypes = [
      'Advance',
      'Loan',
      'Overpayment',
      'Other',
      'Salary Advance',
      'Other Financial Obligation',
      'Adjustment',
    ];
    const normalizedType = String(type || '').trim();
    const numericAmount = Number(amount);
    if (!validTypes.includes(normalizedType)) {
      return res.status(400).json({ success: false, message: 'Invalid financial record type.' });
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than zero.' });
    }
    if (normalizedType === 'Adjustment' && !['Increase', 'Reduce'].includes(adjustmentDirection)) {
      return res.status(400).json({ success: false, message: 'Adjustment direction must be Increase or Reduce.' });
    }
    if (normalizedType === 'Adjustment' && adjustmentDirection === 'Reduce') {
      return res.status(400).json({ success: false, message: 'Balance-reducing adjustments cannot be edited as obligations.' });
    }
    if (!isValidDateOnly(issueDate) || issueDate > new Date().toISOString().slice(0, 10)) {
      return res.status(400).json({ success: false, message: 'Issue Date must be valid and cannot be in the future.' });
    }
    if (!isValidDateOnly(dueDate) || dueDate <= issueDate) {
      return res.status(400).json({ success: false, message: 'Due Date must be after Issue Date.' });
    }
    if (typeof description !== 'string' || !description.trim() || description.trim().length > 500) {
      return res.status(400).json({ success: false, message: 'Description is required and must be 500 characters or fewer.' });
    }
    if (notes !== undefined && (typeof notes !== 'string' || notes.length > 500)) {
      return res.status(400).json({ success: false, message: 'Notes must be 500 characters or fewer.' });
    }

    const oldValues = {
      type: record.type,
      adjustmentDirection: record.adjustmentDirection,
      amount: record.amount,
      issueDate: record.issueDate,
      dueDate: record.dueDate,
      description: record.description,
      notes: record.notes,
    };
    const employeeRecords = await FinancialRecord.find({ employeeId: record.employeeId }).lean();
    const paidAmountFromLedger = calculateFinancialRecordBalances(employeeRecords).get(
      employeeRecords.find((item) => String(item._id) === String(record._id))
    )?.paidAmount || 0;
    const storedPaidAmount = getFinancialRecordPaidAmount(record);
    const existingPaidAmount = Math.max(storedPaidAmount, paidAmountFromLedger);
    if (numericAmount < existingPaidAmount) {
      return res.status(400).json({
        success: false,
        message: `Amount cannot be less than the already-paid amount of ${existingPaidAmount.toLocaleString()} ETB.`,
      });
    }

    record.type = normalizedType;
    record.adjustmentDirection = normalizedType === 'Adjustment' ? adjustmentDirection : undefined;
    record.amount = numericAmount;
    record.paidAmount = storedPaidAmount;
    record.status = existingPaidAmount <= 0
      ? 'Outstanding'
      : existingPaidAmount >= numericAmount
        ? 'Paid'
        : 'Partially Paid';
    record.issueDate = new Date(`${issueDate}T00:00:00.000Z`);
    record.dueDate = new Date(`${dueDate}T00:00:00.000Z`);
    record.description = description.trim();
    record.notes = notes?.trim() || '';
    await record.save();

    await recordAuditLog({
      req,
      action: 'UPDATE_FINANCIAL_RECORD',
      module: 'Finance',
      description: `Updated financial record ${record._id} for employee ${record.employeeId}.`,
      oldValues,
      newValues: {
        type: record.type,
        adjustmentDirection: record.adjustmentDirection,
        amount: record.amount,
        issueDate: record.issueDate,
        dueDate: record.dueDate,
        description: record.description,
        notes: record.notes,
      },
    });

    res.status(200).json({ success: true, message: 'Financial record updated successfully.', record });
  } catch (error) {
    console.error('Update financial record error:', error);
    res.status(500).json({ success: false, message: 'Failed to update financial record.', error: error.message });
  }
};

export const reverseFinancialPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const reason = String(req.body?.reason || '').trim();
    if (!reason || reason.length > 500) {
      return res.status(400).json({ success: false, message: 'A reversal reason of 500 characters or fewer is required.' });
    }

    const payment = await FinancialRecord.findById(id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }
    if (!isFinancialPayment(payment) || payment.reversalOf) {
      return res.status(400).json({ success: false, message: 'Only unreversed payment records can be reversed.' });
    }

    const existingReversal = await FinancialRecord.findOne({ reversalOf: payment._id }).lean();
    if (existingReversal) {
      return res.status(409).json({ success: false, message: 'This payment has already been reversed.' });
    }

    const recordedBy = req.user?.fullName || req.user?.name || 'Finance Officer';
    const reversal = await FinancialRecord.create({
      employeeId: payment.employeeId,
      type: 'Payment Reversal',
      amount: payment.amount,
      paidAmount: 0,
      status: 'Cleared',
      description: `Reversal of payment ${payment.paymentReference || payment._id}`,
      notes: reason,
      issueDate: new Date(),
      paymentFor: payment.paymentFor || null,
      paymentMethod: payment.paymentMethod,
      paymentReference: payment.paymentReference,
      recordedBy,
      reversalOf: payment._id,
    });

    await recordAuditLog({
      req,
      action: 'REVERSE_FINANCIAL_PAYMENT',
      module: 'Finance',
      description: `Reversed payment ${payment.paymentReference || payment._id} for employee ${payment.employeeId}.`,
      oldValues: {
        paymentId: payment._id,
        amount: payment.amount,
        paymentReference: payment.paymentReference,
        reversed: false,
      },
      newValues: {
        reversalId: reversal._id,
        amount: reversal.amount,
        reason,
        recordedBy,
        reversed: true,
      },
    });

    res.status(201).json({ success: true, message: 'Payment reversed. The original payment remains in the audit trail.', record: reversal });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.reversalOf) {
      return res.status(409).json({ success: false, message: 'This payment has already been reversed.' });
    }
    console.error('Reverse financial payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to reverse payment.', error: error.message });
  }
};

export const getFinancialRecords = async (req, res) => {
  try {
    const {
      search = '',
      department = 'All',
      employeeType = 'All',
      status = 'All',
      startDate,
      endDate,
      employeeId,
    } = req.query;

    const storedRecords = await FinancialRecord.find(employeeId ? { employeeId } : {})
      .sort({ createdAt: -1 })
      .lean();
    const paymentIds = storedRecords
      .filter((record) => isFinancialCredit(record) && record.type === 'Payment / Repayment')
      .map((record) => record._id);
    const reversals = paymentIds.length
      ? await FinancialRecord.find({ reversalOf: { $in: paymentIds } }).select('reversalOf').lean()
      : [];
    const reversedPaymentIds = new Set(reversals.map((record) => String(record.reversalOf)));
    const records = storedRecords.map((record) => ({
      ...record,
      isReversed: reversedPaymentIds.has(String(record._id)),
    }));
    const employeeIds = records.map((record) => record.employeeId).filter(Boolean);
    const employees = employeeIds.length
      ? await Employee.find({ employeeId: { $in: employeeIds } }).lean()
      : [];
    const employeeMap = new Map(employees.map((employee) => [employee.employeeId, employee]));

    const filteredRecords = records.map((record) => {
      const employee = employeeMap.get(record.employeeId) || {};
      const employeeName = employee.fullName || record.employeeName || 'Unknown Employee';
      const employeeDepartment = employee.department || record.department || 'N/A';
      const employeeTypeValue = employee.employmentType || employee.employeeType || record.employeeType || 'N/A';
      const isCredit = isFinancialCredit(record);
      const isReversedEntry = isFinancialReversal(record) || (isFinancialPayment(record) && record.isReversed);
      const recordAmount = Number(record.amount || 0);
      const recordPaidAmount = getFinancialRecordPaidAmount(record);
      return {
        ...record,
        employeeName,
        department: employeeDepartment,
        position: employee.position || record.position || 'N/A',
        employeeType: employeeTypeValue,
        totalDue: isCredit || isReversedEntry ? 0 : recordAmount,
        paidAmount: isCredit ? recordAmount : isReversedEntry ? 0 : recordPaidAmount,
        outstandingBalance: isCredit || isReversedEntry ? 0 : Math.max(recordAmount - recordPaidAmount, 0),
        loanAmount: !isCredit && !isReversedEntry && ['Loan', 'Advance', 'Salary Advance'].includes(record.type)
          ? recordAmount
          : 0,
        paymentAmount: isReversedEntry ? 0 : recordPaidAmount,
      };
    });

    const scopedRecords = filteredRecords.filter((record) => {
      const haystack = `${record.employeeName} ${record.employeeId} ${record.department}`.toLowerCase();
      return (!search || haystack.includes(search.toLowerCase()))
        && (!employeeId || record.employeeId === employeeId)
        && (department === 'All' || record.department === department)
        && (employeeType === 'All' || record.employeeType === employeeType);
    });

    const visibleRecords = scopedRecords.filter((record) => {
      const recordDate = record.issueDate || record.createdAt;
      const dateMatches = (!startDate || new Date(recordDate) >= new Date(`${startDate}T00:00:00.000Z`))
        && (!endDate || new Date(recordDate) <= new Date(`${endDate}T23:59:59.999Z`));
      return (status === 'All' || record.status === status) && dateMatches;
    });

    const summary = scopedRecords.reduce((result, record) => {
      result.totalEmployees.add(record.employeeId);
      result.totalLoans += record.loanAmount;
      result.totalPayments += record.paymentAmount;
      return result;
    }, { totalEmployees: new Set(), totalOutstanding: 0, totalLoans: 0, totalPayments: 0 });
    const employeeRecords = new Map();
    scopedRecords.forEach((record) => {
      const employeeRecordsForId = employeeRecords.get(record.employeeId) || [];
      employeeRecordsForId.push(record);
      employeeRecords.set(record.employeeId, employeeRecordsForId);
    });
    employeeRecords.forEach((employeeRecordList) => {
      const balances = calculateFinancialRecordBalances(employeeRecordList);
      const netOutstanding = calculateFinancialOutstanding(employeeRecordList);
      employeeRecordList.forEach((record) => {
        const balance = balances.get(record);
        record.paidAmount = balance.paidAmount;
        record.outstandingBalance = balance.outstandingAmount;
        record.employeeOutstanding = netOutstanding;
        record.status = balance.status;
      });
    });
    summary.totalOutstanding = [...employeeRecords.values()]
      .reduce(
        (total, employeeRecordList) => total + employeeRecordList.reduce(
          (employeeTotal, record) => employeeTotal + record.outstandingBalance,
          0
        ),
        0
      );

    res.status(200).json({
      success: true,
      summary: {
        totalEmployees: summary.totalEmployees.size,
        totalOutstanding: summary.totalOutstanding,
        totalLoans: summary.totalLoans,
        totalPayments: summary.totalPayments,
      },
      records: visibleRecords,
      departments: [...new Set(scopedRecords.map((record) => record.department).filter(Boolean))],
      employeeTypes: [...new Set(scopedRecords.map((record) => record.employeeType).filter(Boolean))],
    });
  } catch (error) {
    console.error('Financial records error:', error);
    res.status(500).json({ success: false, message: 'Failed to load financial records', error: error.message });
  }
};