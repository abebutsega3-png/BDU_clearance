import ClearanceRequest from '../models/clearance.js';
import Asset from '../models/propertyAsset.js';
import Employee from '../models/employee.js';
import Notification from '../models/Notification.js';
import { propertyOfficeWorkflowFilter } from '../utils/clearanceWorkflow.js';

const normalizeText = (value) => {
  if (value && typeof value === 'object') return String(value.name || value.departmentName || value.label || '').trim();
  return String(value || '').trim();
};

const normalizeComparable = (value) => normalizeText(value).toLowerCase();
const normalizeAssetReportStatus = (value) => {
  const status = normalizeComparable(value);
  if (status === 'damaged') return 'Damaged';
  if (status === 'lost') return 'Lost';
  return 'Outstanding';
};

const isPropertyStageRequest = (request) => {
  const propertyOfficeName = (value) => normalizeComparable(value).includes('property');
  return (Array.isArray(request.requiredOffices) && request.requiredOffices.some(propertyOfficeName))
    || (Array.isArray(request.workflow) && request.workflow.some((step) => propertyOfficeName(step.office || step.name)))
    || Boolean(request.propertyReviewedAt || request.propertyReviewedBy || request.propertyStatus);
};

const isOutstandingAsset = (asset) => !['returned', 'available', 'in store', 'cleared'].includes(normalizeComparable(asset.status));

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
  if (department && department !== 'All' && normalizeComparable(employee?.department) !== normalizeComparable(department)) return false;
  if (campus && campus !== 'All' && normalizeComparable(employee?.campus) !== normalizeComparable(campus)) return false;
  if (employeeSearch) {
    const term = employeeSearch.toLowerCase();
    if (!normalizeComparable(employee?.fullName).includes(term) && !normalizeComparable(employee?.employeeId).includes(term)) return false;
  }
  return true;
};

