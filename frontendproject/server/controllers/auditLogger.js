import AuditLog from '../models/AuditLog.js';

export const recordAuditLog = async ({
  req,
  user,
  action,
  module,
  description,
  oldValues = null,
  newValues = null,
}) => {
  try {
    const actor = user || req?.user || null;
    const normalizedAction = String(action || 'SYSTEM_ACTION').trim().toUpperCase();

    await AuditLog.create({
      userId: actor?._id || null,
      actorRole: actor?.role || 'System',
      action: normalizedAction,
      module: module || 'System',
      description: description || '',
      ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || '',
      userAgent: req?.get?.('user-agent') || '',
      oldValues,
      newValues,
    });
  } catch (error) {
    console.warn(`Unable to record audit log for ${action || 'SYSTEM_ACTION'}:`, error.message);
  }
};
