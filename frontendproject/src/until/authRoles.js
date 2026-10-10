const normalizeRole = (role) => String(role?.name || role || '')
  .trim()
  .toLowerCase()
  .replace(/[/_&]+/g, ' ')
  .replace(/[-]+/g, ' ')
  .replace(/\s+/g, ' ');

export const canonicalizeRole = (role) => {
  const normalized = normalizeRole(role);

  if (!normalized) return '';

  if (['administrator', 'admin', 'system admin', 'system administrator', 'systemadministrator'].includes(normalized)) return 'admin';
  if (['library', 'librarian', 'library officer'].includes(normalized)) return 'library officer';
  if (normalized.includes('transport') && normalized.includes('officer')) return 'transport officer';
  if (normalized.includes('property') && normalized.includes('officer')) return 'property officer';
  if (normalized.includes('property') && normalized.includes('asset')) return 'property officer';
  if (['asset officer'].includes(normalized)) return 'property officer';
  if (['department head', 'departmen head', 'departmenthead', 'head of department', 'department approver'].includes(normalized)) return 'department head';
  if (['hr', 'hr officer', 'human resource officer', 'human resources officer'].includes(normalized)) return 'hr officer';
  if (['finance officer', 'finanace officer', 'finance office', 'finance'].includes(normalized)) return 'finance officer';
  if (['ict officer', 'ict office', 'ict'].includes(normalized)) return 'ict officer';
  if (normalized.includes('ict') && (normalized.includes('officer') || normalized.includes('office'))) return 'ict officer';
  if (['employee', 'employee user', 'standard user', 'user'].includes(normalized)) return 'employee';

  return normalized;
};

export const getUserRoles = (user) => {
  if (!user) return [];

  const roles = Array.isArray(user.roles)
    ? user.roles
    : Array.isArray(user.role)
      ? user.role
      : [user.activeRole, user.role].filter(Boolean);

  return [...new Set(roles.map((role) => canonicalizeRole(role)).filter(Boolean))];
};

export const getActiveRole = (user) => {
  const userRoles = getUserRoles(user);
  const active = canonicalizeRole(user?.activeRole || user?.currentRole || user?.role);
  if (active) return active;
  return userRoles[0] || '';
};

export const getDashboardPath = (roleOrUser) => {
  const role = typeof roleOrUser === 'object' ? getActiveRole(roleOrUser) : roleOrUser;
  switch (canonicalizeRole(role)) {
    case 'admin':
      return '/admin';
    case 'hr officer':
      return '/hr-office';
    case 'department head':
      return '/department-head';
    case 'finance officer':
      return '/finance-office';
    case 'library officer':
      return '/library-office';
    case 'ict officer':
      return '/ict-office';
    case 'transport officer':
      return '/transport-office';
    case 'property officer':
      return '/property';
    case 'employee':
      return '/employee-dashboard';
    default:
      return null;
  }
};

export const canAccessPathForRole = (path, roleOrUser) => {
  const userRoles = Array.isArray(roleOrUser)
    ? roleOrUser.map((role) => canonicalizeRole(role))
    : getUserRoles(roleOrUser);

  if (!userRoles.length) {
    const dashboardPath = getDashboardPath(roleOrUser);
    return dashboardPath !== null && (path === dashboardPath || path.startsWith(`${dashboardPath}/`));
  }

  return userRoles.some((role) => {
    const dashboardPath = getDashboardPath(role);
    return dashboardPath !== null && (path === dashboardPath || path.startsWith(`${dashboardPath}/`));
  });
};
