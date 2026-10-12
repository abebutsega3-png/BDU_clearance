import test from 'node:test';
import assert from 'node:assert/strict';

import { isDepartmentHead } from '../utils/roleHelpers.js';

test('recognizes department head role aliases used by dashboard routing', () => {
  for (const role of ['Department Head', 'DepartmentHead', 'Head of Department', 'Department Approver', 'Departmen Head']) {
    assert.equal(isDepartmentHead(role), true, `${role} should be recognized`);
  }
});

test('does not grant department head access to other roles', () => {
  for (const role of ['HR Officer', 'Department', 'Employee', '', null]) {
    assert.equal(isDepartmentHead(role), false, `${role} should not be recognized`);
  }
});

test('recognizes Department Head when it is one of the user assigned roles', () => {
  assert.equal(isDepartmentHead({
    role: 'Employee',
    activeRole: 'Employee',
    roles: ['Employee', 'Department Head'],
  }), true);
});

test('does not grant Department Head access based on unrelated assigned roles', () => {
  assert.equal(isDepartmentHead({
    role: 'HR Officer',
    activeRole: 'HR Officer',
    roles: ['HR Officer', 'Finance Officer'],
  }), false);
});
