import ClearanceRequest from '../models/clearance.js';
import Asset from '../models/propertyAsset.js';
import Employee from '../models/employee.js';
import Notification from '../models/Notification.js';

const normalizeStatus = (request) => {
  const propertyStatus = String(request.propertyStatus || '').trim().toLowerCase();
  if (propertyStatus === 'completed') return 'Completed';
  if (['approved', 'cleared', 'clear'].includes(propertyStatus)) return 'Approved';
  if (['returned', 'rejected', 'not clear'].includes(propertyStatus)) return 'Returned';
  if (['under review', 'in progress', 'review'].includes(propertyStatus)) return 'Under Review';

  const propertyStep = Array.isArray(request.workflow)
    ? request.workflow.find((step) => String(step.office || '').toLowerCase().includes('property'))
    : null;
  const workflowStatus = String(propertyStep?.status || '').trim().toLowerCase();
  if (workflowStatus === 'completed') return 'Completed';
  if (['approved', 'cleared', 'clear'].includes(workflowStatus)) return 'Approved';
  if (['rejected', 'returned', 'not clear'].includes(workflowStatus)) return 'Returned';
  if (['in progress', 'under review', 'review'].includes(workflowStatus)) return 'Under Review';
  const fallbackStatus = String(request.propertyStatus || request.status || request.overallStatus || 'Pending').trim().toLowerCase();
  if (fallbackStatus === 'completed') return 'Completed';
  if (['approved', 'cleared', 'clear'].includes(fallbackStatus)) return 'Approved';
  if (['rejected', 'returned', 'not clear'].includes(fallbackStatus)) return 'Returned';
  if (['in progress', 'under review', 'review'].includes(fallbackStatus)) return 'Under Review';
  return 'Pending';
};

const inDateRange = (value, fromDate, toDate) => {
  if (!fromDate && !toDate) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  if (fromDate && date < new Date(`${fromDate}T00:00:00`)) return false;
  if (toDate && date > new Date(`${toDate}T23:59:59.999`)) return false;
  return true;
};

