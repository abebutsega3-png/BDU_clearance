export const normalizeWorkflowStatus = (value) => {
  const status = String(value || '').trim();
  if (!status) return 'Pending';

  const lowered = status.toLowerCase();
  if (['completed', 'approved', 'cleared', 'done', 'success'].includes(lowered)) return 'Completed';
  if (['returned', 'rejected', 'return'].includes(lowered)) return 'Returned';
  if (['in progress', 'under review', 'review', 'processing'].includes(lowered)) return 'In Progress';
  return 'Pending';
};

export const isFinalHRStage = (value = '') => {
  const officeName = String(value || '').trim().toLowerCase();
  if (!officeName) return false;

  return officeName.includes('final hr')
    || officeName.includes('human resources')
    || officeName === 'hr office'
    || officeName === 'hr'
    || officeName === 'human resource';
};

export const isApprovedOfficeStatus = (status) => ['Completed', 'Approved', 'Cleared'].includes(String(status || ''));

export const getClearanceRequestStatus = (request, progressInfo) => {
  const progress = progressInfo || computeClearanceProgress(request);
  if (progress.returnedStep) return 'Returned';
  if (progress.finalHRStep?.status === 'Completed') return 'Completed';
  if (progress.totalOffices > 0 && progress.progressCount === progress.totalOffices) {
    return 'In Progress';
  }
  return normalizeWorkflowStatus(request?.status || request?.overallStatus);
};

const CORE_OFFICES = ['Department Head', 'Library', 'Finance Office', 'Property / Asset Office', 'ICT Office'];

const officeMatches = (office, name) => String(office || '').toLowerCase().includes(String(name || '').toLowerCase());

const getOfficeOverride = (request, office) => {
  const overrides = {
    'Finance Office': request?.financeStatus,
    'ICT Office': request?.ictStatus || request?.ictClearance?.status,
    Library: request?.libraryStatus,
    'Property / Asset Office': request?.propertyStatus,
    'Department Head': request?.departmentStatus,
  };
  return overrides[office];
};

export const computeClearanceProgress = (request) => {
  const workflow = Array.isArray(request?.workflow) && request.workflow.length
    ? request.workflow
    : Array.isArray(request?.departmentClearances) && request.departmentClearances.length
      ? request.departmentClearances
      : [];

  let previousOfficeApproved = true;
  const steps = CORE_OFFICES.map((office) => {
    const matchingSteps = workflow.filter((step) => officeMatches(step?.office || step?.name || step?.department, office));
    const step = matchingSteps[matchingSteps.length - 1] || {};
    const override = getOfficeOverride(request, office);
    const actualStatus = normalizeWorkflowStatus(override || step.status || step.state || step.approvalStatus);
    const status = previousOfficeApproved || actualStatus === 'Returned' ? actualStatus : 'Waiting';
    previousOfficeApproved = status === 'Completed';

    return {
      office,
      status,
      updatedAt: step.updatedAt || step.date || step.completedAt || '',
      clearedBy: step.clearedBy || step.approvedBy || step.reviewedBy || '',
      clearedDate: step.clearedDate || step.completedAt || step.updatedAt || '',
      returnReason: step.returnReason || step.comment || step.remarks || request?.[`${office === 'ICT Office' ? 'ict' : office === 'Finance Office' ? 'finance' : office === 'Library' ? 'library' : office === 'Property / Asset Office' ? 'property' : 'department'}ReturnReason`] || (office === 'ICT Office' ? request?.ictClearance?.returnReason : '') || '',
    };
  });

  const finalHRSource = workflow.find((step) => isFinalHRStage(step?.office || step?.name || step?.department));
  const finalHRStep = {
    office: 'Final HR Clearance',
    status: normalizeWorkflowStatus(finalHRSource?.status || finalHRSource?.state || finalHRSource?.approvalStatus),
    updatedAt: finalHRSource?.updatedAt || finalHRSource?.date || finalHRSource?.completedAt || '',
    clearedBy: finalHRSource?.clearedBy || finalHRSource?.approvedBy || finalHRSource?.reviewedBy || '',
    clearedDate: finalHRSource?.clearedDate || finalHRSource?.completedAt || finalHRSource?.updatedAt || '',
  };

  const activeOfficeSteps = steps.filter((step) => !isFinalHRStage(step.office));

  const totalOffices = activeOfficeSteps.length || 0;
  const progressCount = activeOfficeSteps.filter((step) => isApprovedOfficeStatus(step.status)).length;
  const percent = totalOffices ? Math.round((progressCount / totalOffices) * 100) : 0;

  const returnedStep = activeOfficeSteps.find((step) => step.status === 'Returned') || steps.find((step) => step.status === 'Returned');
  const returnReason = returnedStep?.returnReason
    || request?.returnReason
    || request?.departmentReturnReason
    || request?.propertyReturnReason
    || request?.ictReturnReason
    || request?.libraryReturnReason
    || request?.financeRemarks
    || request?.remarks
    || 'Please resolve the issue and resubmit your request.';

  const allActiveOfficesApproved = activeOfficeSteps.length > 0 && activeOfficeSteps.every((step) => isApprovedOfficeStatus(step.status));

  const currentStage = returnedStep
    || (allActiveOfficesApproved && finalHRStep ? finalHRStep : null)
    || activeOfficeSteps.find((step) => step.status === 'In Progress')
    || activeOfficeSteps.find((step) => step.status === 'Pending')
    || finalHRStep
    || activeOfficeSteps[activeOfficeSteps.length - 1]
    || { office: 'Pending', status: 'Pending' };

  return {
    steps,
    totalOffices,
    progressCount,
    percent,
    returnedStep: returnedStep || null,
    returnReason,
    currentStage,
    finalHRStep: finalHRStep || null,
  };
};
