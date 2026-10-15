import express from 'express';
import SystemSettings from '../models/SystemSettings.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { recordAuditLog } from '../controllers/auditLogger.js';
import { validateHRSettings } from '../utils/hrSettings.js';

const router = express.Router();

const isHROfficer = (user) => [
  user?.role,
  user?.activeRole,
  ...(Array.isArray(user?.roles) ? user.roles : []),
].some((role) => ['hr', 'hr officer', 'human resources']
  .includes(String(role?.name || role || '').toLowerCase().replace(/[_-]+/g, ' ').trim()));

router.use(authMiddleware, (req, res, next) => {
  if (!isHROfficer(req.user)) {
    return res.status(403).json({ success: false, message: 'Only HR Officers can access HR settings.' });
  }
  return next();
});

router.get('/', async (req, res) => {
  try {
    let settings = await SystemSettings.findOne();
    if (!settings) settings = await SystemSettings.create({});
    return res.status(200).json({ success: true, settings: settings.hrSettings });
  } catch (error) {
    console.error('Unable to load HR settings:', error);
    return res.status(500).json({ success: false, message: 'Unable to load HR settings.' });
  }
});

router.put('/', async (req, res) => {
  const validation = validateHRSettings(req.body);
  if (validation.error) {
    return res.status(400).json({ success: false, message: validation.error });
  }

  try {
    let settings = await SystemSettings.findOne();
    if (!settings) settings = new SystemSettings();
    const previous = settings.hrSettings?.toObject?.() || settings.hrSettings || {};
    settings.set('hrSettings', validation.value);
    await settings.save();

    await recordAuditLog({
      req,
      user: req.user,
      action: 'UPDATE_HR_SETTINGS',
      module: 'HR Settings',
      description: 'Updated HR clearance workflow, notification, certificate, and security settings.',
      oldValues: previous,
      newValues: validation.value,
    });

    return res.status(200).json({
      success: true,
      message: 'HR Settings updated successfully.',
      settings: settings.hrSettings,
    });
  } catch (error) {
    console.error('Unable to save HR settings:', error);
    return res.status(500).json({ success: false, message: 'Unable to save HR settings.' });
  }
});

export default router;
