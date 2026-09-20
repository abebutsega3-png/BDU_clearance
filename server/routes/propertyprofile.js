import express from 'express';
import User from '../models/User.js';
import Employee from '../models/employee.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/me', authMiddleware, async (req, res) => {
	try {
		const user = await User.findById(req.user._id).select('-password').lean();
		if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
		const employee = user.employeeId ? await Employee.findOne({ employeeId: user.employeeId }).lean() : null;
		return res.json({ success: true, profile: { ...employee, ...user } });
	} catch (error) {
		return res.status(500).json({ success: false, message: 'Unable to load profile.', error: error.message });
	}
});

router.put('/me', authMiddleware, async (req, res) => {
	try {
		const allowed = ['email', 'phoneNumber', 'alternativePhone', 'profileImage'];
		const updates = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
		if (req.body?.notificationPreferences && typeof req.body.notificationPreferences === 'object') {
			updates.notificationPreferences = Object.fromEntries(
				Object.entries(req.body.notificationPreferences).filter(([key, value]) =>
					['emailNotifications', 'newClearanceRequest', 'requestResubmitted', 'pendingReviewReminder', 'hrClearanceUpdate', 'importantUpdates', 'inSystemNewRequest', 'inSystemRequestResubmitted', 'assetReturn', 'actionRequired', 'systemNotification'].includes(key)
					&& typeof value === 'boolean'
				)
			);
		}
		if (req.body?.displayPreferences && typeof req.body.displayPreferences === 'object') {
			updates.displayPreferences = Object.fromEntries(
				Object.entries(req.body.displayPreferences).filter(([key, value]) =>
					(key === 'theme' && ['system', 'light', 'dark'].includes(value)) || (key === 'language' && typeof value === 'string')
				)
			);
		}
		const user = await User.findByIdAndUpdate(req.user._id, updates, { returnDocument: 'after', runValidators: true }).select('-password').lean();
		if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
		if (user.employeeId) {
			const employeeUpdates = {};
			if (updates.email !== undefined) employeeUpdates.email = updates.email;
			if (updates.phoneNumber !== undefined) employeeUpdates.phone = updates.phoneNumber;
			if (updates.alternativePhone !== undefined) employeeUpdates.alternativePhone = updates.alternativePhone;
			if (Object.keys(employeeUpdates).length) await Employee.findOneAndUpdate({ employeeId: user.employeeId }, employeeUpdates);
		}
		const employee = user.employeeId ? await Employee.findOne({ employeeId: user.employeeId }).lean() : null;
		return res.json({ success: true, profile: { ...employee, ...user } });
	} catch (error) {
		return res.status(400).json({ success: false, message: 'Unable to update profile.', error: error.message });
	}
});

export default router;