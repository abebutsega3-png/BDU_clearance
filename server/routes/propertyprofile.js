import express from 'express';
import User from '../models/User.js';
import Employee from '../models/employee.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

const allowedNotificationKeys = ['newClearanceRequest', 'requestResubmitted', 'employeeInformationUpdated', 'propertyVerificationRequired', 'clearanceApproved', 'clearanceReturned', 'assetReturn', 'actionRequired', 'systemNotification'];
const allowedEmailKeys = ['inSystemNotifications', 'emailNotifications', 'newRequestEmail', 'returnedRequestEmail', 'assetReturnEmail', 'clearanceApprovedEmail', 'clearanceReturnedEmail', 'systemNotificationEmail'];

router.post('/logout-all-devices', authMiddleware, async (req, res) => {
	try {
		const user = await User.findByIdAndUpdate(
			req.user._id,
			{ $inc: { tokenVersion: 1 } },
			{ new: true }
		).select('_id name role');
		if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
		return res.json({ success: true, message: 'All sessions have been signed out.' });
	} catch (error) {
		console.error('Unable to sign out all property officer sessions:', error);
		return res.status(500).json({ success: false, message: 'Unable to sign out all devices.' });
	}
});

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
		const propertySettings = req.body?.propertySettings;
		if (propertySettings?.clearanceRules && typeof propertySettings.clearanceRules === 'object') {
			const rules = propertySettings.clearanceRules;
			const clearanceRules = {};
			if (typeof rules.requireNoOutstandingAssets === 'boolean') clearanceRules.requireNoOutstandingAssets = rules.requireNoOutstandingAssets;
			if (typeof rules.requireOfficerComment === 'boolean') clearanceRules.requireOfficerComment = rules.requireOfficerComment;
			if (Object.keys(clearanceRules).length) updates['propertySettings.clearanceRules'] = clearanceRules;
		}
		const clearanceChecklist = propertySettings?.clearanceChecklist ?? req.body?.clearanceChecklist;
		if (Array.isArray(clearanceChecklist)) {
			updates['propertySettings.clearanceChecklist'] = clearanceChecklist
				.filter((item) => item && typeof item.key === 'string' && typeof item.label === 'string')
				.map((item) => ({ key: item.key.slice(0, 80), label: item.label.slice(0, 120), enabled: Boolean(item.enabled) }));
		}
		if (Array.isArray(propertySettings?.assetCategories)) {
			if (propertySettings.assetCategories.some((item) =>
				!item
				|| typeof item.name !== 'string'
				|| !item.name.trim()
				|| typeof item.categoryCode !== 'string'
				|| !/^[A-Z0-9_-]{2,20}$/i.test(item.categoryCode.trim())
			)) {
				return res.status(400).json({ success: false, message: 'Every asset category needs a name and a valid code (2-20 letters, numbers, hyphens, or underscores).' });
			}
			const categories = propertySettings.assetCategories.map((item) => ({
					name: item.name.trim().slice(0, 100),
					categoryCode: item.categoryCode.trim().toUpperCase(),
					description: typeof item.description === 'string' ? item.description.trim().slice(0, 240) : '',
					enabled: typeof item.enabled === 'boolean' ? item.enabled : true
				}));
			const categoryNames = categories.map((item) => item.name.toLowerCase());
			if (new Set(categoryNames).size !== categoryNames.length) {
				return res.status(400).json({ success: false, message: 'Asset category names must be unique.' });
			}
			const categoryCodes = categories.map((item) => item.categoryCode.toLowerCase());
			if (new Set(categoryCodes).size !== categoryCodes.length) {
				return res.status(400).json({ success: false, message: 'Asset category codes must be unique.' });
			}
			updates['propertySettings.assetCategories'] = categories;
		}
		if (Array.isArray(propertySettings?.assetStatuses)) {
			if (propertySettings.assetStatuses.some((item) => !item || typeof item.name !== 'string' || !item.name.trim())) {
				return res.status(400).json({ success: false, message: 'Every asset status needs a name.' });
			}
			const statuses = propertySettings.assetStatuses.map((item) => ({
					name: item.name.trim().slice(0, 100),
					description: typeof item.description === 'string' ? item.description.trim().slice(0, 240) : '',
					color: ['Blue', 'Green', 'Red', 'Orange', 'Purple'].includes(item.color) ? item.color : 'Blue'
				}));
			const statusNames = statuses.map((item) => item.name.toLowerCase());
			if (new Set(statusNames).size !== statusNames.length) {
				return res.status(400).json({ success: false, message: 'Asset status names must be unique.' });
			}
			updates['propertySettings.assetStatuses'] = statuses;
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