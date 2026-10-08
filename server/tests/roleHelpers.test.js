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
