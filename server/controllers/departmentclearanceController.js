import Clearance from '../models/clearance.js';
import Employee from '../models/employee.js';
import Notification from '../models/Notification.js';
import Department from '../models/department.js';

const normalizeDepartment = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[\s_-]+/g, '');

const departmentQuery = (department) => ({
  $or: [
    { department: { $regex: `^${String(department || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
    { 'department.name': { $regex: `^${String(department || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
    { 'department.departmentName': { $regex: `^${String(department || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
  ],
});

const departmentRequestQuery = async (department) => {
  const employees = await Employee.find(departmentQuery(department)).select('employeeId').lean();
  return {
    $and: [{
      initialHRStatus: 'Approved',
      $or: [
        departmentQuery(department),
        { employeeId: { $in: employees.map((employee) => employee.employeeId) } },
      ],
    }],
  };
};

const addAssignedHeadFilter = (query, userId) => {
  query.$and[0].$or.push({ assignedTo: userId });
  return query;
};

const departmentStatusFilter = (status) => ({
  $or: [
    { departmentStatus: status },
    { 'departmentClearance.status': status },
    { departmentClearances: { $elemMatch: { status } } },
    { workflow: { $elemMatch: { office: { $regex: 'department', $options: 'i' }, status } } },
  ],
});

const withDepartmentStatus = (query, status) => ({
  $and: [...(query.$and || []), departmentStatusFilter(status)],
});

const resolveDepartmentHeadDepartment = async (user) => {
  const identity = [user?.name, user?.employeeId].filter(Boolean).map((value) => String(value).trim());
  if (identity.length) {
    const department = await Department.findOne({
      departmentHead: { $in: identity.map((value) => new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) },
    }).select('departmentName').lean();
    if (department?.departmentName?.trim()) return department.departmentName.trim();
  }

  const employeeIdentityQuery = user?.employeeId
    ? { employeeId: user.employeeId }
    : user?.name
      ? { fullName: { $regex: `^${String(user.name).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }
      : null;
  if (employeeIdentityQuery) {
    const employee = await Employee.findOne(employeeIdentityQuery).select('department').lean();
    if (employee?.department?.trim()) return employee.department.trim();
  }
  if (user?.department?.trim()) return user.department.trim();
  return '';
};

const departmentHistoryQuery = {
  $or: [
    { departmentStatus: { $in: ['Approved', 'Returned'] } },
    { 'departmentClearance.status': { $in: ['Approved', 'Returned'] } },
    { departmentClearances: { $elemMatch: { status: { $in: ['Approved', 'Returned'] } } } },
    { workflow: { $elemMatch: { office: { $regex: 'department', $options: 'i' }, status: { $in: ['Approved', 'Returned'] } } } },
  ],
};

const getDashboardSummary = async (req, res) => {
  try {
    const department = await resolveDepartmentHeadDepartment(req.user);
    if (!department) return res.status(400).json({ message: 'Your account is not assigned to a department.' });

    const requestQuery = addAssignedHeadFilter(await departmentRequestQuery(department), req.user._id);
    const [totalEmployees, activeEmployees, pending, underReview, approved, returned, completed, recentRequests, notifications] = await Promise.all([
      Employee.countDocuments(departmentQuery(department)),
      Employee.countDocuments({ ...departmentQuery(department), status: 'Active' }),
      Clearance.countDocuments(withDepartmentStatus(requestQuery, 'Pending')),
      Clearance.countDocuments(withDepartmentStatus(requestQuery, 'In Progress')),
      Clearance.countDocuments(withDepartmentStatus(requestQuery, 'Approved')),
      Clearance.countDocuments(withDepartmentStatus(requestQuery, 'Returned')),
      Clearance.countDocuments(withDepartmentStatus(requestQuery, 'Completed')),
      Clearance.find(requestQuery).sort({ createdAt: -1 }).limit(5).lean(),
      Notification.find({ recipientId: req.user._id }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    return res.status(200).json({
      department,
      departmentHead: req.user.name,
      employees: { total: totalEmployees, active: activeEmployees },
      stats: { pending, underReview, approved, returned, completed },
      recentRequests,
      notifications,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Get Requests with Filter, Search, and Pagination
const getRequests = async (req, res) => {
  try {
    const department = await resolveDepartmentHeadDepartment(req.user);
    if (!department) {
      return res.status(400).json({ message: 'Your account is not assigned to a department.' });
    }

    const { status, search, clearanceType, fromDate, toDate, history, page = 1, limit = 8 } = req.query;

    let query = addAssignedHeadFilter(await departmentRequestQuery(department), req.user._id);

    if (history === 'true') query.$and.push(departmentHistoryQuery);

    // Filter by Status Tab
    if (status && status !== 'All Requests' && history !== 'true') {
      const departmentStatus = status === 'Under Review' ? 'In Progress' : status;
      query.$and.push(departmentStatusFilter(departmentStatus));
    }

    if (history === 'true' && status && status !== 'All') query.$and.push({
      ...departmentStatusFilter(status),
    });

    // Filter by Clearance Type
    if (clearanceType && clearanceType !== 'All') {
      query.clearanceType = clearanceType;
    }

    // Search by Employee Name or ID
    if (search) {
      query.$and.push({ $or: [
        { employeeName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { requestId: { $regex: search, $options: 'i' } }
      ] });
    }

    // Filter by Date Range
    if (fromDate || toDate) {
      query.requestDate = {};
      if (fromDate) query.requestDate.$gte = fromDate;
      if (toDate) query.requestDate.$lte = toDate;
    }

    // Fetch Paginated Data
    const requests = await Clearance.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const totalCount = await Clearance.countDocuments(query);

    // Dynamic Counts for Top Cards
    const departmentFilter = addAssignedHeadFilter(await departmentRequestQuery(department), req.user._id);
    const stats = {
      all: await Clearance.countDocuments(departmentFilter),
      pending: await Clearance.countDocuments(withDepartmentStatus(departmentFilter, 'Pending')),
      underReview: await Clearance.countDocuments(withDepartmentStatus(departmentFilter, 'In Progress')),
      approved: await Clearance.countDocuments(withDepartmentStatus(departmentFilter, 'Approved')),
      returned: await Clearance.countDocuments(withDepartmentStatus(departmentFilter, 'Returned')),
      completed: await Clearance.countDocuments(withDepartmentStatus(departmentFilter, 'Completed'))
    };

    res.status(200).json({
      requests,
      totalCount,
      stats,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: Number(page)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

export { getRequests, getDashboardSummary };