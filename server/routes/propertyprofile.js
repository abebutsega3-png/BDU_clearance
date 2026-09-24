import express from 'express';
import User from '../models/User.js';
import Employee from '../models/employee.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

const allowedNotificationKeys = ['newClearanceRequest', 'requestResubmitted', 'employeeInformationUpdated', 'propertyVerificationRequired', 'clearanceApproved', 'clearanceReturned', 'assetReturn', 'actionRequired', 'systemNotification'];
const allowedEmailKeys = ['inSystemNotifications', 'emailNotifications', 'newRequestEmail', 'returnedRequestEmail'];

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
		const allowed = ['fullName', 'email', 'phoneNumber', 'alternativePhone', 'profileImage'];
		const updates = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
		if (updates.fullName !== undefined) {
			updates.name = updates.fullName;
			delete updates.fullName;
		}
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
		if (req.body?.propertyOffice && typeof req.body.propertyOffice === 'object') {
			updates.propertyOffice = Object.fromEntries(Object.entries(req.body.propertyOffice).filter(([key, value]) => ['name', 'email', 'phone', 'campus', 'location'].includes(key) && typeof value === 'string'));
		}
		if (req.body?.notificationPreferences && typeof req.body.notificationPreferences === 'object') {
			updates.notificationPreferences = Object.fromEntries(Object.entries(req.body.notificationPreferences).filter(([key, value]) => allowedNotificationKeys.includes(key) && typeof value === 'boolean'));
		}
		if (req.body?.emailPreferences && typeof req.body.emailPreferences === 'object') {
			updates['propertySettings.emailPreferences'] = Object.fromEntries(Object.entries(req.body.emailPreferences).filter(([key, value]) => allowedEmailKeys.includes(key) && typeof value === 'boolean'));
		}
		if (Array.isArray(req.body?.clearanceChecklist)) {
			updates['propertySettings.clearanceChecklist'] = req.body.clearanceChecklist.filter((item) => item && typeof item.key === 'string' && typeof item.label === 'string').map((item) => ({ key: item.key, label: item.label, enabled: Boolean(item.enabled) }));
		}
		const user = await User.findByIdAndUpdate(req.user._id, updates, { returnDocument: 'after', runValidators: true }).select('-password').lean();
		if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
		if (user.employeeId) {
			const employeeUpdates = {};
			if (req.body?.fullName !== undefined) employeeUpdates.fullName = req.body.fullName;
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