const getPeriodDates = (reportPeriod, periodValue, fromDate, toDate) => {
  const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  if (reportPeriod === 'Monthly' && /^\d{4}-\d{2}$/.test(periodValue || '')) {
    const [year, month] = periodValue.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return { fromDate: formatDate(start), toDate: formatDate(end) };
  }

  if (reportPeriod === 'Yearly' && /^\d{4}$/.test(periodValue || '')) {
    return { fromDate: `${periodValue}-01-01`, toDate: `${periodValue}-12-31` };
  }

  if (reportPeriod === 'Weekly' && /^(\d{4})-W(\d{2})$/.test(periodValue || '')) {
    const [, yearText, weekText] = periodValue.match(/^(\d{4})-W(\d{2})$/);
    const year = Number(yearText);
    const week = Number(weekText);
    const januaryFourth = new Date(year, 0, 4);
    const mondayOfFirstWeek = new Date(januaryFourth);
    mondayOfFirstWeek.setDate(januaryFourth.getDate() - ((januaryFourth.getDay() + 6) % 7));
    const start = new Date(mondayOfFirstWeek);
    start.setDate(mondayOfFirstWeek.getDate() + ((week - 1) * 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { fromDate: formatDate(start), toDate: formatDate(end) };
  }

  return { fromDate, toDate };
};

const matchesEmployee = (employee, department, campus, employeeSearch) => {
  if (department && department !== 'All' && employee?.department !== department) return false;
  if (campus && campus !== 'All' && employee?.campus !== campus) return false;
  if (employeeSearch) {
    const term = employeeSearch.toLowerCase();
    if (!employee?.fullName?.toLowerCase().includes(term) && !employee?.employeeId?.toLowerCase().includes(term)) return false;
  }
  return true;
};

export const getPropertyClearanceReport = async (req, res) => {
  try {
    const { reportType = 'Property Clearance Summary', reportPeriod = 'Custom Date Range', periodValue = '', fromDate: requestedFromDate, toDate: requestedToDate, status = 'All', department = 'All', campus = 'All' } = req.query;
    const period = getPeriodDates(reportPeriod, periodValue, requestedFromDate, requestedToDate);
    const { fromDate, toDate } = period;
    const [requests, assets, employees] = await Promise.all([
      ClearanceRequest.find({}).sort({ createdAt: -1 }).lean(),
      Asset.find({}).lean(),
      Employee.find({}).select('employeeId fullName department position campus').lean()
    ]);
    const employeeById = new Map(employees.map((employee) => [employee.employeeId, employee]));
    const filteredRequests = requests.filter((request) => {
      const employee = employeeById.get(request.employeeId);
      const requestStatus = normalizeStatus(request);
      return inDateRange(request.requestDate || request.submittedDate || request.createdAt, fromDate, toDate)
        && (status === 'All' || requestStatus === status)
        && matchesEmployee(employee || request, department, campus, '');
    });

    if (reportType === 'Outstanding Property Report') {
      const data = assets
        .filter((asset) => asset.status === 'Outstanding' && inDateRange(asset.assignedDate || asset.createdAt, fromDate, toDate))
        .map((asset) => {
          const employee = employeeById.get(asset.employeeId);
          const request = requests.find((item) => item.requestId === asset.clearanceRequestId);
          return {
            employeeName: employee?.fullName || asset.employeeName || 'Unknown Employee',
            employeeId: employee?.employeeId || asset.employeeId || 'N/A',
            department: employee?.department || asset.department || 'N/A',
            requestId: asset.clearanceRequestId || request?.requestId || 'N/A',
            propertyName: asset.assetName || 'Unknown Property',
            propertyStatus: asset.status,
            clearanceStatus: request ? normalizeStatus(request) : 'N/A',
            date: asset.assignedDate || asset.createdAt,
            campus: employee?.campus || asset.campus || 'N/A'
          };
        })
        .filter((asset) => matchesEmployee(asset, department, campus, ''));
      return res.json({ success: true, reportType, reportPeriod, periodValue, period, data });
    }

    const data = filteredRequests.map((request) => {
      const employee = employeeById.get(request.employeeId);
      const requestAssets = assets.filter((asset) => asset.employeeId === request.employeeId);
      return {
        requestId: request.requestId,
        requestDate: request.requestDate || request.submittedDate || request.createdAt,
        clearanceReason: request.clearanceReason,
        propertyStatus: normalizeStatus(request),
        clearanceStatus: normalizeStatus(request),
        reviewedBy: request.reviewedBy || 'Property Officer',
        reviewedAt: request.reviewedAt,
        comment: request.officerComment || '',
        returnReason: request.returnReason || '',
        employeeName: employee?.fullName || request.employeeName || 'Unknown Employee',
        employeeId: employee?.employeeId || request.employeeId,
        department: employee?.department || request.department || 'N/A',
        position: employee?.position || request.position || 'N/A',
        campus: employee?.campus || request.campus || 'N/A',
        assetsCount: requestAssets.length
      };
    });

    return res.json({
      success: true,
      reportType,
      reportPeriod,
      periodValue,
      period,
      summary: {
        totalRequests: data.length,
        approved: data.filter((item) => item.propertyStatus === 'Approved').length,
        returned: data.filter((item) => item.propertyStatus === 'Returned').length,
        pending: data.filter((item) => item.propertyStatus === 'Pending' || item.propertyStatus === 'In Progress').length,
        underReview: data.filter((item) => item.propertyStatus === 'Under Review').length,
        completed: data.filter((item) => item.propertyStatus === 'Completed').length
      },
      data
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error Generating Report', error: error.message });
  }
};

export const sendReportToHR = async (req, res) => {
  try {
    const { title = 'Property Clearance Report', period = '', generatedBy = 'Property Officer' } = req.body || {};
    await Notification.create({
      title: `New Property Clearance Report`,
      message: `${generatedBy} sent ${title}${period ? ` for ${period}` : ''}.`,
      targetName: 'HR Officer',
      type: 'request_received',
      actionText: 'View Report',
      actionLink: '/hr-office/reports'
    });
    return res.json({ success: true, message: 'Report Notification Sent to HR Officer' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to notify HR', error: error.message });
  }
};
