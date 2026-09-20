import ClearanceRequest from '../models/clearance.js';
import Asset from '../models/propertyAsset.js';
import Employee from '../models/employee.js';
import Notification from '../models/Notification.js';

const normalizeStatus = (request) => {
  const propertyStatus = String(request.propertyStatus || '').trim().toLowerCase();
  if (['approved', 'completed', 'cleared', 'clear'].includes(propertyStatus)) return 'Approved';
  if (['returned', 'rejected', 'not clear'].includes(propertyStatus)) return 'Returned';
  if (['under review', 'in progress', 'review'].includes(propertyStatus)) return 'Under Review';

  const propertyStep = Array.isArray(request.workflow)
    ? request.workflow.find((step) => String(step.office || '').toLowerCase().includes('property'))
    : null;
  const workflowStatus = String(propertyStep?.status || '').trim().toLowerCase();
  if (['completed', 'approved', 'cleared', 'clear'].includes(workflowStatus)) return 'Approved';
  if (['rejected', 'returned', 'not clear'].includes(workflowStatus)) return 'Returned';
  if (['in progress', 'under review', 'review'].includes(workflowStatus)) return 'Under Review';
  const fallbackStatus = String(request.propertyStatus || request.status || request.overallStatus || 'Pending').trim().toLowerCase();
  if (['approved', 'completed', 'cleared', 'clear'].includes(fallbackStatus)) return 'Approved';
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
    const { reportType = 'Property Clearance Summary', fromDate, toDate, status = 'All', department = 'All', campus = 'All' } = req.query;
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
        .filter((asset) => asset.status === 'Outstanding')
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
      return res.json({ success: true, reportType, period: { fromDate, toDate }, data });
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
      period: { fromDate, toDate },
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
