import express from 'express';
import LibraryOfficerSettings from '../models/LibraryOfficerSettings.js';

const router = express.Router();

router.get('/:userId', async (req, res) => {
  try {
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

router.put('/:userId', async (req, res) => {
  try {
    const { notificationPreferences, displayPreferences, language } = req.body;

    const updatedSettings = await LibraryOfficerSettings.findOneAndUpdate(
      { userId: req.params.userId },
      {
        $set: {
          notificationPreferences,
          displayPreferences,
          language
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