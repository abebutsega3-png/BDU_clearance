import express from 'express';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Employee from '../models/employee.js';
import authMiddleware from '../middleware/authMiddleware.js';
const router = express.Router();

// Get User Profile
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    if (String(req.user._id) !== String(req.params.id)) return res.status(403).json({ message: 'You can only view your own profile.' });
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const employee = user.employeeId ? await Employee.findOne({ employeeId: user.employeeId }).lean() : null;
    const userData = user.toObject();
    const data = { ...employee, ...userData };
    if (!userData.position) data.position = employee?.position || '';
    if (!userData.department) data.department = employee?.department || '';
    if (!userData.campus) data.campus = employee?.campus || '';
    if (!userData.phoneNumber) data.phoneNumber = employee?.phone || '';
    if (!userData.email) data.email = employee?.email || '';
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Profile Details
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (String(req.user._id) !== String(req.params.id)) return res.status(403).json({ message: 'You can only update your own profile.' });
    const allowedFields = ['name', 'email', 'phoneNumber', 'alternativePhone', 'gender', 'dateOfBirth', 'profileImage', 'campus'];
    const updates = Object.fromEntries(Object.entries(req.body || {}).filter(([field]) => allowedFields.includes(field)));
    const updatedUser = await User.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after', runValidators: true }).select('-password');
    res.json({ success: true, data: updatedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const settingsDefaults = {
  notificationPreferences: {
    emailNotifications: true,
    clearanceUpdates: true,
    requestReturned: true,
    requestResubmitted: true,
    pendingReviewReminder: true,
  },
  displayPreferences: {
    theme: 'light',
    language: 'English',
    itemsPerPage: 20,
  },
};

router.get('/:id/settings', authMiddleware, async (req, res) => {
  if (String(req.user._id) !== String(req.params.id)) {
    return res.status(403).json({ success: false, message: 'You can only view your own settings.' });
  }

  try {
    const user = await User.findById(req.params.id)
      .select('notificationPreferences displayPreferences')
      .lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    return res.json({
      success: true,
      settings: {
        notificationPreferences: {
          ...settingsDefaults.notificationPreferences,
          ...user.notificationPreferences,
        },
        displayPreferences: {
          ...settingsDefaults.displayPreferences,
          ...user.displayPreferences,
        },
      },
    });
  } catch (error) {
    console.error('Unable to load user settings:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load settings.' });
  }
});

router.put('/:id/settings', authMiddleware, async (req, res) => {
  if (String(req.user._id) !== String(req.params.id)) {
    return res.status(403).json({ success: false, message: 'You can only update your own settings.' });
  }

  const notifications = req.body?.notificationPreferences;
  const display = req.body?.displayPreferences;
  const notificationKeys = Object.keys(settingsDefaults.notificationPreferences);
  const updates = {};

  if (notifications !== undefined) {
    if (!notifications || typeof notifications !== 'object' || Array.isArray(notifications)) {
      return res.status(400).json({ success: false, message: 'Notification preferences must be an object.' });
    }
    for (const key of notificationKeys) {
      if (notifications[key] !== undefined) {
        if (typeof notifications[key] !== 'boolean') {
          return res.status(400).json({ success: false, message: `${key} must be a boolean.` });
        }
        updates[`notificationPreferences.${key}`] = notifications[key];
      }
    }
  }

  if (display !== undefined) {
    if (!display || typeof display !== 'object' || Array.isArray(display)) {
      return res.status(400).json({ success: false, message: 'Display preferences must be an object.' });
    }
    if (display.theme !== undefined) {
      if (!['system', 'light', 'dark'].includes(display.theme)) {
        return res.status(400).json({ success: false, message: 'Theme must be system, light, or dark.' });
      }
      updates['displayPreferences.theme'] = display.theme;
    }
    if (display.language !== undefined) {
      if (!['English', 'Amharic'].includes(display.language)) {
        return res.status(400).json({ success: false, message: 'Language must be English or Amharic.' });
      }
      updates['displayPreferences.language'] = display.language;
    }
    if (display.itemsPerPage !== undefined) {
      if (![10, 20, 50, 100].includes(display.itemsPerPage)) {
        return res.status(400).json({ success: false, message: 'Items per page must be 10, 20, 50, or 100.' });
      }
      updates['displayPreferences.itemsPerPage'] = display.itemsPerPage;
    }
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { returnDocument: 'after', runValidators: true },
    ).select('notificationPreferences displayPreferences').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    return res.json({
      success: true,
      message: 'Settings saved successfully.',
      settings: {
        notificationPreferences: {
          ...settingsDefaults.notificationPreferences,
          ...user.notificationPreferences,
        },
        displayPreferences: {
          ...settingsDefaults.displayPreferences,
          ...user.displayPreferences,
        },
      },
    });
  } catch (error) {
    console.error('Unable to save user settings:', error.message);
    return res.status(400).json({ success: false, message: 'Unable to save settings.' });
  }
});

router.patch('/:id/password', authMiddleware, async (req, res) => {
  try {
    if (String(req.user._id) !== String(req.params.id)) return res.status(403).json({ message: 'You can only change your own password.' });
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!currentPassword || !newPassword || newPassword.length < 6) return res.status(400).json({ message: 'A current password and a new password of at least 6 characters are required.' });
    if (!(await bcrypt.compare(currentPassword, user.password))) return res.status(400).json({ message: 'Current password is incorrect.' });
    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordChangedAt = new Date();
    await user.save();
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to change password.', error: error.message });
  }
});

export default router;