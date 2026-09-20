export const FINAL_HR_STAGE = 'Final HR Clearance';
export const PARALLEL_CLEARANCE_OFFICES = [
  'Finance Office',
  'Library',
  'Property / Asset Office',
  'ICT Office',
];
export const POST_PARALLEL_CLEARANCE_OFFICES = [];
export const CORE_CLEARANCE_OFFICES = [
  'Department Head',
  ...PARALLEL_CLEARANCE_OFFICES,
  ...POST_PARALLEL_CLEARANCE_OFFICES,
];

export const DEFAULT_REQUIRED_OFFICES = [...CORE_CLEARANCE_OFFICES, FINAL_HR_STAGE];

const normalizeOfficeName = (value = '') => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const officeAliases = {
  'department head': 'Department Head',
  department: 'Department Head',
  'department office': 'Department Head',
  'hr office': FINAL_HR_STAGE,
  hr: FINAL_HR_STAGE,
  'human resources': FINAL_HR_STAGE,
  'human resource': FINAL_HR_STAGE,
  'final hr clearance': FINAL_HR_STAGE,
  library: 'Library',
  'library office': 'Library',
  finance: 'Finance Office',
  'finance office': 'Finance Office',
  'property': 'Property / Asset Office',
  'property office': 'Property / Asset Office',
  'property / asset office': 'Property / Asset Office',
  'ict': 'ICT Office',
  'ict office': 'ICT Office',
};

export const isFinalHRStage = (value = '') => {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return normalized.includes('final hr')
    || normalized.includes('human resources')
    || normalized === 'hr office'
    || normalized === 'hr'
    || normalized === 'human resource';
};

export const normalizeRequiredOffices = (offices = []) => {
  const normalized = Array.isArray(offices) ? offices : [];
  const unique = new Set();

  const values = normalized
    .map((office) => {
      if (typeof office !== 'string') return '';
      const trimmed = office.trim();
      if (!trimmed) return '';
      const normalizedKey = trimmed.toLowerCase();
      return officeAliases[normalizedKey] || trimmed;
    })
    .filter(Boolean)
    .map((office) => office.trim());

  const finalOffices = [];
  for (const office of values) {
    const key = office.toLowerCase();
    if (unique.has(key)) continue;
    unique.add(key);
    finalOffices.push(office);
  }

  return finalOffices.length ? finalOffices : [...DEFAULT_REQUIRED_OFFICES];
};

export const buildRequiredOfficeWorkflow = (offices = DEFAULT_REQUIRED_OFFICES) => {
  const requiredOffices = normalizeRequiredOffices(offices);
  const baseWorkflow = requiredOffices
    .filter((office) => !isFinalHRStage(office))
    .map((office) => ({
      office,
      status: 'Pending',
      updatedAt: new Date().toISOString(),
    }));

  const finalHrStep = requiredOffices.find((office) => isFinalHRStage(office));
  if (finalHrStep) {
    baseWorkflow.push({
      office: finalHrStep,
      status: 'Pending',
      updatedAt: new Date().toISOString(),
    });
  }

  return baseWorkflow;
};

export const getCurrentResponsibleOffice = ({ workflow = [], currentStep = '' } = {}) => {
  const storedStep = String(currentStep || '').trim();
  if (storedStep) return storedStep;

  const orderedWorkflow = Array.isArray(workflow) ? workflow : [];
  if (!orderedWorkflow.length) return DEFAULT_REQUIRED_OFFICES[0];

  const resolvedStep = orderedWorkflow.find((step) => {
    const status = String(step?.status || '').trim().toLowerCase();
    return !['approved', 'completed', 'cleared', 'returned', 'rejected', 'cancelled'].includes(status);
  });

  return resolvedStep?.office || orderedWorkflow[orderedWorkflow.length - 1]?.office || DEFAULT_REQUIRED_OFFICES[0];
};

const completedStatuses = new Set(['approved', 'completed', 'cleared']);
const returnedStatuses = new Set(['returned', 'rejected']);

