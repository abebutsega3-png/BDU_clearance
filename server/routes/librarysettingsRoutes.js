import express from 'express';
import LibraryOfficerSettings from '../models/LibraryOfficerSettings.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    if (String(req.user._id) !== String(req.params.userId)) return res.status(403).json({ message: 'You can only view your own settings.' });
    let settings = await LibraryOfficerSettings.findOne({ userId: req.params.userId });

    if (!settings) {
      settings = await LibraryOfficerSettings.create({
        userId: req.params.userId,
        notificationPreferences: {
          newClearanceRequest: true,
          returnedResubmitted: true,
          clearanceStatusUpdate: true,
          reportRequest: true
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
    const { notificationPreferences, clearanceChecklist, deliveryPreferences } = req.body;

    const updatedSettings = await LibraryOfficerSettings.findOneAndUpdate(
      { userId: req.params.userId },
      {
        $set: {
          notificationPreferences,
          clearanceChecklist,
          deliveryPreferences
        }
      },
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