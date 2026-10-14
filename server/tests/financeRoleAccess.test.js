import test from 'node:test';
import assert from 'node:assert/strict';

import { isFinanceOfficer } from '../utils/roleAccess.js';

test('recognizes finance officer role aliases', () => {
  for (const role of ['Finance Officer', 'finance_officer', 'finance-officer', 'Finance']) {
    assert.equal(isFinanceOfficer(role), true, `${role} should be recognized`);
  }
});

test('recognizes Finance Officer in assigned roles when another role is active', () => {
  assert.equal(isFinanceOfficer({
    role: 'Employee',
    activeRole: 'Employee',
    roles: ['Employee', 'Finance Officer'],
  }), true);
});

test('does not authorize unrelated roles as Finance Officers', () => {
  for (const role of ['Employee', 'HR Officer', 'Finance Department', '', null]) {
    assert.equal(isFinanceOfficer(role), false, `${role} should not be recognized`);
  }
});
