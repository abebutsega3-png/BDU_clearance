const User = require('../models/propertysetting');
const bcrypt = require('bcryptjs');

// GET /api/users/me -> Fetch current logged-in Property Officer profile & settings
exports.getProfileAndSettings = async (req, res) => {
  try {
    const userId = req.user.id; // Extracted from JWT auth middleware

    // Exclude password field from the query response
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving settings', error: error.message });
  }
};

// PUT /api/users/me/notification-preferences -> Update Notification Preferences
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationPreferences } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { notificationPreferences } },
      { returnDocument: 'after', runValidators: true }
    ).select('-password');

    return res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: updatedUser.notificationPreferences
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update preferences', error: error.message });
  }
};

// PUT /api/users/me/change-password -> Property Officer Security / Password Change
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ success: false, message: 'Please fill in all password fields' });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirm password do not match' });
    }

    const user = await User.findById(userId);

    // Verify current password against hashed password in database
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    // Hash the new password before saving
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to change password', error: error.message });
  }
};