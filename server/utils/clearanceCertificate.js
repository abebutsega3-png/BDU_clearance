import { randomInt } from 'node:crypto';

export const createClearanceCertificate = (clearance, hrSettings = {}, issuer = {}) => {
	const prefix = String(hrSettings.certificate?.numberPrefix || 'BDU-CLR').trim();
	const year = new Date().getFullYear();
	const certificate = {
		number: `${prefix}-${year}-${String(randomInt(0, 1_000_000)).padStart(6, '0')}`,
		generatedAt: new Date(),
		generatedBy: clearance.finalHRReviewedBy || issuer.fullName || issuer.name || 'HR Officer',
		generatedById: clearance.finalHRReviewedById || issuer._id || null,
		generatedByPosition: clearance.finalHRReviewedByPosition || issuer.position || issuer.role || 'HR Officer',
		employeeId: clearance.employeeId,
		employeeName: clearance.employeeName,
		requestId: clearance.requestId,
		validFrom: new Date(),
		validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
		format: hrSettings.certificate?.format || 'PDF',
	};
	return certificate;
};

export const shouldAutomaticallyGenerateCertificate = (hrSettings = {}, trigger) => (
	hrSettings.generateCertificateAfterApproval !== false
	&& hrSettings.certificate?.generation === 'Automatic (Recommended)'
	&& hrSettings.certificate?.trigger === trigger
);
