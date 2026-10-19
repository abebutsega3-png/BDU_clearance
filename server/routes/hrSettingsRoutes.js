import express from 'express';
import multer from 'multer';
import SystemSettings from '../models/SystemSettings.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { recordAuditLog } from '../controllers/auditLogger.js';
import { validateHRSettings } from '../utils/hrSettings.js';

const router = express.Router();
const stampUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
}).single('stamp');

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

router.post('/official-stamp', (req, res, next) => {
  stampUpload(req, res, (error) => {
    if (!error) return next();
    const tooLarge = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE';
    return res.status(tooLarge ? 413 : 400).json({
      success: false,
      message: tooLarge ? 'The official stamp must be 2 MB or smaller.' : error.message,
    });
  });
}, async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ success: false, message: 'Choose a PNG or JPEG stamp image to upload.' });
  }

  const isPng = file.mimetype === 'image/png'
    && file.buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = file.mimetype === 'image/jpeg'
    && file.buffer[0] === 0xff
    && file.buffer[1] === 0xd8
    && file.buffer[2] === 0xff;
  if (!isPng && !isJpeg) {
    return res.status(415).json({ success: false, message: 'Only valid PNG or JPEG stamp images are supported.' });
  }

  try {
    let settings = await SystemSettings.findOne();
    if (!settings) settings = new SystemSettings();
    const previousStampExists = Boolean(settings.hrSettings?.officialStamp);
    settings.set('hrSettings.officialStamp', `data:${file.mimetype};base64,${file.buffer.toString('base64')}`);
    await settings.save();

    await recordAuditLog({
      req,
      user: req.user,
      action: 'UPDATE_HR_OFFICIAL_STAMP',
      module: 'HR Settings',
      description: 'Uploaded the HR official certificate stamp.',
      oldValues: { officialStampConfigured: previousStampExists },
      newValues: { officialStampConfigured: true, mimeType: file.mimetype },
    });

    return res.status(200).json({
      success: true,
      message: 'Official stamp uploaded successfully.',
      officialStamp: settings.hrSettings.officialStamp,
    });
  } catch (error) {
    console.error('Unable to save the HR official stamp:', error);
    return res.status(500).json({ success: false, message: 'Unable to save the official stamp.' });
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
    settings.set('hrSettings', {
      ...validation.value,
      officialStamp: settings.hrSettings?.officialStamp || '',
    });
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
