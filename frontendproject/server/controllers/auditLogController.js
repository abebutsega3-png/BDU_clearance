import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';

const toDateRange = (dateFrom, dateTo) => {
  if (!dateFrom && !dateTo) return undefined;
  const createdAt = {};
  if (dateFrom) createdAt.$gte = new Date(`${dateFrom}T00:00:00`);
  if (dateTo) createdAt.$lte = new Date(`${dateTo}T23:59:59`);
  return createdAt;
};

const formatLog = (log) => ({
  id: log._id,
  date: log.createdAt,
  userId: log.userId?._id || log.userId,
  user: log.userId?.name || 'Unknown user',
  role: log.userId?.role || '-',
  action: log.action,
  module: log.module,
  description: log.description || '',
  ip: log.ipAddress || '',
  userAgent: log.userAgent || '',
  oldValues: log.oldValues,
  newValues: log.newValues,
});

export const getAuditLogs = async (req, res) => {
  try {
    const { user, module, action, dateFrom, dateTo } = req.query;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const where = {};
    if (module) where.module = module;
    if (action) where.action = action;
    const dateRange = toDateRange(dateFrom, dateTo);
    if (dateRange) where.createdAt = dateRange;

    if (user) {
      const users = await User.find({ name: { $regex: user, $options: 'i' } }).select('_id').lean();
      where.userId = { $in: users.map((item) => item._id) };
    }

    const [rows, total, allTimeTotal, todayLogs, uniqueUserIds, actionStats, lastActivity] = await Promise.all([
      AuditLog.find(where).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('userId', 'name role').lean(),
      AuditLog.countDocuments(where),
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
      AuditLog.distinct('userId'),
      AuditLog.aggregate([{ $group: { _id: '$action', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 1 }]),
      AuditLog.findOne().sort({ createdAt: -1 }).lean(),
    ]);

    const mostFrequent = actionStats[0];
    return res.json({
      data: rows.map(formatLog),
      total: allTimeTotal,
      todayLogs,
      uniqueUsers: uniqueUserIds.length,
      mostFrequentAction: mostFrequent?._id || '-',
      mostFrequentActionCount: mostFrequent?.count || 0,
      lastActivity: lastActivity?.createdAt || null,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
};

export const getAuditLogById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid audit log id' });
    const log = await AuditLog.findById(req.params.id).populate('userId', 'name role').lean();
    if (!log) return res.status(404).json({ message: 'Audit log not found' });
    return res.json({ data: formatLog(log) });
  } catch (error) {
    console.error('Get audit log error:', error);
    return res.status(500).json({ message: 'Failed to fetch audit log' });
  }
};

export const exportAuditLogs = async (req, res) => {
  try {
    const { module, action, dateFrom, dateTo } = req.query;
    const where = {};
    if (module) where.module = module;
    if (action) where.action = action;
    const dateRange = toDateRange(dateFrom, dateTo);
    if (dateRange) where.createdAt = dateRange;
    const logs = await AuditLog.find(where).sort({ createdAt: -1 }).populate('userId', 'name role').lean();
    return res.json({ data: logs.map(formatLog) });
  } catch (error) {
    console.error('Export audit logs error:', error);
    return res.status(500).json({ message: 'Failed to export audit logs' });
  }
};
