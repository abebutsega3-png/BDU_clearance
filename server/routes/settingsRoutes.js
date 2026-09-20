import express from 'express';
import SystemSettings from '../models/SystemSettings.js';
import { recordAuditLog } from '../controllers/auditLogger.js';
const router = express.Router();

// Get Settings
router.get('/', async (req, res) => {
  try {
    let settings = await SystemSettings.findOne();
    if (!settings) settings = await SystemSettings.create({});
    res.status(200).json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update Settings Section
router.put('/:section', async (req, res) => {
  try {
    const { section } = req.params;
    let settings = await SystemSettings.findOne();
    if (!settings) settings = new SystemSettings();

    settings[section] = { ...settings[section], ...req.body };
    await settings.save();

    await recordAuditLog({
      req,
      user: req.user,
      action: 'UPDATE_SYSTEM_SETTINGS',
      module: 'System Settings',
      description: `Updated ${section} system settings.`,
      oldValues: { section, previous: settings[section] },
      newValues: { section, current: req.body },
    });

    res.status(200).json({ success: true, message: `${section} settings updated successfully`, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;