const normalizeRole = (role) => String(role?.name || role || '')
  .trim()
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .toLowerCase()
  .replace(/[/_&-]+/g, ' ')
  .replace(/\s+/g, ' ');

const departmentHeadAliases = new Set([
  'department head',
  'departmenthead',
  'departmen head',
  'head of department',
  'department approver',
]);

export const isDepartmentHead = (roleOrUser) => {
  const roles = roleOrUser && typeof roleOrUser === 'object'
    ? [
      roleOrUser.role,
      roleOrUser.activeRole,
      ...(Array.isArray(roleOrUser.roles) ? roleOrUser.roles : []),
    ]
    : [roleOrUser];

  return roles.some((role) => departmentHeadAliases.has(normalizeRole(role)));
};
