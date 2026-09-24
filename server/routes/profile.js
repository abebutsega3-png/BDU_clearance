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