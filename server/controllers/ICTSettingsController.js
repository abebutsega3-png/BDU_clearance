import UserSettings from '../models/ICTSettings.js';

// 1. Get Current ICT Officer Settings
export const getUserSettings = async (req, res) => {
  try {
    let settings = await UserSettings.findOne({ userId: req.user.id });

    // Generate default preferences if first time setup
    if (!settings) {
      settings = await UserSettings.create({ userId: req.user.id });
    }

    res.status(200).json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Update User Preferences
export const updateUserSettings = async (req, res) => {
  try {
    const allowedSettings = {
      notifications: req.body.notifications,
      appearance: req.body.appearance,
      clearancePreferences: req.body.clearancePreferences,
      security: req.body.security ? { twoFactorAuth: req.body.security.twoFactorAuth } : undefined,
    };
    Object.keys(allowedSettings).forEach((key) => {
      if (allowedSettings[key] === undefined) delete allowedSettings[key];
    });

    const updatedSettings = await UserSettings.findOneAndUpdate(
      { userId: req.user.id },
      { $set: allowedSettings },
      { returnDocument: 'after', upsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'Settings saved successfully',
      settings: updatedSettings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};