const workflowStepForOffice = (workflow, office) => {
  const normalizedOffice = normalizeOfficeName(office);
  return (Array.isArray(workflow) ? workflow : []).find((step) => {
    const stepOffice = normalizeOfficeName(step?.office || step?.name || '');
    return stepOffice === normalizedOffice || stepOffice.includes(normalizedOffice) || normalizedOffice.includes(stepOffice);
  });
};

const workflowStatusForOffice = (workflow, office) => String(workflowStepForOffice(workflow, office)?.status || 'Pending').trim().toLowerCase();

export const getResponsibleOffices = ({
  workflow = [],
  requiredOffices = DEFAULT_REQUIRED_OFFICES,
  departmentStatus = '',
} = {}) => {
  if (String(departmentStatus).toLowerCase() !== 'approved') return ['Department Head'];

  const returnedOffice = (Array.isArray(workflow) ? workflow : []).find((step) => returnedStatuses.has(String(step?.status || '').toLowerCase()));
  if (returnedOffice) return [returnedOffice.office || returnedOffice.name];

  const officesToDispatch = normalizeRequiredOffices(requiredOffices)
    .filter((office) => !isFinalHRStage(office) && !normalizeOfficeName(office).includes('department'));
  const pendingOffices = officesToDispatch.filter((office) => !completedStatuses.has(workflowStatusForOffice(workflow, office)));
  if (pendingOffices.length) return pendingOffices;

  const postParallelOffice = POST_PARALLEL_CLEARANCE_OFFICES.find((office) => !completedStatuses.has(workflowStatusForOffice(workflow, office)));
  if (postParallelOffice) return [postParallelOffice];

  return [FINAL_HR_STAGE];
};

export const areAllRequiredOfficesCleared = ({ workflow = [], requiredOffices = DEFAULT_REQUIRED_OFFICES, departmentStatus = '' } = {}) => {
  if (String(departmentStatus).toLowerCase() !== 'approved') return false;

  return normalizeRequiredOffices(requiredOffices)
    .filter((office) => !isFinalHRStage(office) && !normalizeOfficeName(office).includes('department'))
    .every((office) => completedStatuses.has(workflowStatusForOffice(workflow, office)));
};

export const resolveNextStepAfterDecision = (office = '', decision = '') => {
  const normalizedDecision = String(decision || '').trim().toLowerCase();
  if (['returned', 'rejected', 'cancelled'].includes(normalizedDecision)) return 'Employee';

  const matchingOrder = DEFAULT_REQUIRED_OFFICES.map((item) => normalizeOfficeName(item));
  const normalizedOffice = normalizeOfficeName(office);
  const index = matchingOrder.findIndex((item) => item === normalizedOffice || normalizedOffice.includes(item) || item.includes(normalizedOffice));

  if (index === -1) return 'Employee';
  if (['pending', 'in progress', 'under review'].includes(normalizedDecision)) return DEFAULT_REQUIRED_OFFICES[index];
  const nextOffice = DEFAULT_REQUIRED_OFFICES[index + 1];
  return nextOffice || 'Employee';
};

export const propertyOfficeWorkflowFilter = {
  departmentStatus: 'Approved',
};

export const isRequestVisibleToOffice = (clearance = {}, office = '') => {
  const currentStep = getCurrentResponsibleOffice({ workflow: clearance?.workflow, currentStep: clearance?.currentStep });
  const normalizedCurrent = normalizeOfficeName(currentStep);
  const normalizedOffice = normalizeOfficeName(office);

  if (!normalizedOffice) return true;
  if (!normalizedCurrent) return false;

  if (normalizedOffice === 'property / asset office' && clearance?.departmentStatus !== 'Approved') return false;

  if (normalizedOffice === 'property / asset office' && [
    'library',
    'library office',
    'finance office',
    'finance',
    'property / asset office',
    'property office',
    'property',
  ].includes(normalizedCurrent)) return true;

  const sameOffice = normalizedCurrent === normalizedOffice
    || normalizedCurrent.includes(normalizedOffice)
    || normalizedOffice.includes(normalizedCurrent);

  if (sameOffice) return true;

  return false;
};
