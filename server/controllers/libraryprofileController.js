const UserProfile = require('../models/UserProfile');
const bcrypt = require('bcryptjs');

// 1. Get User Profile Details
exports.getProfile = async (req, res) => {
  try {
    const profile = await UserProfile.findById(req.params.id).select('-password');
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};

// 2. Update Editable Contact Info & Photo
exports.updateProfile = async (req, res) => {
  try {
    const { email, phoneNumber, alternativePhone, profilePhoto } = req.body;

    const updatedProfile = await UserProfile.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          email,
          phoneNumber,
          alternativePhone,
          profilePhoto
        }
      },
      { returnDocument: 'after', runValidators: true }
    ).select('-password');

    res.status(200).json({
      message: 'Profile updated successfully',
      profile: updatedProfile
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

// 3. Change Password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirm password do not match' });
    }

    const user = await UserProfile.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Passwords match check (Bcrypt check)
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    // Salt and Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error changing password', error: error.message });
  }
};