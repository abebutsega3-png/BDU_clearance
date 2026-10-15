import test from 'node:test';
import assert from 'node:assert/strict';
import { applyHROfficePolicy, getEnabledHROffices, validateHRSettings } from '../utils/hrSettings.js';
import { createClearanceCertificate, shouldAutomaticallyGenerateCertificate } from '../utils/clearanceCertificate.js';

const validSettings = () => ({
	requiredOffices: { departmentHead: true, finance: true, property: true, ict: false, library: true, transport: true },
	finalHrClearanceEnabled: true,
	generateCertificateAfterApproval: true,
	notifications: {
		newClearanceRequest: true,
		clearanceProgressUpdated: true,
		clearanceResubmitted: true,
		allOfficesApproved: true,
		clearanceCompleted: true,
		certificateGenerated: true,
		emailEnabled: true,
		systemNotificationsEnabled: true,
	},
	certificate: { generation: 'Automatic (Recommended)', trigger: 'After HR Approval', numberPrefix: 'BDU-CLR', format: 'PDF' },
	security: { sessionTimeout: '30 minutes', notifyOnNewLogin: true },
});

test('office policy omits disabled offices from new workflow selections', () => {
	const settings = validSettings();
	assert.deepEqual(applyHROfficePolicy([
		'Department Head', 'Finance Office', 'ICT Office', 'Library', 'Final HR Clearance',
	], settings), ['Department Head', 'Finance Office', 'Library', 'Final HR Clearance']);
	assert.equal(getEnabledHROffices({ requiredOffices: settings.requiredOffices, finalHrClearanceEnabled: false })
		.includes('Final HR Clearance'), false);
});

test('HR settings validation rejects invalid timeout and no enabled offices', () => {
	const invalidTimeout = validSettings();
	invalidTimeout.security.sessionTimeout = '5 minutes';
	assert.match(validateHRSettings(invalidTimeout).error, /Session timeout/);

	const noOffices = validSettings();
	Object.keys(noOffices.requiredOffices).forEach((key) => { noOffices.requiredOffices[key] = false; });
	noOffices.finalHrClearanceEnabled = false;
	assert.match(validateHRSettings(noOffices).error, /At least one/);
});

test('automatic certificate policy respects mode and trigger', () => {
	const settings = validSettings();
	assert.equal(shouldAutomaticallyGenerateCertificate(settings, 'After HR Approval'), true);
	assert.equal(shouldAutomaticallyGenerateCertificate(settings, 'After All Offices Approved'), false);
	settings.certificate.generation = 'Manual';
	assert.equal(shouldAutomaticallyGenerateCertificate(settings, 'After HR Approval'), false);
});

test('certificate numbers use the configured prefix', () => {
	const certificate = createClearanceCertificate({ requestId: 'CLR-001', employeeId: 'BDU-01' }, validSettings());
	assert.match(certificate.number, /^BDU-CLR-\d{4}-\d{6}$/);
	assert.equal(certificate.format, 'PDF');
});
