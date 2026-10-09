import express from 'express';
import LibraryOfficerSettings from '../models/LibraryOfficerSettings.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

const generalSettingKeys = ['libraryName', 'officeName', 'contactEmail', 'phoneNumber', 'location'];
const clearanceRuleKeys = ['checkUnreturnedBooks', 'checkOverdueBooks', 'checkOutstandingFines', 'checkLostDamagedBooks', 'requireChecklistCompletion'];
const notificationKeys = ['newClearanceRequest', 'resubmittedClearance', 'clearanceStatusUpdated'];
const deliveryKeys = ['inSystemNotifications', 'emailNotifications'];
const checklistKeys = ['borrowedBooksChecked', 'unreturnedBooksChecked', 'outstandingMaterialsChecked', 'lostDamagedMaterialsChecked', 'libraryAccountChecked'];

const booleanSettings = (value, allowedKeys) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.some(([key, setting]) => !allowedKeys.includes(key) || typeof setting !== 'boolean')) return null;
  return Object.fromEntries(entries);
};

const stringSettings = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.some(([key, setting]) => !generalSettingKeys.includes(key) || typeof setting !== 'string')) return null;
  const settings = Object.fromEntries(entries.map(([key, setting]) => [key, setting.trim()]));
  if (settings.libraryName !== undefined && !settings.libraryName) return null;
  if (settings.officeName !== undefined && !settings.officeName) return null;
  if (settings.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contactEmail)) return null;
  return settings;
};

router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    if (String(req.user._id) !== String(req.params.userId)) return res.status(403).json({ message: 'You can only view your own settings.' });
    let settings = await LibraryOfficerSettings.findOne({ userId: req.params.userId });

    if (!settings) {
      settings = await LibraryOfficerSettings.create({
        userId: req.params.userId,
        generalSettings: {
          libraryName: 'Bahir Dar University Library',
          officeName: 'Library Office'
        },
        clearanceRules: {
          checkUnreturnedBooks: true,
          checkOverdueBooks: true,
          checkOutstandingFines: true,
          checkLostDamagedBooks: true,
          requireChecklistCompletion: true
        },
        notificationPreferences: {
          newClearanceRequest: true,
          resubmittedClearance: true,
          clearanceStatusUpdated: true
        },
        displayPreferences: {
          itemsPerPage: 10,
          defaultRequestFilter: 'Pending'
        },
        language: 'English'
      });
    }

    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching settings', error: error.message });
  }
});

router.put('/:userId', authMiddleware, async (req, res) => {
  try {
    if (String(req.user._id) !== String(req.params.userId)) return res.status(403).json({ message: 'You can only update your own settings.' });
    const updates = {};
    const sections = [
      ['generalSettings', stringSettings],
      ['clearanceRules', (value) => booleanSettings(value, clearanceRuleKeys)],
      ['notificationPreferences', (value) => booleanSettings(value, notificationKeys)],
      ['clearanceChecklist', (value) => booleanSettings(value, checklistKeys)],
      ['deliveryPreferences', (value) => booleanSettings(value, deliveryKeys)]
    ];
    for (const [section, validator] of sections) {
      if (req.body?.[section] === undefined) continue;
      const settings = validator(req.body[section]);
      if (!settings || Object.keys(settings).length !== Object.keys(req.body[section]).length) {
        return res.status(400).json({ message: `Invalid ${section} settings.` });
      }
      for (const [key, value] of Object.entries(settings)) updates[`${section}.${key}`] = value;
    }
    if (!Object.keys(updates).length) return res.status(400).json({ message: 'No valid settings were provided.' });

    const updatedSettings = await LibraryOfficerSettings.findOneAndUpdate(
      { userId: req.params.userId },
      { $set: updates },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );

    res.status(200).json({
      message: 'Preferences updated successfully',
      settings: updatedSettings
    });
  } catch (error) {
    res.status(500).json({ message: 'Error saving settings', error: error.message });
  }
});

export default router;