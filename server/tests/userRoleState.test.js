import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveUserRoleState, selectActiveRole } from '../utils/userRoleState.js';

test('prefers the active role selected during an existing account update', () => {
  assert.equal(
    selectActiveRole(['Employee', 'Registrar Officer'], ['Registrar Officer', 'Employee']),
    'Registrar Officer',
  );
});

test('preserves the current role if no new active role is selected', () => {
  assert.equal(
    selectActiveRole(['Employee', 'Finance Officer'], ['', 'Finance Officer']),
    'Finance Officer',
  );
});

test('uses the assigned role when older records contain only default employee roles', () => {
  assert.deepEqual(
    resolveUserRoleState({ role: 'Registrar Officer', activeRole: 'Employee', roles: ['Employee'] }),
    { roles: ['Registrar Officer'], activeRole: 'Registrar Officer' },
  );
});

test('preserves a valid active role for users assigned multiple roles', () => {
  assert.deepEqual(
    resolveUserRoleState({
      role: 'Finance Officer',
      activeRole: 'Registrar Officer',
      roles: ['Finance Officer', 'Registrar Officer'],
    }),
    { roles: ['Finance Officer', 'Registrar Officer'], activeRole: 'Registrar Officer' },
  );
});

test('falls back to the primary role when the active role is not assigned', () => {
  assert.deepEqual(
    resolveUserRoleState({
      role: 'Finance Officer',
      activeRole: 'Registrar Officer',
      roles: ['Finance Officer'],
    }),
    { roles: ['Finance Officer'], activeRole: 'Finance Officer' },
  );
});

test('normalizes role-only new users without assigning the employee default', () => {
  assert.deepEqual(
    resolveUserRoleState({ role: 'System Admin' }),
    { roles: ['System Admin'], activeRole: 'System Admin' },
  );
});

test('ignores a stale employee active role when no roles list is stored', () => {
  assert.deepEqual(
    resolveUserRoleState({ role: 'HR Officer', activeRole: 'Employee' }),
    { roles: ['HR Officer'], activeRole: 'HR Officer' },
  );
});
