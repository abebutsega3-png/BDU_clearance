import {
  FINAL_HR_STAGE,
  normalizeRoutedOffice,
} from './clearanceWorkflow.js';

export const HR_OFFICE_SETTINGS = Object.freeze({
  departmentHead: 'Department Head',
  finance: 'Finance Office',
  property: 'Property / Asset Office',
  ict: 'ICT Office',
  library: 'Library',
  transport: 'Transport Office',
});

const workflowOfficeByKey = {
  ...HR_OFFICE_SETTINGS,
  finalHrClearanceEnabled: FINAL_HR_STAGE,
};

const notificationKeys = [
  'newClearanceRequest',
  'clearanceProgressUpdated',
  'clearanceResubmitted',
  'allOfficesApproved',
  'clearanceCompleted',
  'certificateGenerated',
  'emailEnabled',
  'systemNotificationsEnabled',
];

export const getEnabledHROffices = (hrSettings = {}) => Object.entries(workflowOfficeByKey)
  .filter(([key]) => hrSettings[key] === undefined
    ? (key === 'finalHrClearanceEnabled' || HR_OFFICE_SETTINGS[key] !== undefined)
    : hrSettings[key] === true)
  .map(([, office]) => office);

export const applyHROfficePolicy = (requestedOffices = [], hrSettings = {}) => {
  const enabled = getEnabledHROffices(hrSettings);
  const selected = new Set((Array.isArray(requestedOffices) ? requestedOffices : [])
    .map((office) => normalizeRoutedOffice(office).toLowerCase()));
  return enabled.filter((office) => selected.has(normalizeRoutedOffice(office).toLowerCase()));
};

export const getHRNotificationCategory = (notificationKey = '') => {
  const key = String(notificationKey || '').trim().toLowerCase();
  if (/new.?clearance.?request|newrequestemail/.test(key)) return 'newClearanceRequest';
  if (/resubmitted|returnedrequestemail/.test(key)) return 'clearanceResubmitted';
  if (/certificate/.test(key)) return 'certificateGenerated';
  if (/completed|final.?hr.?clearance/.test(key)) return 'clearanceCompleted';
  if (/all.?offices/.test(key)) return 'allOfficesApproved';
  if (/clearance|approval|progress/.test(key)) return 'clearanceProgressUpdated';
  return null;
};

export const validateHRSettings = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'A valid HR settings object is required.' };
  }

  const booleans = [
    ...Object.keys(HR_OFFICE_SETTINGS).map((key) => [`requiredOffices.${key}`, input.requiredOffices?.[key]]),
    ['finalHrClearanceEnabled', input.finalHrClearanceEnabled],
    ['generateCertificateAfterApproval', input.generateCertificateAfterApproval],
    ...notificationKeys.map((key) => [`notifications.${key}`, input.notifications?.[key]]),
    ['security.notifyOnNewLogin', input.security?.notifyOnNewLogin],
  ];
  for (const [name, value] of booleans) {
    if (typeof value !== 'boolean') return { error: `${name} must be true or false.` };
  }

  const enabledOffices = getEnabledHROffices({
    ...input.requiredOffices,
    finalHrClearanceEnabled: input.finalHrClearanceEnabled,
  });
  if (!enabledOffices.length) return { error: 'At least one required clearance office must remain enabled.' };

  const certificate = input.certificate;
  if (!certificate || typeof certificate !== 'object'
    || !['Automatic (Recommended)', 'Manual'].includes(certificate.generation)
    || !['After HR Approval', 'After All Offices Approved'].includes(certificate.trigger)
    || !['PDF', 'PDF and QR Code'].includes(certificate.format)
    || typeof certificate.numberPrefix !== 'string'
    || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,19}$/.test(certificate.numberPrefix.trim())) {
    return { error: 'Certificate generation, trigger, format, or number prefix is invalid.' };
  }

  const timeout = input.security?.sessionTimeout;
  if (!['15 minutes', '30 minutes', '60 minutes'].includes(timeout)) {
    return { error: 'Session timeout must be 15, 30, or 60 minutes.' };
  }

  return {
    value: {
      requiredOffices: Object.fromEntries(Object.keys(HR_OFFICE_SETTINGS)
        .map((key) => [key, input.requiredOffices[key]])),
      finalHrClearanceEnabled: input.finalHrClearanceEnabled,
      generateCertificateAfterApproval: input.generateCertificateAfterApproval,
      notifications: Object.fromEntries(notificationKeys
        .map((key) => [key, input.notifications[key]])),
      certificate: {
        generation: certificate.generation,
        trigger: certificate.trigger,
        numberPrefix: certificate.numberPrefix.trim(),
        format: certificate.format,
      },
      security: {
        sessionTimeout: timeout,
        notifyOnNewLogin: input.security.notifyOnNewLogin,
      },
    },
  };
};
