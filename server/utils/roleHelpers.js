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

export const isDepartmentHead = (role) => departmentHeadAliases.has(normalizeRole(role));
