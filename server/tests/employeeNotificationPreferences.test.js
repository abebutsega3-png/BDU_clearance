import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getDisabledEmployeeNotificationTypes,
  getEmployeePreferenceForNotification,
  isEmployeeRole,
} from '../utils/employeeNotificationPreferences.js';

test('maps employee clearance notification types to their setting', () => {
  assert.equal(getEmployeePreferenceForNotification('CLEARANCE_UPDATED'), 'clearanceUpdates');
  assert.equal(getEmployeePreferenceForNotification('CLEARANCE_REQUEST_RETURNED'), 'requestReturned');
  assert.equal(getEmployeePreferenceForNotification('CLEARANCE_RESUBMITTED'), 'requestResubmitted');
  assert.equal(getEmployeePreferenceForNotification('PENDING_CLEARANCE_REMINDER'), 'pendingReviewReminder');
  assert.equal(getEmployeePreferenceForNotification('SYSTEM_ERROR'), null);
});

test('recognizes employee role aliases supported by employee routes', () => {
  assert.equal(isEmployeeRole('Employee'), true);
  assert.equal(isEmployeeRole('standard user'), true);
  assert.equal(isEmployeeRole('System Admin'), false);
});

test('returns only notification types disabled by the employee', () => {
  const disabledTypes = getDisabledEmployeeNotificationTypes({
    clearanceUpdates: false,
    requestReturned: true,
    requestResubmitted: false,
  });

  assert.ok(disabledTypes.includes('CLEARANCE_UPDATED'));
  assert.ok(disabledTypes.includes('CLEARANCE_RESUBMITTED'));
  assert.ok(disabledTypes.includes('Clearance Resubmitted'));
  assert.ok(!disabledTypes.includes('CLEARANCE_RETURNED'));
});
