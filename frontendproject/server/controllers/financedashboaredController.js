import ClearanceRequest from "../models/clearance.js";
import Employee from "../models/employee.js";
import FinancialRecord from "../models/financedashboared.js";
import Notification from "../models/Notification.js";
import AuditLog from "../models/AuditLog.js";

const normalizeFinanceStatus = (value) => {
  const status = (value || '').toString().trim();
  if (!status) return 'Pending';
  const lower = status.toLowerCase();
  if (lower === 'in progress' || lower === 'under review' || lower === 'review') return 'In Progress';
  return status;
};

export const getFinanceDashboard = async (req, res) => {
  try {
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
        departmentStatus: 'Approved',
        $or: [
          { financeStatus: 'Pending' },
          { financeStatus: { $exists: false } },
          { financeStatus: null },
          { financeStatus: '' }
        ]
      }),
      ClearanceRequest.countDocuments({ departmentStatus: 'Approved', financeStatus: { $in: ['In Progress', 'Under Review'] } }),
      ClearanceRequest.countDocuments({ departmentStatus: 'Approved', financeStatus: 'Approved' }),
      ClearanceRequest.countDocuments({ departmentStatus: 'Approved', financeStatus: 'Returned' }),
      FinancialRecord.find({ status: 'Outstanding' }).sort({ createdAt: -1 }).limit(10).lean(),
      ClearanceRequest.find({
        departmentStatus: 'Approved',
        $or: [
          { financeStatus: { $in: ['Pending', 'In Progress', 'Under Review'] } },
          { financeStatus: { $exists: false } },
          { financeStatus: null },
          { financeStatus: '' }
        ]
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

    const outstandingAmountResult = await FinancialRecord.aggregate([
      { $match: { status: 'Outstanding' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
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

    const obligationsWithEmployee = outstandingRecords.map((record) => {
      const employee = employeeMap[record.employeeId] || {};
      return {
        ...record,
        employeeName: employee.fullName || 'Unknown Employee',
        name: employee.fullName || 'Unknown Employee',
        item: record.description || 'Outstanding financial obligation',
        amount: record.amount ? `${Number(record.amount).toLocaleString()} ETB` : '0 ETB',
        status: record.status || 'Outstanding'
      };
    });

    res.status(200).json({
      success: true,
      summary: {
        pending,
        inProgress,
        approved,
        returned,
        outstandingAmount: outstandingAmountResult[0]?.total || 0,
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

export const getFinancialRecords = async (req, res) => {
  try {
    const { search = '', department = 'All', employeeType = 'All', status = 'All', startDate, endDate } = req.query;
    const recordQuery = {};

    if (status !== 'All') recordQuery.status = status;
    if (startDate || endDate) {
      recordQuery.createdAt = {};
      if (startDate) recordQuery.createdAt.$gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) recordQuery.createdAt.$lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const records = await FinancialRecord.find(recordQuery).sort({ createdAt: -1 }).lean();
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
      return {
        ...record,
        employeeName,
        department: employeeDepartment,
        employeeType: employeeTypeValue,
        totalDue: Number(record.amount || 0),
        outstandingBalance: record.status === 'Outstanding' ? Number(record.amount || 0) : 0,
        loanAmount: record.type === 'Loan' ? Number(record.amount || 0) : 0,
        paymentAmount: record.status === 'Paid' || record.status === 'Cleared' ? Number(record.amount || 0) : 0,
      };
    }).filter((record) => {
      const haystack = `${record.employeeName} ${record.employeeId} ${record.department}`.toLowerCase();
      return (!search || haystack.includes(search.toLowerCase()))
        && (department === 'All' || record.department === department)
        && (employeeType === 'All' || record.employeeType === employeeType);
    });

    const summary = filteredRecords.reduce((result, record) => {
      result.totalEmployees.add(record.employeeId);
      result.totalOutstanding += record.outstandingBalance;
      result.totalLoans += record.loanAmount;
      result.totalPayments += record.paymentAmount;
      return result;
    }, { totalEmployees: new Set(), totalOutstanding: 0, totalLoans: 0, totalPayments: 0 });

    res.status(200).json({
      success: true,
      summary: {
        totalEmployees: summary.totalEmployees.size,
        totalOutstanding: summary.totalOutstanding,
        totalLoans: summary.totalLoans,
        totalPayments: summary.totalPayments,
      },
      records: filteredRecords,
      departments: [...new Set(filteredRecords.map((record) => record.department).filter(Boolean))],
      employeeTypes: [...new Set(filteredRecords.map((record) => record.employeeType).filter(Boolean))],
    });
  } catch (error) {
    console.error('Financial records error:', error);
    res.status(500).json({ success: false, message: 'Failed to load financial records', error: error.message });
  }
};