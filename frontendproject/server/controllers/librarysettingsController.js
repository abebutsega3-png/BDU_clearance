import LibraryOfficerSettings from '../models/LibraryOfficerSettings.js';

export const getSettings = async (req, res) => {
  try {
    const { userId } = req.params;

    let settings = await LibraryOfficerSettings.findOne({ userId });

    if (!settings) {
      settings = await LibraryOfficerSettings.create({
        userId,
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

    return res.status(200).json(settings);
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to retrieve settings',
      error: error.message
    });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const { userId } = req.params;
    const { notificationPreferences, displayPreferences, language } = req.body;

    const updatedSettings = await LibraryOfficerSettings.findOneAndUpdate(
      { userId },
      {
        $set: {
          notificationPreferences,
          displayPreferences,
          language
        }
      },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );

    return res.status(200).json({
      message: 'Settings updated successfully',
      settings: updatedSettings
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to update settings',
      error: error.message
    });
  }
};