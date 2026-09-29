import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_REQUIRED_OFFICES,
  normalizeRequiredOffices,
  buildRequiredOfficeWorkflow,
  getCurrentResponsibleOffice,
  getResponsibleOffices,
  areAllRequiredOfficesCleared,
  resolveNextStepAfterDecision,
  isRequestVisibleToOffice,
} from '../utils/clearanceWorkflow.js';
import { resetTransportReviewForResubmission } from '../utils/transportClearance.js';


test('default set includes every office in the employee clearance workflow in the required order', () => {
  assert.deepEqual(DEFAULT_REQUIRED_OFFICES, [
    'Department Head',
    'Finance Office',
    'Library',
    'Property / Asset Office',
    'ICT Office',
    'Transport Office',
    'Final HR Clearance',
  ]);
});

test('normalizeRequiredOffices preserves selected offices and removes duplicates', () => {
  const offices = ['department head', 'Finance Office', 'Property / Asset Office', 'Finance Office', 'library'];

  assert.deepEqual(normalizeRequiredOffices(offices), [
    'Department Head',
    'Finance Office',
    'Property / Asset Office',
    'Library',
  ]);
});

test('buildRequiredOfficeWorkflow creates pending workflow entries for each office', () => {
  const workflow = buildRequiredOfficeWorkflow(['Library', 'Finance Office', 'ICT Office']);

  assert.deepEqual(workflow, [
    { office: 'Library', status: 'Pending', updatedAt: workflow[0].updatedAt },
    { office: 'Finance Office', status: 'Pending', updatedAt: workflow[1].updatedAt },
    { office: 'ICT Office', status: 'Pending', updatedAt: workflow[2].updatedAt },
  ]);
});

test('current step resolves to the first incomplete office in workflow order', () => {
  const workflow = [
    { office: 'Department Head', status: 'Completed' },
    { office: 'Library', status: 'Completed' },
    { office: 'Finance Office', status: 'In Progress' },
    { office: 'Property / Asset Office', status: 'Pending' },
    { office: 'ICT Office', status: 'Pending' },
  ];

  assert.equal(getCurrentResponsibleOffice({ workflow }), 'Finance Office');
});

test('progression moves to the next office after an approval and resets to employee after a return', () => {
  assert.equal(resolveNextStepAfterDecision('Department Head', 'Approved'), 'Finance Office');
  assert.equal(resolveNextStepAfterDecision('Library', 'Completed'), 'Property / Asset Office');
  assert.equal(resolveNextStepAfterDecision('ICT Office', 'Approved'), 'Transport Office');
  assert.equal(resolveNextStepAfterDecision('Finance Office', 'Returned'), 'Employee');
});

test('starting review keeps the request assigned to the current office', () => {
  assert.equal(resolveNextStepAfterDecision('Library', 'In Progress'), 'Library');
});

test('Property Office cannot see a request before Department Head approval', () => {
  assert.equal(isRequestVisibleToOffice({ departmentStatus: 'Pending', currentStep: 'Property / Asset Office' }, 'Property / Asset Office'), false);
  assert.equal(isRequestVisibleToOffice({ departmentStatus: 'Approved', currentStep: 'Property / Asset Office' }, 'Property / Asset Office'), true);
});

test('Property Office sees a request immediately after Department Head approval', () => {
  assert.equal(isRequestVisibleToOffice({ departmentStatus: 'Approved', currentStep: 'Library' }, 'Property / Asset Office'), true);
});

test('department approval dispatches every office in parallel', () => {
  assert.deepEqual(getResponsibleOffices({
    departmentStatus: 'Approved',
    requiredOffices: ['Department Head', 'Finance Office', 'Library', 'Property / Asset Office', 'ICT Office'],
    workflow: [
      { office: 'Finance Office', status: 'Pending' },
      { office: 'Library', status: 'Pending' },
      { office: 'Property / Asset Office', status: 'Pending' },
      { office: 'ICT Office', status: 'Pending' },
    ],
  }), ['Finance Office', 'Library', 'Property / Asset Office', 'ICT Office']);
});

test('department approval also dispatches configured other required offices', () => {
  assert.deepEqual(getResponsibleOffices({
    departmentStatus: 'Approved',
    requiredOffices: ['Department Head', 'Finance Office', 'ICT Office', 'Security Office', 'Other Required Office', 'Final HR Clearance'],
    workflow: [
      { office: 'Finance Office', status: 'Pending' },
      { office: 'ICT Office', status: 'Pending' },
      { office: 'Security Office', status: 'Pending' },
      { office: 'Other Required Office', status: 'Pending' },
    ],
  }), ['Finance Office', 'ICT Office', 'Security Office', 'Other Required Office']);
});

test('ICT and Transport are dispatched immediately and final HR waits for every office', () => {
  const workflow = [
    { office: 'Finance Office', status: 'Completed' },
    { office: 'Library', status: 'Completed' },
    { office: 'Property / Asset Office', status: 'Completed' },
    { office: 'ICT Office', status: 'Pending' },
    { office: 'Transport Office', status: 'Pending' },
  ];

  assert.deepEqual(getResponsibleOffices({ departmentStatus: 'Approved', workflow }), ['ICT Office', 'Transport Office']);
  assert.equal(areAllRequiredOfficesCleared({ departmentStatus: 'Approved', workflow }), false);
  workflow[3].status = 'Completed';
  assert.equal(areAllRequiredOfficesCleared({ departmentStatus: 'Approved', workflow }), false);
  workflow[4].status = 'Completed';
  assert.equal(areAllRequiredOfficesCleared({ departmentStatus: 'Approved', workflow }), true);
  assert.deepEqual(getResponsibleOffices({ departmentStatus: 'Approved', workflow }), ['Final HR Clearance']);
});

test('a returned office remains responsible for the employee resubmission', () => {
  assert.deepEqual(getResponsibleOffices({
    departmentStatus: 'Approved',
    workflow: [
      { office: 'Finance Office', status: 'Returned' },
      { office: 'Library', status: 'Completed' },
      { office: 'Property / Asset Office', status: 'Pending' },
    ],
  }), ['Finance Office']);
});

test('Transport resubmission resets all checklist items and prior review metadata', () => {
  const review = resetTransportReviewForResubmission({
    hasAssignedVehicle: true,
    vehicleReturned: 'Cleared',
    vehicleKeysReturned: 'Cleared',
    noOutstandingIssue: 'Pending',
    status: 'Returned',
    reviewedBy: 'Transport Officer',
    reviewedAt: new Date('2026-01-01T00:00:00.000Z'),
    officerNotes: 'Old review',
    returnReason: 'Keys missing',
  });

  assert.equal(review.hasAssignedVehicle, true);
  assert.equal(review.status, 'Pending');
  assert.equal(review.vehicleReturned, 'Pending');
  assert.equal(review.vehicleKeysReturned, 'Pending');
  assert.equal(review.noOutstandingIssue, 'Pending');
  assert.equal(review.reviewedBy, '');
  assert.equal(review.reviewedAt, null);
  assert.equal(review.officerNotes, '');
  assert.equal(review.returnReason, '');
});

test('Library Office can view requests using the legacy office label', () => {
  assert.equal(isRequestVisibleToOffice({ currentStep: 'Library Office' }, 'Library'), true);
});
