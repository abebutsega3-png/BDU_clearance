const employeePreferenceByType = {
  CLEARANCE_UPDATED: 'clearanceUpdates',
  CLEARANCE_PROGRESS_UPDATED: 'clearanceUpdates',
  CLEARANCE_IN_PROGRESS: 'clearanceUpdates',
  CLEARANCE_APPROVED: 'clearanceUpdates',
  ICT_CLEARANCE_APPROVED: 'clearanceUpdates',
  INITIAL_HR_APPROVED: 'clearanceUpdates',
  ALL_DEPARTMENT_TASKS_COMPLETED: 'clearanceUpdates',
  ALL_CLEARANCES_COMPLETED: 'clearanceUpdates',
  FINAL_HR_CLEARANCE_UPDATE: 'clearanceUpdates',
  FINAL_HR_CLEARANCE_COMPLETED: 'clearanceUpdates',
  CLEARANCE_COMPLETED: 'clearanceUpdates',
  FINANCE_APPROVED: 'clearanceUpdates',
  CLEARANCE_INFORMATION_UPDATED: 'clearanceUpdates',
  IT_ASSET_UPDATED: 'clearanceUpdates',
  stage_started: 'clearanceUpdates',
  dept_completed: 'clearanceUpdates',
  in_progress: 'clearanceUpdates',
  final_review: 'clearanceUpdates',
  final_completed: 'clearanceUpdates',
  CLEARANCE_RETURNED: 'requestReturned',
  CLEARANCE_REQUEST_RETURNED: 'requestReturned',
  ICT_CLEARANCE_RETURNED: 'requestReturned',
  FINANCE_RETURNED: 'requestReturned',
  returned: 'requestReturned',
  REQUEST_RETURNED_TO_FINANCE: 'requestReturned',
  TRANSPORT_CLEARANCE_RETURNED: 'requestReturned',
  CLEARANCE_RESUBMITTED: 'requestResubmitted',
  'Clearance Resubmitted': 'requestResubmitted',
  EMPLOYEE_UPDATED_REQUEST: 'requestResubmitted',
  EMPLOYEE_UPDATED_REQUEST_DEPARTMENT: 'requestResubmitted',
  TRANSPORT_EMPLOYEE_RESUBMISSION: 'requestResubmitted',
  TRANSPORT_CLEARANCE_RESUBMITTED: 'requestResubmitted',
  PENDING_CLEARANCE_REMINDER: 'pendingReviewReminder',
  PENDING_REVIEW_REMINDER: 'pendingReviewReminder',
  PENDING_REMINDER: 'pendingReviewReminder',
  REVIEW_REMINDER: 'pendingReviewReminder',
};

export const getEmployeePreferenceForNotification = (type) => employeePreferenceByType[type] || null;

export const isEmployeeRole = (role) => /^(?:employee|standard user|user)$/i.test(String(role || '').trim());

export const getDisabledEmployeeNotificationTypes = (preferences = {}) => Object.entries(employeePreferenceByType)
  .filter(([, preference]) => preferences[preference] === false)
  .map(([type]) => type);
