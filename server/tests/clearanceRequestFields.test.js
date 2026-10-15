import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveClearanceRequestFields } from '../utils/clearanceRequestFields.js';

test('keeps employee separation type separate from free-text reason', () => {
	assert.deepEqual(resolveClearanceRequestFields({
		clearanceReason: 'Resignation',
		reason: 'hcgcg',
	}), {
		clearanceType: 'Resignation',
		reason: 'hcgcg',
	});
});

test('uses the explicit clearance type before legacy clearance reason', () => {
	assert.deepEqual(resolveClearanceRequestFields({
		clearanceType: 'Retirement',
		clearanceReason: 'Resignation',
		reason: 'Personal reasons',
	}), {
		clearanceType: 'Retirement',
		reason: 'Personal reasons',
	});
});

test('keeps HR-initiated requests compatible with their selected reason', () => {
	assert.deepEqual(resolveClearanceRequestFields({ reason: 'Resignation' }, true), {
		clearanceType: 'Resignation',
		reason: 'Resignation',
	});
});
