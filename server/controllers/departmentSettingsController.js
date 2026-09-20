import User from '../models/User.js';

const defaultSettings = {
  notificationPreferences: {
    emailNotifications: true,
    newClearanceRequest: true,
    requestResubmitted: true,
    pendingReviewReminder: true,
    hrClearanceUpdate: true,
    importantUpdates: true,
    inSystemNewRequest: true,
    inSystemRequestResubmitted: true,
  },
  displayPreferences: { theme: 'system', language: 'English' },
};

export const getDepartmentSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPreferences displayPreferences').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, settings: {
      notificationPreferences: { ...defaultSettings.notificationPreferences, ...user.notificationPreferences },
      displayPreferences: { ...defaultSettings.displayPreferences, ...user.displayPreferences },
    }});
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load settings.', error: error.message });
  }
};

export const updateDepartmentSettings = async (req, res) => {
  try {
    const notificationKeys = Object.keys(defaultSettings.notificationPreferences);
    const preferences = Object.fromEntries(notificationKeys
      .filter((key) => typeof req.body?.notificationPreferences?.[key] === 'boolean')
      .map((key) => [key, req.body.notificationPreferences[key]]));
    const display = req.body?.displayPreferences || {};
    const updates = {
      notificationPreferences: preferences,
      displayPreferences: {
        theme: ['system', 'light', 'dark'].includes(display.theme) ? display.theme : 'system',
        language: typeof display.language === 'string' && display.language ? display.language : 'English',
      },
    };
    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { returnDocument: 'after', runValidators: true })
      .select('notificationPreferences displayPreferences').lean();
    res.json({ success: true, message: 'Settings saved successfully.', settings: user });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Unable to save settings.', error: error.message });
  }
};