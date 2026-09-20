import test from 'node:test';
import assert from 'node:assert/strict';
import { computeClearanceProgress, getClearanceRequestStatus } from './clearanceProgress.js';

test('computeClearanceProgress excludes Final HR from office progress and shows the returned office as the current stage', () => {
  const request = {
    status: 'Returned',
    returnReason: 'ICT equipment not returned',
    workflow: [
      { office: 'Department Head', status: 'Completed', updatedAt: '2025-01-10T00:00:00Z' },
      { office: 'Finance Office', status: 'Completed', updatedAt: '2025-01-11T00:00:00Z' },
      { office: 'Property / Asset Office', status: 'Completed', updatedAt: '2025-01-12T00:00:00Z' },
      { office: 'ICT Office', status: 'Returned', updatedAt: '2025-01-13T00:00:00Z', returnReason: 'ICT equipment not returned' },
      { office: 'Library', status: 'Pending', updatedAt: '2025-01-14T00:00:00Z' },
      { office: 'Final HR Clearance', status: 'Pending', updatedAt: '2025-01-15T00:00:00Z' },
    ],
  };

  const result = computeClearanceProgress(request);

  assert.equal(result.totalOffices, 5);
  assert.equal(result.progressCount, 3);
  assert.equal(result.percent, 60);
  assert.equal(result.returnedStep.office, 'ICT Office');
  assert.equal(result.returnedStep.returnReason, 'ICT equipment not returned');
  assert.equal(result.returnReason, 'ICT equipment not returned');
  assert.equal(result.currentStage.office, 'ICT Office');
  assert.equal(getClearanceRequestStatus(request, result), 'Returned');
});

test('computeClearanceProgress promotes Final HR Clearance to the current stage only after all five offices are approved', () => {
  const request = {
    status: 'Pending',
    workflow: [
      { office: 'Department Head', status: 'Completed', updatedAt: '2025-01-10T00:00:00Z' },
      { office: 'Finance Office', status: 'Completed', updatedAt: '2025-01-11T00:00:00Z' },
      { office: 'Property / Asset Office', status: 'Completed', updatedAt: '2025-01-12T00:00:00Z' },
      { office: 'ICT Office', status: 'Completed', updatedAt: '2025-01-13T00:00:00Z' },
      { office: 'Library', status: 'Completed', updatedAt: '2025-01-14T00:00:00Z' },
      { office: 'Final HR Clearance', status: 'Pending', updatedAt: '2025-01-15T00:00:00Z' },
    ],
  };

  const result = computeClearanceProgress(request);

  assert.equal(result.totalOffices, 5);
  assert.equal(result.progressCount, 5);
  assert.equal(result.percent, 100);
  assert.equal(result.currentStage.office, 'Final HR Clearance');
  assert.equal(getClearanceRequestStatus(request, result), 'Awaiting Final HR Clearance');
});

test('getClearanceRequestStatus reports completed only after Final HR approval', () => {
  const request = {
    status: 'In Progress',
    workflow: [
      { office: 'Department Head', status: 'Completed' },
      { office: 'Finance Office', status: 'Completed' },
      { office: 'Property / Asset Office', status: 'Completed' },
      { office: 'ICT Office', status: 'Completed' },
      { office: 'Library', status: 'Completed' },
      { office: 'Final HR Clearance', status: 'Completed' },
    ],
  };

  assert.equal(getClearanceRequestStatus(request), 'Completed');
});
