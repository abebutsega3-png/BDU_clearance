const normalizeRole = (role) => String(role || '').trim();

export const selectActiveRole = (roles, preferredRoles = []) => {
  const availableRoles = [...new Set((Array.isArray(roles) ? roles : []).map(normalizeRole).filter(Boolean))];
  for (const preferredRole of preferredRoles) {
    const match = availableRoles.find(
      (assignedRole) => assignedRole.toLowerCase() === normalizeRole(preferredRole).toLowerCase(),
    );
    if (match) return match;
  }

  return availableRoles[0] || 'Employee';
};

export const resolveUserRoleState = (user) => {
  const role = normalizeRole(user?.role);
  const activeRole = normalizeRole(user?.activeRole);
  const storedRoles = Array.isArray(user?.roles)
    ? [...new Set(user.roles.map(normalizeRole).filter(Boolean))]
    : [];
  const hasLegacyEmployeeDefaults = storedRoles.length === 1
    && storedRoles[0].toLowerCase() === 'employee'
    && role
    && role.toLowerCase() !== 'employee'
    && (!activeRole || activeRole.toLowerCase() === 'employee');
  const hasDefaultEmployeeActiveRole = activeRole.toLowerCase() === 'employee'
    && role
    && role.toLowerCase() !== 'employee';
  const roles = hasLegacyEmployeeDefaults
    ? [role]
    : storedRoles.length
      ? storedRoles
      : [hasDefaultEmployeeActiveRole ? role : activeRole || role || 'Employee'];
  const isAssignedRole = (candidate) => roles.find(
    (assignedRole) => assignedRole.toLowerCase() === candidate.toLowerCase(),
  );
  const resolvedActiveRole = (hasDefaultEmployeeActiveRole ? '' : isAssignedRole(activeRole))
    || isAssignedRole(role)
    || roles[0]
    || 'Employee';

  return { roles, activeRole: resolvedActiveRole };
};