export const getPropertyClearanceReport = async (req, res) => {
  try {
    const {
      reportType = 'Property Clearance Summary',
      reportPeriod = 'Custom Date Range',
      periodValue = '',
      fromDate: requestedFromDate,
      toDate: requestedToDate,
      status = 'All',
      department = 'All',
      campus = 'All'
    } = req.query;
    const period = getPeriodDates(reportPeriod, periodValue, requestedFromDate, requestedToDate);
    const { fromDate, toDate } = period;
    const [requests, assets, employees] = await Promise.all([
      ClearanceRequest.find(propertyOfficeWorkflowFilter).sort({ createdAt: -1 }).lean(),
      Asset.find({}).lean(),
      Employee.find({}).select('employeeId fullName department position campus').lean()
    ]);
    const employeeById = new Map(employees.map((employee) => [normalizeComparable(employee.employeeId), employee]));
    const assetsByEmployee = new Map();
    assets.forEach((asset) => {
      const employeeId = normalizeComparable(asset.employeeId);
      if (!employeeId || employeeId === 'n/a') return;
      const employeeAssets = assetsByEmployee.get(employeeId) || [];
      employeeAssets.push(asset);
      assetsByEmployee.set(employeeId, employeeAssets);
    });
    const requestById = new Map(requests.map((request) => [request.requestId, request]));
    const filteredRequests = requests.filter((request) => {
      const employee = employeeById.get(normalizeComparable(request.employeeId));
      const requestStatus = normalizeStatus(request);
      return isPropertyStageRequest(request)
        && inDateRange(request.requestDate || request.submittedDate || request.createdAt, fromDate, toDate)
        && (status === 'All' || requestStatus === status)
        && matchesEmployee(employee || request, department, campus, '');
    });

    if (reportType === 'Outstanding Property Report') {
      const data = assets
        .filter((asset) => isOutstandingAsset(asset) && inDateRange(asset.assignedDate || asset.createdAt, fromDate, toDate))
        .map((asset) => {
          const employee = employeeById.get(normalizeComparable(asset.employeeId));
          const request = requestById.get(asset.clearanceRequestId);
          const assetStatus = String(asset.status || 'Outstanding');
          const reportStatus = normalizeAssetReportStatus(assetStatus);
          return {
            employeeName: employee?.fullName || asset.employeeName || 'Unknown Employee',
            employeeId: employee?.employeeId || asset.employeeId || 'N/A',
            department: normalizeText(employee?.department || asset.department) || 'N/A',
            requestId: asset.clearanceRequestId || request?.requestId || 'N/A',
            requestDate: asset.assignedDate || asset.createdAt,
            clearanceReason: request?.reason || request?.clearanceReason || request?.clearanceType || 'N/A',
            propertyName: asset.assetName || 'Unknown Property',
            propertyStatus: reportStatus,
            clearanceStatus: request ? normalizeStatus(request) : 'N/A',
            date: asset.assignedDate || asset.createdAt,
            campus: employee?.campus || asset.campus || 'N/A',
            assetsCount: 1,
            assignedAssetsCount: 1,
            outstandingItemsCount: 1,
            outstandingItems: [{
              assetId: asset.assetId || 'N/A',
              assetName: asset.assetName || 'Unknown Property',
              status: assetStatus,
              condition: asset.condition || 'N/A'
            }],
            returnedItemsCount: 0,
            lastHandoverVoucher: asset.handoverVoucher || '',
            totalRequestValue: Number(asset.purchaseValue) || 0
          };
        })
        .filter((asset) => matchesEmployee(asset, department, campus, '')
          && (status === 'All' || normalizeComparable(asset.propertyStatus) === normalizeComparable(status)
            || normalizeComparable(asset.clearanceStatus) === normalizeComparable(status)));
      return res.json({
        success: true,
        reportType,
        reportPeriod,
        periodValue,
        period,
        summary: {
          totalRequests: data.length,
          approved: data.filter((item) => item.clearanceStatus === 'Approved' || item.clearanceStatus === 'Completed').length,
          returned: data.filter((item) => item.clearanceStatus === 'Returned').length,
          pending: data.filter((item) => item.clearanceStatus === 'Pending').length,
          underReview: data.filter((item) => item.clearanceStatus === 'Under Review').length,
          outstandingAssets: data.length
        },
        data
      });
    }

    const data = filteredRequests.map((request) => {
      const employee = employeeById.get(normalizeComparable(request.employeeId));
      const requestAssets = assetsByEmployee.get(normalizeComparable(request.employeeId)) || [];
      const returnedAssets = requestAssets.filter((asset) => normalizeComparable(asset.status) === 'returned');
      const assignedAssets = requestAssets.filter(isOutstandingAsset);
      const voucherAssets = [...requestAssets]
        .filter((asset) => asset.handoverVoucher)
        .sort((left, right) => new Date(right.returnDate || right.assignedDate || right.updatedAt || 0) - new Date(left.returnDate || left.assignedDate || left.updatedAt || 0));
      const outstandingItems = assignedAssets.map((asset) => ({
        assetId: asset.assetId || 'N/A',
        assetName: asset.assetName || 'Unknown Asset',
        status: asset.status || 'Outstanding',
        condition: asset.condition || 'N/A'
      }));
      return {
        requestId: request.requestId,
        requestDate: request.requestDate || request.submittedDate || request.createdAt,
        clearanceReason: request.reason || request.clearanceReason || request.clearanceType || 'N/A',
        propertyStatus: normalizeStatus(request),
        clearanceStatus: normalizeStatus(request),
        reviewedBy: request.reviewedBy || 'Property Officer',
        reviewedAt: request.reviewedAt,
        comment: request.officerComment || '',
        returnReason: request.returnReason || '',
        employeeName: employee?.fullName || request.employeeName || normalizeText(request.employee) || 'Unknown Employee',
        employeeId: employee?.employeeId || request.employeeId,
        department: normalizeText(employee?.department || request.department) || 'N/A',
        position: employee?.position || request.position || 'N/A',
        campus: employee?.campus || request.campus || 'N/A',
        assetsCount: requestAssets.length,
        assignedAssetsCount: assignedAssets.length,
        outstandingItemsCount: outstandingItems.length,
        outstandingItems,
        returnedItemsCount: returnedAssets.length,
        lastHandoverVoucher: request.propertyHandoverVoucher || request.lastHandoverVoucher || request.handoverVoucher || voucherAssets[0]?.handoverVoucher || '',
        totalRequestValue: requestAssets.reduce((total, asset) => total + (Number(asset.purchaseValue) || 0), 0)
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
