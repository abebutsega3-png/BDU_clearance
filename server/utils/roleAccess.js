const normalizeRoleValue = (value) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[_/&-]+/g, ' ')
  .replace(/\s+/g, ' ');

const getRoleCandidates = (user) => {
  if (!user) return [];

  const candidates = [];
  const pushValue = (value) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value.forEach(pushValue);
      return;
    }

    if (typeof value === 'object') {
      pushValue(value.name);
      pushValue(value.role);
      pushValue(value.title);
      return;
    }

    const text = String(value).trim();
    if (text) candidates.push(text);
  };

  pushValue(user.role);
  pushValue(user.activeRole);
  pushValue(user.roles);
  pushValue(user.position);
  return candidates;
};

export const userHasRole = (user, expectedRole) => {
  const target = normalizeRoleValue(expectedRole);
  if (!target) return false;

  return getRoleCandidates(user).some((candidate) => {
    const normalized = normalizeRoleValue(candidate);
    if (!normalized) return false;
    if (normalized === target) return true;

    const targetParts = target.split(' ').filter(Boolean);
    return targetParts.every((part) => normalized.includes(part));
  });
};

export const isTransportOfficer = (user) => userHasRole(user, 'transport officer');

export const isFinanceOfficer = (user) => {
  const financeRoles = new Set(['finance', 'finance officer']);
  const candidates = typeof user === 'string' ? [user] : getRoleCandidates(user);
  return candidates.some((candidate) => financeRoles.has(normalizeRoleValue(candidate)));
};
