const transportOfficeRegex = { $regex: 'transport', $options: 'i' };
const transportChecklistFields = [
  'vehicleReturned',
  'vehicleCondition',
  'vehicleKeysReturned',
  'vehicleDocumentsReturned',
  'vehicleAccessoriesReturned',
  'noOutstandingIssue',
  'vehicleHandover',
  'transportRecords',
  'noUnreturnedTransportProperty',
  'noOtherObligation',
];

export const resetTransportReviewForResubmission = (review = {}) => ({
  ...review,
  ...Object.fromEntries(transportChecklistFields.map((field) => [field, 'Pending'])),
  status: 'Pending',
  reviewedBy: '',
  reviewedAt: null,
  officerNotes: '',
  returnReason: '',
});

export const transportRequestFilter = {
  $or: [
    { requiredOffices: transportOfficeRegex },
    { workflow: { $elemMatch: { $or: [{ office: transportOfficeRegex }, { name: transportOfficeRegex }] } } },
    { currentStep: transportOfficeRegex },
    { transportStatus: { $exists: true, $nin: [null, ''] } },
    { transportClearanceStatus: { $exists: true, $nin: [null, ''] } },
    { 'transportClearance.status': { $exists: true, $nin: [null, ''] } },
  ],
};

const workflowStatusFilter = (statuses) => ({
  $or: [
    { transportStatus: { $in: statuses } },
    { transportClearanceStatus: { $in: statuses } },
    { 'transportClearance.status': { $in: statuses } },
    {
      workflow: {
        $elemMatch: {
          $and: [
            { $or: [{ office: transportOfficeRegex }, { name: transportOfficeRegex }] },
            { status: { $in: statuses } },
          ],
        },
      },
    },
    { $and: [{ currentStep: transportOfficeRegex }, { status: { $in: statuses } }] },
  ],
});

const defaultPendingTransportFilter = {
  $and: [
    { requiredOffices: transportOfficeRegex },
    { transportStatus: { $in: [null, ''] } },
    { transportClearanceStatus: { $in: [null, ''] } },
    { 'transportClearance.status': { $in: [null, ''] } },
    {
      workflow: {
        $not: {
          $elemMatch: { $or: [{ office: transportOfficeRegex }, { name: transportOfficeRegex }] },
        },
      },
    },
  ],
};

export const transportReviewableFilter = {
  $and: [transportRequestFilter, { departmentStatus: 'Approved' }],
};

export const getTransportStatusFilter = (status) => {
  if (!status || status === 'All') return null;
  if (status === 'Pending') {
    return {
      $or: [workflowStatusFilter(['Pending', 'Under Review', 'In Progress']), defaultPendingTransportFilter],
    };
  }
  if (status === 'Approved') return workflowStatusFilter(['Approved', 'Completed', 'Cleared']);
  if (status === 'Returned') return workflowStatusFilter(['Returned', 'Rejected']);
  return workflowStatusFilter([status]);
};

export const normalizeTransportStatus = (value) => {
  const status = String(value || '').trim().toLowerCase();
  if (['approved', 'completed', 'cleared'].includes(status)) return 'Approved';
  if (['returned', 'rejected'].includes(status)) return 'Returned';
  if (['under review', 'in progress', 'review'].includes(status)) return 'Under Review';
  if (status === 'cancelled') return 'Cancelled';
  return status ? status.replace(/\b\w/g, (character) => character.toUpperCase()) : 'Pending';
};

export const getTransportStatus = (request) => {
  const workflowStep = (Array.isArray(request.workflow) ? request.workflow : []).find((step) =>
    /transport/i.test(String(step?.office || step?.name || ''))
  );
  const status = request.transportStatus
    || request.transportClearanceStatus
    || request.transportClearance?.status
    || request.transportReview?.status
    || workflowStep?.status
    || (/transport/i.test(String(request.currentStep || '')) ? request.status : 'Pending');

  return normalizeTransportStatus(status);
};

export const mapTransportRequest = (request) => {
  const employee = request.employee && typeof request.employee === 'object' ? request.employee : {};
  const department = request.department && typeof request.department === 'object'
    ? request.department.departmentName || request.department.name || ''
    : request.department;

  return {
    _id: request._id,
    requestId: request.requestId || String(request._id),
    employeeName: employee.fullName || employee.name || request.employeeName || 'Unknown Employee',
    employeeId: employee.employeeId || request.employeeId || '',
    department: department || 'N/A',
    position: employee.position || request.position || 'N/A',
    clearanceType: request.clearanceType || request.reason || 'Clearance',
    date: request.requestDate || request.submittedDate || request.createdAt,
    lastWorkingDate: request.lastWorkingDate || request.relievingDate || null,
    status: getTransportStatus(request),
  };
};