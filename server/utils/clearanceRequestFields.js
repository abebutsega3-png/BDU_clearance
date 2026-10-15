export const resolveClearanceRequestFields = (body = {}, initiatedByHR = false) => {
	const reason = String(
		body.reason || (initiatedByHR ? body.clearanceReason : '') || '',
	).trim();
	const clearanceType = String(
		body.clearanceType
			|| body.clearanceReason
			|| (initiatedByHR ? reason : '')
			|| 'Resignation',
	).trim();

	return { clearanceType, reason };
};
