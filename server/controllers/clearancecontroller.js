import Clearance from '../models/clearance.js';
import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Employee from '../models/employee.js';
import Department from '../models/department.js';
import Role from '../models/role.js';
import LibraryClearance from '../models/LibraryClearance.js';
import LibraryOfficerSettings from '../models/LibraryOfficerSettings.js';
import { isDepartmentHead } from '../utils/roleHelpers.js';
import {
  FINAL_HR_STAGE,
  DEFAULT_REQUIRED_OFFICES,
  buildRequiredOfficeWorkflow,
  officeAssignmentFilter,
  MANUAL_ROUTABLE_OFFICES,
  normalizeRoutedOffice,
  normalizeRequiredOffices,
  resolveNextStepAfterDecision,
	isRequestVisibleToOffice,
} from '../utils/clearanceWorkflow.js';
import { recordAuditLog } from './auditLogger.js';
import {
  notifyIctOfficers,
  createIctClearanceRequestFromClearance,
} from './ictClearanceController.js';
import { notifyFinanceOfficers } from './financeclearancerequestController.js';
import { isDepartmentNotificationEnabled } from './notificationcontroller.js';
import { notifyTransportOfficers } from '../utils/transportNotifications.js';
import { resetTransportReviewForResubmission } from '../utils/transportClearance.js';
import { dispatchNotificationEmails } from '../utils/notificationEmailDispatcher.js';

const libraryChecklistItems = [
	'Borrowed books and circulation records',
	'Unreturned or overdue materials',
	'Outstanding fines and charges',
	'Lost or damaged materials',
	'Library account and other obligations',
];
const libraryChecklistItemBySetting = {
	borrowedBooksChecked: libraryChecklistItems[0],
	unreturnedBooksChecked: libraryChecklistItems[1],
	outstandingMaterialsChecked: libraryChecklistItems[2],
	lostDamagedMaterialsChecked: libraryChecklistItems[3],
	libraryAccountChecked: libraryChecklistItems[4],
};
const defaultLibraryChecklist = Object.fromEntries(Object.keys(libraryChecklistItemBySetting).map((key) => [key, true]));
const defaultLibraryRules = {
	checkUnreturnedBooks: true,
	checkOverdueBooks: true,
	checkOutstandingFines: true,
	checkLostDamagedBooks: true,
	requireChecklistCompletion: true,
};

const libraryNotificationPreferenceKey = (type) => {
	if (type === 'Clearance Resubmitted') return 'resubmittedClearance';
	if (['CLEARANCE_READY_FOR_LIBRARY', 'Clearance Awaiting Your Review'].includes(type)) return 'newClearanceRequest';
	return 'clearanceStatusUpdated';
};

const hasTransportOffice = (clearance) => [
	...(Array.isArray(clearance?.requiredOffices) ? clearance.requiredOffices : []),
	...(Array.isArray(clearance?.workflow) ? clearance.workflow.map((step) => step.office || step.name) : []),
].some((office) => /transport/i.test(String(office || '')));
const isAssignedOffice = (clearance, pattern) => clearance?.manualRoutingEnabled !== true
	|| (clearance.assignedDepartments || []).some((office) => pattern.test(String(office || '')));

const resolveEmployeeNotificationRecipient = async (clearance) => {
	if (!clearance) return null;
	const search = [];
	if (clearance.employeeId) search.push({ employeeId: clearance.employeeId });
	if (clearance.employeeName) {
		const escapedName = clearance.employeeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		search.push({ name: { $regex: `^${escapedName}$`, $options: 'i' } });
	}
	if (!search.length) return null;
	const user = await User.findOne({ $or: search }).select('_id name employeeId email');
	return user?._id || null;
};

const createEmployeeNotification = async ({ clearance, title, message, type, actionText = 'View Request', actionLink = '/employee/My%20Clearance' }) => {
	if (!clearance || (!clearance.employeeName && !clearance.employeeId)) return;
	try {
		const recipientId = await resolveEmployeeNotificationRecipient(clearance);
		await Notification.create({
			recipientId,
			employeeId: clearance.employeeId || '',
			title,
			message,
			targetName: clearance.employeeName || 'Employee',
			type,
			actionText,
			actionLink,
			relatedRequestId: clearance.requestId || null,
			clearanceRequestId: clearance.requestId || null,
			isRead: false,
		});
	} catch (error) {
		console.error('Unable to create employee notification:', error.message);
	}
};

const notifyPropertyOfficers = async (clearance, event = 'new') => {
	try {
		const propertyOfficers = await User.find({ role: { $regex: '^property(?:\\s*\\/\\s*asset)?\\s+officer$', $options: 'i' } }).select('_id name');
		const type = event === 'resubmitted' ? 'CLEARANCE_RESUBMITTED' : 'NEW_CLEARANCE_REQUEST';
		const notifications = [];
		for (const officer of propertyOfficers) {
			const exists = await Notification.exists({ recipientId: officer._id, type, relatedRequestId: clearance.requestId });
			if (exists) continue;
			notifications.push({
			recipientId: officer._id,
			targetName: officer.name || 'Property Officer',
			title: event === 'resubmitted' ? 'Clearance Request Resubmitted' : 'New Clearance Request',
			message: event === 'resubmitted'
				? `${clearance.employeeName || 'An employee'} has resolved the Property issue and resubmitted the request. Review again.`
				: `${clearance.employeeName || 'An employee'} submitted a clearance request that requires Property review.`,
			type,
			relatedRequestId: clearance.requestId,
			clearanceRequestId: clearance.requestId,
			actionText: 'View Request',
			actionLink: '/property/clearance-requests'
			});
		}
		if (notifications.length) await Notification.insertMany(notifications);
	} catch (error) {
		console.error('Unable to notify Property Officers:', error.message);
	}
};

const notifyDynamicClearanceOffices = async (clearance) => {
	if (clearance?.manualRoutingEnabled !== true) return;
	const customOfficeNames = [...new Set((clearance.assignedDepartments || [])
		.map(normalizeRoutedOffice)
		.filter((office) => office && !MANUAL_ROUTABLE_OFFICES.some(
			(builtInOffice) => normalizeRoutedOffice(builtInOffice).toLowerCase() === office.toLowerCase(),
		)))];
	if (!customOfficeNames.length) return;

	try {
		const customRoles = await Role.find({
			name: { $in: customOfficeNames },
			isActive: true,
			isClearanceOffice: true,
		}).select('name').lean();
		const recipients = await User.find({ role: { $in: customRoles.map(({ name }) => name) } }).select('_id name role');
		if (!recipients.length) return;
		await Notification.insertMany(recipients.map((recipient) => ({
			recipientId: recipient._id,
			targetName: recipient.name || recipient.role,
			title: 'Clearance Ready for Office Review',
			message: `${clearance.employeeName || 'An employee'}'s clearance request was approved by the Department Head and is ready for ${recipient.role} review.`,
			type: 'CLEARANCE_READY_FOR_OFFICE',
			actionText: 'Review Request',
			relatedRequestId: clearance.requestId,
			clearanceRequestId: clearance.requestId,
			isRead: false,
		})));
	} catch (error) {
		console.error('Unable to notify dynamically assigned clearance offices:', error.message);
	}
};

const notifyHrOfficers = async ({ title, message, type, actionText, actionLink, clearance }) => {
	try {
		const hrOfficers = await User.find({ role: { $regex: '^hr[ _]officer$', $options: 'i' } }).select('_id name');
		await Notification.insertMany(hrOfficers.map((officer) => ({
			recipientId: officer._id,
			targetName: officer.name || 'HR Officer',
			title,
			message,
			type,
			actionText,
			actionLink,
			relatedRequestId: clearance.requestId || null,
			clearanceRequestId: clearance.requestId || null,
			isRead: false,
		})));
	} catch (error) {
		console.error('Unable to notify HR Officers:', error.message);
	}
};

const notifyDepartmentHeads = async ({ clearance, type, title, message, actionText = 'View Request' }) => {
	try {
		const normalizeDepartment = (value) => String(value || '')
			.trim()
			.toLowerCase()
			.replace(/[\s_-]+/g, '');
		const department = typeof clearance.department === 'object'
			? clearance.department?.name || clearance.department?.departmentName
			: clearance.department;
		const heads = await User.find({ role: { $regex: '^department[ _]?head$', $options: 'i' } }).select('_id name employeeId department notificationPreferences').lean();
		const departmentRecord = await Department.findOne({
			departmentName: { $regex: `^${String(department || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
		}).select('departmentHead').lean();
		const configuredHead = String(departmentRecord?.departmentHead || '').trim().toLowerCase();
		const headEmployeeIds = heads.map((head) => head.employeeId).filter(Boolean);
		const headEmployees = await Employee.find({ employeeId: { $in: headEmployeeIds } }).select('employeeId department').lean();
		const departmentByEmployeeId = new Map(headEmployees.map((employee) => [employee.employeeId, employee.department]));
		const normalizedDepartment = normalizeDepartment(department);
		const matchingHeads = clearance.assignedTo
			? heads.filter((head) => String(head._id) === String(clearance.assignedTo))
			: heads.filter((head) => {
			const headDepartment = departmentByEmployeeId.get(head.employeeId) || head.department || '';
			const normalizedHeadDepartment = typeof headDepartment === 'object'
				? headDepartment.name || headDepartment.departmentName || ''
				: headDepartment;
			const matchesDepartment = normalizeDepartment(normalizedHeadDepartment) === normalizedDepartment;
			const matchesConfiguredHead = configuredHead && [head.name, head.employeeId].some((value) => normalizeDepartment(value) === normalizeDepartment(configuredHead));
			return matchesDepartment || matchesConfiguredHead;
			});
		const requestId = clearance.requestId || null;
		const notifications = [];
		for (const head of matchingHeads) {
			if (!isDepartmentNotificationEnabled(head, type)) continue;
			const exists = await Notification.exists({ recipientId: head._id, type, relatedRequestId: requestId });
			if (!exists) notifications.push({
				recipientId: head._id,
				targetName: clearance.employeeName || 'Employee',
				title,
				message,
				type,
				actionText,
				actionLink: `/department-head/clearance-requests?requestId=${encodeURIComponent(requestId || '')}`,
				relatedRequestId: requestId,
				clearanceRequestId: requestId,
				isRead: false,
			});
		}
		if (notifications.length) await Notification.insertMany(notifications);
	} catch (error) {
		console.error('Unable to notify Department Heads:', error.message);
	}
};

const resolveDepartmentAssignment = async (department) => {
	const departmentName = typeof department === 'object'
		? department?.name || department?.departmentName
		: department;
	if (!String(departmentName || '').trim()) return { departmentId: null, assignedTo: null };

	const escapedName = String(departmentName).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const departmentRecord = await Department.findOne({
		departmentName: { $regex: `^${escapedName}$`, $options: 'i' },
	}).select('_id departmentHead').lean();
	if (!departmentRecord) return { departmentId: null, assignedTo: null };

	const headIdentity = String(departmentRecord.departmentHead || '').trim();
	if (!headIdentity) return { departmentId: departmentRecord._id, assignedTo: null };
	const escapedIdentity = headIdentity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const head = await User.findOne({
		role: { $regex: '^department[ _]?head$', $options: 'i' },
		$or: [
			{ name: { $regex: `^${escapedIdentity}$`, $options: 'i' } },
			{ employeeId: { $regex: `^${escapedIdentity}$`, $options: 'i' } },
		],
	}).select('_id').lean();
	if (head) return { departmentId: departmentRecord._id, assignedTo: head._id };

	const departmentHeadByDepartment = await User.findOne({
		role: { $regex: '^department[ _]?head$', $options: 'i' },
		department: { $regex: `^${escapedName}$`, $options: 'i' },
	}).select('_id').lean();
	return { departmentId: departmentRecord._id, assignedTo: departmentHeadByDepartment?._id || null };
};

const notifyLibraryOfficers = async ({ clearance, type, title, message, actionText = 'Review' }) => {
	try {
		const libraryOfficers = await User.find({ role: { $regex: '^library officer$', $options: 'i' } }).select('_id name email employeeId');
		const settings = await LibraryOfficerSettings.find({
			userId: { $in: libraryOfficers.map((officer) => officer._id) },
		}).select('userId notificationPreferences deliveryPreferences').lean();
		const settingsByUserId = new Map(settings.map((item) => [String(item.userId), item]));
		const preferenceKey = libraryNotificationPreferenceKey(type);
		const requestId = clearance.requestId || null;
		const notifications = [];
		const emailOnlyNotifications = [];
		for (const officer of libraryOfficers) {
			const exists = await Notification.exists({ recipientId: officer._id, type, relatedRequestId: requestId });
			if (exists) continue;
			const officerSettings = settingsByUserId.get(String(officer._id));
			if (officerSettings?.notificationPreferences?.[preferenceKey] === false) continue;
			const notification = {
					recipientId: officer._id,
					targetName: officer.name || 'Library Officer',
					title,
					message,
					type,
					actionText,
					actionLink: `/library-office/clearance-requests?requestId=${encodeURIComponent(requestId || '')}`,
					relatedRequestId: requestId,
					clearanceRequestId: requestId,
					isRead: false,
			};
			if (officerSettings?.deliveryPreferences?.inSystemNotifications !== false) {
					notifications.push(notification);
			} else if (officerSettings?.deliveryPreferences?.emailNotifications !== false) {
					emailOnlyNotifications.push({ ...notification, employeeId: clearance.employeeId || officer.employeeId || '' });
			}
		}
		if (notifications.length) await Notification.insertMany(notifications);
		if (emailOnlyNotifications.length) await dispatchNotificationEmails(emailOnlyNotifications);
	} catch (error) {
		console.error('Unable to notify Library Officers:', error.message);
	}
};

const requiresIctClearance = (clearance) => {
	const offices = Array.isArray(clearance?.requiredOffices) ? clearance.requiredOffices : [];
	return offices.some((office) => String(office).toLowerCase().includes('ict'));
};

const getOfficeProgress = (clearance) => {
	const statusByOffice = {
		'department head': clearance.departmentStatus,
		'finance office': clearance.financeStatus,
		'property / asset office': clearance.propertyStatus,
		'property office': clearance.propertyStatus,
		'ict office': clearance.ictStatus,
		library: clearance.libraryStatus,
		'transport office': clearance.transportStatus,
	};
	const offices = (Array.isArray(clearance.requiredOffices) ? clearance.requiredOffices : Object.keys(statusByOffice))
		.filter((office) => !/final hr/i.test(office));
	const completed = offices.filter((office) => {
		const workflowStep = clearance.workflow?.find((step) => String(step.office || '').toLowerCase() === String(office).toLowerCase());
		const status = statusByOffice[String(office).toLowerCase()] || workflowStep?.status;
		return ['approved', 'completed', 'cleared'].includes(String(status || '').toLowerCase());
	}).length;
	return { completed, total: offices.length || 5 };
};

const getClearances = async (_req, res) => {
	if (mongoose.connection.readyState !== 1) {
		return res.status(503).json({
			success: false,
			message: 'Database unavailable. Please check the MongoDB connection and try again.',
		});
	}

	try {
		const role = String(_req.user?.role || '').toLowerCase().replace(/[_-]+/g, ' ');
		const workflowFilter = {};
		const officeByRole = {
			'finance officer': 'Finance Office',
			'library officer': 'Library',
			'property officer': 'Property / Asset Office',
			'property / asset officer': 'Property / Asset Office',
			'ict officer': 'ICT Office',
			'transport officer': 'Transport Office',
		};
		let routedOffice = officeByRole[role];
		if (!routedOffice && !['admin', 'administrator', 'system admin', 'system administrator', 'hr', 'hr officer', 'human resources', 'employee', 'department head'].includes(role)) {
			const escapedRole = role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const clearanceRole = await Role.findOne({
				name: { $regex: `^${escapedRole}$`, $options: 'i' },
				isActive: true,
				isClearanceOffice: true,
			}).select('name').lean();
			routedOffice = clearanceRole?.name;
		}
		if (routedOffice) {
			workflowFilter.$and = [officeAssignmentFilter(routedOffice, Boolean(officeByRole[role]))];
			if (!officeByRole[role]) workflowFilter.departmentStatus = 'Approved';
		}
		if (role === 'finance officer') {
			workflowFilter.departmentStatus = 'Approved';
		}
		if (role === 'library officer') workflowFilter.departmentStatus = 'Approved';
		if (role === 'property officer' || role === 'property / asset officer') {
			workflowFilter.departmentStatus = 'Approved';
		}
		if (role === 'ict officer') {
			workflowFilter.departmentStatus = 'Approved';
		}
		const officeVisibility = {
			'department head': { currentStep: { $in: ['Department Head', 'Department'] } },
		};
		if (role === 'department head') workflowFilter.initialHRStatus = 'Approved';
		const roleVisibility = officeVisibility[role] || {};
		const query = Object.keys(roleVisibility).length ? { ...workflowFilter, ...roleVisibility } : workflowFilter;
		const clearances = await Clearance.find(query)
			.sort({ createdAt: -1 })
			.maxTimeMS(15000)
			.lean();
		return res.status(200).json({ success: true, clearances });
	} catch (error) {
		console.error('Error in getClearances:', error);
		const timedOut = error.code === 50 || (error.name === 'MongooseError' && /timed out/i.test(error.message));
		return res.status(timedOut ? 503 : 500).json({
			success: false,
			message: timedOut
				? 'Clearance query timed out. Please check the MongoDB connection and try again.'
				: 'Unable to fetch clearance requests from the database.',
		});
	}
};

const getLibraryReport = async (req, res) => {
	try {
		const { reportType = 'summary', reportPeriod = 'Custom Date Range', periodValue = '', fromDate: requestedFromDate, toDate: requestedToDate, status, employee, department, campus, clearanceType } = req.query;
		const resolvePeriod = () => {
			const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
			if (reportPeriod === 'Monthly' && /^\d{4}-\d{2}$/.test(periodValue)) {
				const [year, month] = periodValue.split('-').map(Number);
				return { fromDate: `${periodValue}-01`, toDate: formatDate(new Date(year, month, 0)) };
			}
			if (reportPeriod === 'Yearly' && /^\d{4}$/.test(periodValue)) return { fromDate: `${periodValue}-01-01`, toDate: `${periodValue}-12-31` };
			if (reportPeriod === 'Weekly' && /^(\d{4})-W(\d{2})$/.test(periodValue)) {
				const [, yearText, weekText] = periodValue.match(/^(\d{4})-W(\d{2})$/);
				const januaryFourth = new Date(Number(yearText), 0, 4);
				const monday = new Date(januaryFourth);
				monday.setDate(januaryFourth.getDate() - ((januaryFourth.getDay() + 6) % 7) + ((Number(weekText) - 1) * 7));
				const sunday = new Date(monday);
				sunday.setDate(monday.getDate() + 6);
				return { fromDate: formatDate(monday), toDate: formatDate(sunday) };
			}
			return { fromDate: requestedFromDate, toDate: requestedToDate };
		};
		const { fromDate, toDate } = resolvePeriod();
		const filter = { $and: [{
			$or: [
				{ requiredOffices: { $regex: 'library', $options: 'i' } },
				{ libraryStatus: { $exists: true } },
			],
		}, officeAssignmentFilter('Library')] };
		const dateFilter = {};
		if (fromDate) dateFilter.$gte = new Date(`${fromDate}T00:00:00.000Z`);
		if (toDate) dateFilter.$lte = new Date(`${toDate}T23:59:59.999Z`);
		if (Object.keys(dateFilter).length) filter.createdAt = dateFilter;
		if (department) filter.$and.push({ $or: [
			{ 'department.name': department },
			{ department },
		] });
		if (clearanceType) filter.$and.push({ $or: [{ clearanceType }, { clearanceReason: clearanceType }, { reason: clearanceType }] });
		if (employee) {
			const escaped = String(employee).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			filter.$and.push({ $or: [
				{ employeeId: { $regex: escaped, $options: 'i' } },
				{ employeeName: { $regex: escaped, $options: 'i' } },
				{ 'employee.fullName': { $regex: escaped, $options: 'i' } },
			] });
		}

		const statusGroups = {
			approved: ['Completed', 'Approved'],
			returned: ['Returned', 'Rejected'],
			pending: ['Pending'],
			completed: ['Completed'],
		};
		if (status) filter.$and.push({ libraryStatus: status === 'Under Review' ? { $in: ['In Progress', 'Under Review'] } : statusGroups[status.toLowerCase()] || status });
		if (reportType && !['summary', 'all', 'clearance', 'responsibility', 'history'].includes(reportType)) {
			filter.$and.push({ libraryStatus: { $in: statusGroups[reportType] || [reportType] } });
		}

		const clearances = await Clearance.find(filter).sort({ createdAt: -1 }).lean();
		const employeeIds = clearances.map((item) => item.employeeId).filter(Boolean);
		const employees = await Employee.find({ employeeId: { $in: employeeIds } }).select('employeeId fullName department campus').lean();
		const employeeById = new Map(employees.map((item) => [item.employeeId, item]));
		const rows = clearances.map((item) => {
			const employeeRecord = employeeById.get(item.employeeId);
			const rawStatus = item.libraryStatus || 'Pending';
			return {
				...item,
				employeeName: item.employeeName || employeeRecord?.fullName || item.employee?.fullName || item.employeeId || '',
				department: item.department?.name || item.department || employeeRecord?.department || '',
				campus: item.campus || item.employee?.campus || employeeRecord?.campus || '',
				libraryReportStatus: rawStatus === 'In Progress' ? 'Under Review' : rawStatus === 'Rejected' ? 'Returned' : rawStatus,
				requestDate: item.createdAt || item.requestDate,
				approvedBy: item.libraryReviewedBy || item.reviewedBy || item.approvedBy || '',
				libraryDecisionDate: item.libraryReviewedAt || item.reviewedAt || item.approvedAt || '',
				returnReason: item.libraryReturnReason || item.returnReason || item.libraryComment || '',
				materials: Array.isArray(item.materials) ? item.materials : [],
			};
		}).filter((item) => !campus || String(item.campus || '') === campus);
		const getReportStatus = (item) => item.libraryReportStatus;
		const counts = {
			total: rows.length,
			pending: rows.filter((item) => getReportStatus(item) === 'Pending').length,
			underReview: rows.filter((item) => getReportStatus(item) === 'Under Review').length,
			returned: rows.filter((item) => getReportStatus(item) === 'Returned').length,
			approved: rows.filter((item) => getReportStatus(item) === 'Approved').length,
			completed: rows.filter((item) => item.libraryReportStatus === 'Completed').length,
		};
		const responsibility = rows.reduce((result, item) => {
			const materials = Array.isArray(item.materials) ? item.materials : [];
			result.totalChecked += materials.length;
			result.borrowedBooks += materials.filter((material) => ['Borrowed', 'Overdue'].includes(material.status)).length;
			result.outstandingBooks += materials.filter((material) => ['Outstanding', 'Borrowed', 'Overdue'].includes(material.status)).length;
			result.lostDamaged += materials.filter((material) => ['Lost', 'Damaged'].includes(material.status) || ['Lost', 'Damaged'].includes(material.condition)).length;
			result.returnedMaterials += materials.filter((material) => material.status === 'Returned').length;
			if (!materials.some((material) => ['Outstanding', 'Borrowed', 'Overdue'].includes(material.status))) result.noOutstanding += 1;
			return result;
		}, { totalChecked: 0, noOutstanding: 0, borrowedBooks: 0, outstandingBooks: 0, lostDamaged: 0, returnedMaterials: 0 });
		const byDepartment = rows.reduce((result, item) => {
			result[item.department || 'Other'] = (result[item.department || 'Other'] || 0) + 1;
			return result;
		}, {});
		const trendStart = fromDate ? new Date(`${fromDate}T00:00:00`) : new Date(new Date().setDate(new Date().getDate() - 6));
		const trendEnd = toDate ? new Date(`${toDate}T23:59:59.999`) : new Date();
		const dayDifference = Math.max(1, Math.ceil((trendEnd - trendStart) / 86400000));
		const useMonthlyBuckets = reportPeriod === 'Yearly' || dayDifference > 31;
		const trend = [];
		if (useMonthlyBuckets) {
			const cursor = new Date(trendStart.getFullYear(), trendStart.getMonth(), 1);
			const endMonth = new Date(trendEnd.getFullYear(), trendEnd.getMonth(), 1);
			while (cursor <= endMonth) {
				const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
				trend.push({ date: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`, label: cursor.toLocaleDateString('en-US', { month: 'short' }), count: rows.filter((item) => { const date = new Date(item.requestDate || item.createdAt); return date >= cursor && date < nextMonth; }).length });
				cursor.setMonth(cursor.getMonth() + 1);
			}
		} else {
			const cursor = new Date(trendStart);
			cursor.setHours(0, 0, 0, 0);
			while (cursor <= trendEnd) {
				const nextDay = new Date(cursor);
				nextDay.setDate(nextDay.getDate() + 1);
				trend.push({ date: cursor.toISOString().slice(0, 10), label: reportPeriod === 'Weekly' ? cursor.toLocaleDateString('en-US', { weekday: 'short' }) : cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count: rows.filter((item) => { const date = new Date(item.requestDate || item.createdAt); return date >= cursor && date < nextDay; }).length });
				cursor.setDate(cursor.getDate() + 1);
			}
		}
		return res.status(200).json({ success: true, rows, counts, byDepartment, trend, reportType, reportPeriod, periodValue, period: { fromDate, toDate }, responsibility });
	} catch (error) {
		console.error('Error in getLibraryReport:', error);
		return res.status(500).json({ success: false, message: 'Unable to load the library report.' });
	}
};

const getMyClearances = async (req, res) => {
	try {
		const employeeId = req.user?.employeeId;
		const employeeName = req.user?.name;
		const filterParts = [];
		if (employeeId) filterParts.push({ employeeId });
		if (employeeName) {
			const escapedName = String(employeeName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			filterParts.push(
				{ employeeName: { $regex: `^${escapedName}$`, $options: 'i' } },
				{ 'employee.fullName': { $regex: `^${escapedName}$`, $options: 'i' } },
				{ 'employee.name': { $regex: `^${escapedName}$`, $options: 'i' } },
			);
		}
		if (req.user?.email) {
			filterParts.push(
				{ email: req.user.email },
				{ 'employee.email': req.user.email },
			);
		}
		const filter = filterParts.length ? { $or: filterParts } : { _id: null };
		const clearances = await Clearance.find(filter).sort({ createdAt: -1 }).lean();
		const normalizedClearances = await Promise.all(clearances.map(async (clearance) => {
			const ictStep = Array.isArray(clearance.workflow)
				? clearance.workflow.find((step) => /ict/i.test(step.office || step.name || ''))
				: null;
			const ictDecision = clearance.ictClearance || {};
			const returnedOffice = clearance.returnedOffice || (clearance.initialHRStatus === 'Returned' ? 'HR Officer' : '');
			const returnedBy = clearance.returnedBy
				|| (returnedOffice === 'Finance Office' ? clearance.financeReviewedBy : '')
				|| (clearance.initialHRStatus === 'Returned' ? clearance.initialHRReviewedBy : '');
			const returnedAt = clearance.returnedAt || (clearance.initialHRStatus === 'Returned' ? clearance.initialHRReviewedAt : null);
			const returnedReason = clearance.returnedReason || clearance.returnReason || clearance.initialHRRemarks || '';
			const returnedRemark = clearance.returnedRemark || clearance.initialHRRemarks || clearance.officerComment || '';
			const propertyOfficer = returnedOffice === 'Property / Asset Office' && returnedBy === 'Property Officer'
				? await User.findOne({ role: { $regex: '^property( / asset)? officer$', $options: 'i' } }).select('name fullName').sort({ createdAt: 1 }).lean()
				: null;
			return {
				...clearance,
				returnedBy: propertyOfficer?.fullName || propertyOfficer?.name || returnedBy,
				returnedOffice,
				returnedAt,
				returnedReason,
				returnedRemark,
				affectedField: clearance.affectedField || '',
				ictStatus: clearance.ictStatus || ictDecision.status || ictStep?.status || 'Pending',
				ictRemarks: clearance.ictRemarks || ictDecision.comment || ictStep?.remarks || '',
				ictReturnReason: clearance.ictReturnReason || ictDecision.returnReason || ictStep?.returnReason || '',
			};
		}));
		return res.status(200).json({ success: true, clearances: normalizedClearances });
	} catch (error) {
		console.error('Error in getMyClearances:', error);
		return res.status(500).json({ success: false, message: 'Server error while fetching your clearances.' });
	}
};

const getClearance = async (req, res) => {
	try {
		const requestFilter = mongoose.isValidObjectId(req.params.id)
			? { $or: [{ _id: req.params.id }, { requestId: req.params.id }] }
			: { requestId: req.params.id };
		const clearance = await Clearance.findOne(requestFilter).maxTimeMS(15000).lean();
		if (!clearance) return res.status(404).json({ success: false, message: 'Clearance request not found.' });
		const role = String(req.user?.role || '').toLowerCase().replace(/[_-]+/g, ' ');
		const officeByRole = {
			'finance officer': 'Finance Office',
			'library officer': 'Library',
			'property officer': 'Property / Asset Office',
			'property / asset officer': 'Property / Asset Office',
			'ict officer': 'ICT Office',
			'transport officer': 'Transport Office',
		};
		let routedOffice = officeByRole[role];
		if (!routedOffice && !['admin', 'administrator', 'system admin', 'system administrator', 'hr', 'hr officer', 'human resources', 'employee', 'department head'].includes(role)) {
			const escapedRole = role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const clearanceRole = await Role.findOne({
				name: { $regex: `^${escapedRole}$`, $options: 'i' },
				isActive: true,
				isClearanceOffice: true,
			}).select('name').lean();
			routedOffice = clearanceRole?.name;
		}
		const parallelOffice = ['finance officer', 'library officer', 'property officer', 'property / asset officer', 'ict officer'].includes(role);
		const canView = routedOffice
			? (clearance.manualRoutingEnabled === true
				? isRequestVisibleToOffice(clearance, routedOffice)
				: parallelOffice && clearance.departmentStatus === 'Approved'
					? true
					: isRequestVisibleToOffice(clearance, routedOffice))
			: true;
		if (!canView) return res.status(404).json({ success: false, message: 'This request is not ready for your office.' });
		return res.status(200).json({ success: true, clearance });
	} catch (error) {
		return res.status(400).json({ success: false, message: 'Invalid clearance id.' });
	}
};

const deleteClearance = async (req, res) => {
	try {
		const employeeFilter = req.user?.employeeId
			? { employeeId: req.user.employeeId }
			: req.user?.name
				? { employeeName: req.user.name }
				: { _id: null };
		const requestFilter = mongoose.isValidObjectId(req.params.id)
			? { $or: [{ _id: req.params.id }, { requestId: req.params.id }] }
			: { requestId: req.params.id };
		const clearance = await Clearance.findOneAndDelete({ $and: [employeeFilter, requestFilter] }).lean();
		if (!clearance) return res.status(404).json({ success: false, message: 'Clearance request not found.' });

		const requestIds = [clearance.requestId, clearance._id?.toString()].filter(Boolean);
		await Notification.deleteMany({
			$or: [
				{ relatedRequestId: { $in: requestIds } },
				{ clearanceRequestId: { $in: requestIds } },
			],
		});

		return res.status(200).json({ success: true, message: 'Clearance request deleted successfully.' });
	} catch (error) {
		console.error('Error deleting clearance:', error);
		return res.status(400).json({ success: false, message: 'Unable to delete clearance request.' });
	}
};

const normalizeDateOnly = (value) => {
	const rawValue = String(value || '').trim();
	const dateOnly = rawValue.slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)
		|| (rawValue !== dateOnly && (!rawValue.startsWith(`${dateOnly}T`) || Number.isNaN(Date.parse(rawValue))))) {
		return '';
	}
	const [year, month, day] = dateOnly.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	return date.getUTCFullYear() === year
		&& date.getUTCMonth() === month - 1
		&& date.getUTCDate() === day
		? dateOnly
		: '';
};

const addClearance = async (req, res) => {
	try {
		const normalizedRole = String(req.user?.role || '').toLowerCase().replace(/[_-]+/g, ' ').trim();
		const initiatedByHR = ['hr', 'hr officer', 'human resources'].includes(normalizedRole);
		const lastWorkingDate = normalizeDateOnly(req.body?.lastWorkingDate);
		if (!lastWorkingDate) {
			return res.status(400).json({ success: false, message: 'A valid last working date is required.' });
		}
		const requestDate = normalizeDateOnly(req.body?.requestDate || new Date().toISOString().slice(0, 10));
		if (!requestDate) {
			return res.status(400).json({ success: false, message: 'A valid request date is required.' });
		}
		const relievingDate = req.body?.relievingDate
			? normalizeDateOnly(req.body.relievingDate)
			: '';
		if (req.body?.relievingDate && !relievingDate) {
			return res.status(400).json({ success: false, message: 'Enter a valid relieving date.' });
		}
		if (relievingDate && lastWorkingDate > relievingDate) {
			return res.status(400).json({ success: false, message: 'Last working date cannot be after relieving date.' });
		}
		const reason = String(req.body?.reason || req.body?.clearanceReason || '').trim();
		if (initiatedByHR && !reason) {
			return res.status(400).json({ success: false, message: 'Select a clearance reason before creating the request.' });
		}
		const employeeRecord = req.body?.employeeId
			? await Employee.findOne({ employeeId: req.body.employeeId }).select('employeeId fullName department position campus phone email status').lean()
			: null;
		if (initiatedByHR && !employeeRecord) {
			return res.status(400).json({ success: false, message: 'Select a valid employee record before creating a request on their behalf.' });
		}
		const resolvedDepartment = employeeRecord?.department || req.user?.department || req.body?.department || '';
		if (initiatedByHR && !resolvedDepartment) {
			return res.status(400).json({ success: false, message: 'The selected employee must have a department before creating a clearance request.' });
		}
		const resolvedEmployeeName = employeeRecord?.fullName || req.user?.name || req.body?.employeeName || '';
		const employeeFilter = employeeRecord?.employeeId || req.body?.employeeId || req.user?.employeeId
			? { employeeId: employeeRecord?.employeeId || req.body?.employeeId || req.user?.employeeId }
			: resolvedEmployeeName
				? { employeeName: { $regex: `^${String(resolvedEmployeeName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }
				: null;
		if (employeeFilter) {
			const activeClearance = await Clearance.findOne({
				...employeeFilter,
				status: { $nin: ['Completed', 'Cancelled', 'Final HR Clearance Completed'] },
			}).sort({ createdAt: -1 }).select('requestId status propertyStatus').lean();
			if (activeClearance) {
				return res.status(409).json({
					success: false,
					message: `An active clearance request already exists (${activeClearance.requestId || 'N/A'}). Update or resubmit that request instead of creating a new one.`,
					requestId: activeClearance.requestId,
				});
			}
		}
		const requestedOffices = initiatedByHR
			? ['Department Head', FINAL_HR_STAGE]
			: normalizeRequiredOffices([
				...(req.body?.requiredOffices || req.body?.offices || DEFAULT_REQUIRED_OFFICES),
				'Department Head',
			]);
		const workflow = !initiatedByHR && Array.isArray(req.body?.workflow) && req.body.workflow.length
			? req.body.workflow
				.map((step) => ({
					office: step?.office || step?.name || '',
					status: ['Pending', 'In Progress', 'Completed', 'Rejected'].includes(step?.status) ? step.status : 'Pending',
					updatedAt: step?.updatedAt || new Date().toISOString(),
				}))
				.filter((step) => step.office)
			: buildRequiredOfficeWorkflow(requestedOffices);
		workflow.unshift({
			office: 'Initial HR Review',
			status: initiatedByHR ? 'Completed' : 'Pending',
			updatedAt: new Date().toISOString(),
			...(initiatedByHR ? {
				performedBy: req.user?.fullName || req.user?.name || 'HR Officer',
				performedById: req.user?._id || null,
				remarks: 'Request initiated and employee details checked by HR.',
			} : {}),
		});
		if (!workflow.some((step) => /department\s*head|^department$/i.test(String(step.office || '').trim()))) {
			workflow.unshift({ office: 'Department Head', status: 'Pending', updatedAt: new Date().toISOString() });
		}

		const payload = {
			...(req.body || {}),
			lastWorkingDate,
			requestDate,
			relievingDate,
			...(initiatedByHR ? { reason } : {}),
			employeeId: employeeRecord?.employeeId || req.body?.employeeId || req.user?.employeeId || '',
			department: resolvedDepartment,
			requestSource: initiatedByHR ? 'HR Officer' : 'Employee Portal',
			initiatedBy: req.user?._id || null,
			initiatedByName: req.user?.fullName || req.user?.name || '',
			requestedByRole: initiatedByHR ? 'HR_OFFICER' : 'EMPLOYEE',
			isHRInitiated: initiatedByHR,
			initialHRStatus: initiatedByHR ? 'Under Review' : 'Pending',
			initialHRAssessmentCompleted: initiatedByHR,
			assessmentChecklist: initiatedByHR ? {
				empInfoVerified: true,
				clearanceRequestVerified: true,
				documentVerified: true,
				employmentVerified: true,
				noDuplicateRequest: true,
			} : req.body?.assessmentChecklist,
			initialHRReviewedBy: initiatedByHR ? (req.user?.fullName || req.user?.name || 'HR Officer') : '',
			initialHRReviewedById: initiatedByHR ? (req.user?._id || null) : null,
			initialHRReviewedAt: initiatedByHR ? new Date() : null,
			departmentStatus: 'Pending',
			employeeName: resolvedEmployeeName,
			clearanceType: req.body?.clearanceType || reason || req.body?.clearanceReason || 'Resignation',
			requiredOffices: requestedOffices,
			currentStep: initiatedByHR ? 'HR Workflow' : 'Initial HR Review',
			workflow,
			status: 'Pending',
			propertyStatus: 'Pending',
		};
		const assignment = await resolveDepartmentAssignment(resolvedDepartment);
		payload.departmentId = assignment.departmentId;
		payload.assignedTo = assignment.assignedTo;

		const clearance = await Clearance.create(payload);
		
		// Execute post-creation tasks asynchronously without blocking the response
		try {
			await recordAuditLog({
				req,
				user: req.user,
				action: initiatedByHR ? 'HR_INITIATE_CLEARANCE' : 'SUBMIT_CLEARANCE',
				module: 'Clearance Request',
				description: initiatedByHR
					? `${req.user?.fullName || req.user?.name || 'HR Officer'} created a clearance request for ${clearance.employeeName || 'an employee'} (${clearance.requestId || clearance._id}).`
					: `${clearance.employeeName || 'An employee'} submitted a clearance request (${clearance.requestId || clearance._id}).`,
				newValues: {
					requestId: clearance.requestId,
					employeeId: clearance.employeeId,
					status: clearance.status,
					requiredOffices: clearance.requiredOffices,
					requestSource: clearance.requestSource,
					requestedByRole: clearance.requestedByRole,
					isHRInitiated: clearance.isHRInitiated,
					initiatedBy: clearance.initiatedBy,
				},
			});
		} catch (auditError) {
			console.error('Failed to record audit log:', auditError.message);
		}

		if (!initiatedByHR) {
			try {
				await createEmployeeNotification({
					clearance,
					title: 'Clearance Request Submitted',
					message: `Your clearance request has been submitted successfully. Request No: ${clearance.requestId || 'N/A'}`,
					type: 'REQUEST_SUBMITTED',
					actionText: 'View Request',
					actionLink: '/employee/My%20Clearance',
				});
			} catch (notifError) {
				console.error('Failed to create employee notification:', notifError.message);
			}
		}

		await notifyHrOfficers({
			clearance,
			type: initiatedByHR ? 'HR_WORKFLOW_REQUEST_CREATED' : 'NEW_CLEARANCE_REQUEST',
			title: initiatedByHR ? 'HR-Initiated Request Ready for Workflow' : 'New Clearance Request for Initial HR Review',
			message: initiatedByHR
				? `${req.user?.fullName || req.user?.name || 'HR Officer'} created a request for ${clearance.employeeName || 'an employee'}. Select required offices in HR Workflow. Request No: ${clearance.requestId || 'N/A'}`
				: `${clearance.employeeName || 'An employee'} submitted a clearance request. Review the employee information before sending it to the Department Head. Request No: ${clearance.requestId || 'N/A'}`,
			actionText: initiatedByHR ? 'Assign Clearance Offices' : 'Review Request',
			actionLink: initiatedByHR ? '/hr-office/hr-workflow' : '/hr-office/clearance-requests',
		});
		return res.status(201).json({ success: true, clearance, initiatedByHR });
	} catch (error) {
		console.error('Error in addClearance:', error);
		return res.status(400).json({ success: false, message: 'Unable to create clearance request.' });
	}
};

const updateClearance = async (req, res) => {
	try {
		const { libraryDecision, ...requestUpdates } = req.body || {};
		let libraryRequestForDecision = null;
		delete requestUpdates.requestSource;
		delete requestUpdates.requestedByRole;
		delete requestUpdates.isHRInitiated;
		delete requestUpdates.initiatedBy;
		delete requestUpdates.initiatedByName;
		if (Object.prototype.hasOwnProperty.call(requestUpdates, 'lastWorkingDate')) {
			const lastWorkingDate = String(requestUpdates.lastWorkingDate || '').slice(0, 10);
			if (!lastWorkingDate) return res.status(400).json({ success: false, message: 'Last working date is required.' });
			requestUpdates.lastWorkingDate = lastWorkingDate;
		}
		if (requestUpdates.cancelRequest) {
			const cancellationReason = String(requestUpdates.cancellationReason || '').trim();
			if (!cancellationReason) return res.status(400).json({ success: false, message: 'Cancellation reason is required.' });
			const employeeFilter = req.user?.employeeId
				? { employeeId: req.user.employeeId }
				: { employeeName: req.user?.name };
			const requestFilter = mongoose.isValidObjectId(req.params.id)
				? { $or: [{ _id: req.params.id }, { requestId: req.params.id }] }
				: { requestId: req.params.id };
			const existing = await Clearance.findOne({ $and: [employeeFilter, requestFilter] });
			if (!existing) return res.status(404).json({ success: false, message: 'Clearance request not found.' });
			if (existing.status !== 'Pending' || existing.departmentStatus !== 'Pending') {
				return res.status(400).json({ success: false, message: 'Only pending requests can be cancelled.' });
			}
			existing.status = 'Cancelled';
			existing.overallStatus = 'Cancelled';
			existing.cancellationReason = cancellationReason;
			existing.cancelledAt = new Date();
			existing.cancelledBy = req.user?._id || req.user?.employeeId || req.user?.name || 'Employee';
			existing.currentStep = 'Cancelled';
			existing.workflow = (Array.isArray(existing.workflow) ? existing.workflow : []).map((step) => ({
				...step,
				status: ['Completed', 'Approved', 'Cleared'].includes(step.status) ? step.status : 'Cancelled',
				updatedAt: new Date(),
			}));
			const cancelled = await existing.save();
			return res.status(200).json({ success: true, message: 'Clearance request cancelled successfully.', clearance: cancelled });
		}
		if (libraryDecision) {
			const requestFilter = mongoose.isValidObjectId(req.params.id)
				? { $or: [{ _id: req.params.id }, { requestId: req.params.id }] }
				: { requestId: req.params.id };
			const existingClearance = await Clearance.findOne(requestFilter)
				.select('departmentStatus employeeId outstandingItems borrowedItemsStatus libraryFine outstandingLibraryFine outstandingFineAmount otherObligationsStatus')
				.lean();
			if (!existingClearance) return res.status(404).json({ success: false, message: 'Clearance request not found.' });
			libraryRequestForDecision = existingClearance;
			if (existingClearance.departmentStatus !== 'Approved') {
				return res.status(400).json({ success: false, message: 'This request is waiting for Department Head approval.' });
			}
		}
		const isResubmission = requestUpdates.resubmitted === true || requestUpdates.status === 'Resubmitted';
		const resolutionRemark = String(requestUpdates.resolutionRemark || '').trim();
		let resubmittedToFinance = false;
		const hasExplicitDepartmentDecision = requestUpdates.departmentDecision && typeof requestUpdates.departmentDecision === 'object';
		const legacyDepartmentDecision = Array.isArray(requestUpdates.departmentClearances) && requestUpdates.departmentClearances.length
			? requestUpdates.departmentClearances[requestUpdates.departmentClearances.length - 1]
			: null;
		const departmentDecision = hasExplicitDepartmentDecision ? requestUpdates.departmentDecision : legacyDepartmentDecision;
		const hasDepartmentDecision = Boolean(departmentDecision);
		let reviewRequest = null;
		if (hasExplicitDepartmentDecision) delete requestUpdates.departmentDecision;
		if (hasDepartmentDecision) {
			if (!isDepartmentHead(req.user?.role)) return res.status(403).json({ success: false, message: 'Department Head access is required.' });
			const departmentRequestFilter = mongoose.isValidObjectId(req.params.id)
				? { $or: [{ _id: req.params.id }, { requestId: req.params.id }] }
				: { requestId: req.params.id };
			reviewRequest = await Clearance.findOne(departmentRequestFilter)
				.select('departmentId department employeeId initialHRStatus departmentStatus manualRoutingEnabled assignedDepartments')
				.lean();
			if (!reviewRequest) return res.status(404).json({ success: false, message: 'Clearance request not found.' });
			if (reviewRequest.initialHRStatus !== 'Approved' || !['Pending', 'In Progress'].includes(reviewRequest.departmentStatus)) {
				return res.status(400).json({ success: false, message: 'Only open requests approved by Initial HR can be reviewed.' });
			}
			const requestEmployee = reviewRequest.employeeId
				? await Employee.findOne({ employeeId: reviewRequest.employeeId }).select('department departmentId').lean()
				: null;
			const requestDepartmentId = reviewRequest.departmentId || requestEmployee?.departmentId;
			const userDepartmentId = req.user?.departmentId;
			const requestDepartment = typeof reviewRequest.department === 'object'
				? reviewRequest.department?.departmentName || reviewRequest.department?.name || requestEmployee?.department
				: reviewRequest.department || requestEmployee?.department;
			const userDepartment = String(req.user?.department || '').trim().toLowerCase();
			const requestDepartmentName = String(requestDepartment || '').trim().toLowerCase();
			const matchingDepartmentId = userDepartmentId && requestDepartmentId
				&& String(userDepartmentId) === String(requestDepartmentId);
			const conflictingDepartmentIds = userDepartmentId && requestDepartmentId
				&& String(userDepartmentId) !== String(requestDepartmentId);
			const matchingDepartmentName = !conflictingDepartmentIds && userDepartment && requestDepartmentName
				&& userDepartment === requestDepartmentName;
			if (!matchingDepartmentId && !matchingDepartmentName) {
				return res.status(403).json({ success: false, message: 'This clearance request belongs to another department.' });
			}
		}
		if (isResubmission) {
			requestUpdates.status = 'Pending';
			requestUpdates.overallStatus = 'In Progress';
			delete requestUpdates.resubmitted;
			delete requestUpdates.resolutionRemark;
			requestUpdates.returnReason = '';
			requestUpdates.returnedBy = '';
			requestUpdates.returnedOffice = '';
			requestUpdates.returnedAt = null;
			requestUpdates.returnedReason = '';
			requestUpdates.returnedRemark = '';
			requestUpdates.affectedField = '';
			requestUpdates.officerComment = resolutionRemark;
		}
		if (hasExplicitDepartmentDecision) {
			const checklist = Array.isArray(requestUpdates.departmentChecklist) ? requestUpdates.departmentChecklist : [];
			if (!checklist.length) return res.status(400).json({ success: false, message: 'At least one department checklist item is required.' });
			if (checklist.some((item) => !['Cleared', 'Pending', 'N/A'].includes(item.status))) {
				return res.status(400).json({ success: false, message: 'Checklist items must be Cleared, Pending, or N/A.' });
			}
			requestUpdates.departmentChecklist = checklist.map((item) => ({ ...item, updatedAt: new Date() }));
		}
		if (hasDepartmentDecision) {
			const departmentStatus = departmentDecision.status === 'Completed' ? 'Approved' : departmentDecision.status;
			if (!['Pending', 'In Progress', 'Approved', 'Returned'].includes(departmentStatus)) {
				return res.status(400).json({ success: false, message: 'Invalid Department Head decision status.' });
			}
			if (hasExplicitDepartmentDecision && departmentStatus === 'Approved' && requestUpdates.departmentChecklist.some((item) => item.status === 'Pending')) {
				return res.status(400).json({ success: false, message: 'Resolve every checklist item as Cleared or N/A before approving.' });
			}
			const returnReason = String(departmentDecision.returnReason || requestUpdates.returnReason || '').trim();
			if (departmentStatus === 'Returned' && !returnReason) {
				return res.status(400).json({ success: false, message: 'Return reason is required.' });
			}
			const reviewedAt = new Date();
			const departmentReviewer = req.user?.fullName || req.user?.name || '';
			requestUpdates.departmentStatus = departmentStatus;
			if (departmentStatus === 'Approved') {
				requestUpdates.status = 'In Progress';
				requestUpdates.overallStatus = 'In Progress';
				if (reviewRequest.manualRoutingEnabled) {
					requestUpdates.currentStep = reviewRequest.assignedDepartments?.[0] || 'Final HR Clearance';
				}
			}
			if (departmentStatus === 'Returned') {
				requestUpdates.status = 'Returned';
				requestUpdates.overallStatus = 'Returned';
				requestUpdates.returnReason = returnReason;
				requestUpdates.returnedBy = departmentReviewer;
				requestUpdates.returnedOffice = 'Department Head';
				requestUpdates.returnedAt = reviewedAt;
				requestUpdates.returnedReason = returnReason;
				requestUpdates.returnedRemark = departmentDecision.comment || requestUpdates.remarks || '';
				requestUpdates.affectedField = requestUpdates.affectedField || departmentDecision.affectedField || 'Department Head Review';
			}
			requestUpdates.departmentReturnReason = returnReason;
			requestUpdates.departmentReviewedBy = departmentReviewer;
			requestUpdates.departmentReviewedById = req.user?._id || null;
			requestUpdates.departmentReviewedAt = reviewedAt;
			requestUpdates.departmentComment = departmentDecision.comment || requestUpdates.remarks || '';
			requestUpdates.departmentClearance = {
				...departmentDecision,
				status: departmentStatus,
				reviewedBy: departmentReviewer,
				reviewedById: req.user?._id || null,
				reviewedAt,
				comment: departmentDecision.comment || requestUpdates.remarks || '',
				returnReason,
			};
			requestUpdates.departmentClearances = hasExplicitDepartmentDecision
				? [{
					office: 'Department Head',
					status: departmentStatus,
					reviewedBy: departmentReviewer,
					reviewedById: req.user?._id || null,
					reviewedAt,
					comment: departmentDecision.comment || requestUpdates.remarks || '',
					returnReason,
				}]
				: [{
					...departmentDecision,
					status: departmentStatus,
					reviewedBy: departmentReviewer,
					reviewedById: req.user?._id || null,
					reviewedAt,
				}];
		}
		if (libraryDecision) {
			const { status, verificationResult = '', comment = '', returnReason = '' } = libraryDecision;
			if (!['In Progress', 'Completed', 'Rejected'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid library decision status.' });
			if (status === 'Rejected' && !returnReason.trim()) return res.status(400).json({ success: false, message: 'Return reason is required.' });
			if (requestUpdates.libraryChecklist !== undefined && (!Array.isArray(requestUpdates.libraryChecklist) || requestUpdates.libraryChecklist.some((item) => !item || !libraryChecklistItems.includes(item.item) || !['Cleared', 'Pending', 'N/A'].includes(item.status)))) {
				return res.status(400).json({ success: false, message: 'Library checklist items must be Cleared, Pending, or N/A.' });
			}
			if (status === 'Completed') {
				const [librarySettings, libraryRecords] = await Promise.all([
					LibraryOfficerSettings.findOne({ userId: req.user._id }).select('clearanceRules clearanceChecklist').lean(),
					LibraryClearance.find({ employeeId: libraryRequestForDecision.employeeId })
						.select('materials outstandingFineAmount borrowedItemsStatus otherObligationsStatus')
						.lean(),
				]);
				const rules = { ...defaultLibraryRules, ...(librarySettings?.clearanceRules || {}) };
				const checklistSettings = { ...defaultLibraryChecklist, ...(librarySettings?.clearanceChecklist || {}) };
				const requiredChecklistItems = Object.entries(libraryChecklistItemBySetting)
					.filter(([key]) => checklistSettings[key])
					.map(([, item]) => item);
				const submittedChecklist = Array.isArray(requestUpdates.libraryChecklist) ? requestUpdates.libraryChecklist : [];
				if (rules.requireChecklistCompletion && (
					requiredChecklistItems.some((requiredItem) => !submittedChecklist.some((item) => item.item === requiredItem && item.status !== 'Pending'))
					|| new Set(submittedChecklist.map((item) => item.item)).size !== submittedChecklist.length
				)) {
					return res.status(400).json({ success: false, message: 'Resolve every enabled Library checklist item as Cleared or N/A before approving.' });
				}

				const materials = libraryRecords.flatMap((record) => Array.isArray(record.materials) ? record.materials : []);
				const unresolvedMaterials = materials.filter((material) => ['borrowed', 'outstanding', 'overdue'].includes(String(material.status || '').toLowerCase()));
				const overdueMaterials = materials.filter((material) => {
					const statusValue = String(material.status || '').toLowerCase();
					const dueDate = material.dueDate ? new Date(material.dueDate).toISOString().slice(0, 10) : '';
					return ['borrowed', 'outstanding', 'overdue'].includes(statusValue)
						&& (statusValue === 'overdue' || (dueDate && dueDate < new Date().toISOString().slice(0, 10)));
				});
				const fineBalance = Math.max(
					Number(existingClearance.outstandingFineAmount || 0),
					Number(existingClearance.libraryFine || existingClearance.outstandingLibraryFine || 0),
					...libraryRecords.map((record) => Number(record.outstandingFineAmount || 0)),
					...materials.map((material) => Math.max(0, Number(material.fineAmount || 0) - Number(material.finePaidAmount || 0))),
					0,
				);
				const hasLostOrDamagedMaterials = materials.some((material) => (
					['lost', 'damaged'].includes(String(material.status || '').toLowerCase())
					|| /^(lost|damaged)$/i.test(String(material.condition || '').trim())
				));
				const hasOtherOutstandingItems = Array.isArray(existingClearance.outstandingItems) && existingClearance.outstandingItems.length > 0;

				if (rules.checkUnreturnedBooks && (
					unresolvedMaterials.length > 0
					|| libraryRecords.some((record) => record.borrowedItemsStatus === 'Not Clear')
				)) return res.status(400).json({ success: false, message: 'Resolve unreturned library materials before approving this clearance.' });
				if (rules.checkOverdueBooks && overdueMaterials.length > 0) {
					return res.status(400).json({ success: false, message: 'Resolve overdue library materials before approving this clearance.' });
				}
				if (rules.checkOutstandingFines && fineBalance > 0) {
					return res.status(400).json({ success: false, message: 'Outstanding library fines must be paid before approving this clearance.' });
				}
				if (checklistSettings.libraryAccountChecked && hasOtherOutstandingItems) {
					return res.status(400).json({ success: false, message: 'Resolve other Library account obligations before approving this clearance.' });
				}
				if (rules.checkLostDamagedBooks && hasLostOrDamagedMaterials) {
					return res.status(400).json({ success: false, message: 'Resolve lost or damaged library materials before approving this clearance.' });
				}
			}
			requestUpdates.libraryStatus = status;
			requestUpdates.libraryVerificationResult = verificationResult;
			requestUpdates.libraryComment = comment;
			requestUpdates.libraryReturnReason = returnReason;
			requestUpdates.libraryReviewedBy = req.user?.fullName || req.user?.name || 'Library Officer';
			requestUpdates.libraryReviewedAt = new Date();
			if (status === 'Rejected') {
				requestUpdates.status = 'Returned';
				requestUpdates.overallStatus = 'Returned';
				requestUpdates.returnReason = returnReason;
				requestUpdates.returnedBy = requestUpdates.libraryReviewedBy;
				requestUpdates.returnedOffice = 'Library Office';
				requestUpdates.returnedAt = requestUpdates.libraryReviewedAt;
				requestUpdates.returnedReason = returnReason;
				requestUpdates.returnedRemark = comment;
				requestUpdates.affectedField = requestUpdates.affectedField || libraryDecision.affectedField || 'Library Clearance';
			}
		}
		if (hasDepartmentDecision) {
			const existingClearance = await Clearance.findById(req.params.id).select('workflow').lean();
			if (!existingClearance) return res.status(404).json({ success: false, message: 'Clearance request not found.' });
			const workflow = Array.isArray(existingClearance.workflow) ? [...existingClearance.workflow] : [];
			const departmentIndex = workflow.findIndex((step) => /department/i.test(step.office || step.name || ''));
			const decisionRecord = requestUpdates.departmentClearances[0];
			if (departmentIndex >= 0) workflow[departmentIndex] = { ...workflow[departmentIndex], ...decisionRecord };
			else workflow.unshift({ office: 'Department Head', ...decisionRecord });
			requestUpdates.workflow = workflow;
		}
		const resolvedCurrentStep = (() => {
			if (requestUpdates.departmentStatus) return resolveNextStepAfterDecision('Department Head', requestUpdates.departmentStatus);
			if (libraryDecision?.status) return resolveNextStepAfterDecision('Library', libraryDecision.status);
			if (requestUpdates.financeStatus) return resolveNextStepAfterDecision('Finance Office', requestUpdates.financeStatus);
			if (requestUpdates.propertyStatus) return resolveNextStepAfterDecision('Property / Asset Office', requestUpdates.propertyStatus);
			if (requestUpdates.ictStatus) return resolveNextStepAfterDecision('ICT Office', requestUpdates.ictStatus);
			return undefined;
		})();
		if (resolvedCurrentStep) requestUpdates.currentStep = resolvedCurrentStep;
		if (requestUpdates.departmentStatus === 'Approved') {
			const routingFilter = mongoose.isValidObjectId(req.params.id)
				? { $or: [{ _id: req.params.id }, { requestId: req.params.id }] }
				: { requestId: req.params.id };
			const routing = await Clearance.findOne(routingFilter)
				.select('manualRoutingEnabled assignedDepartments')
				.lean();
			if (routing?.manualRoutingEnabled) {
				requestUpdates.currentStep = routing.assignedDepartments?.[0] || 'Final HR Clearance';
			}
		}
		if (isResubmission) {
			const clearanceFilter = mongoose.isValidObjectId(req.params.id)
				? { $or: [{ _id: req.params.id }, { requestId: req.params.id }] }
				: { requestId: req.params.id };
			const existingClearance = await Clearance.findOne(clearanceFilter).select('workflow departmentClearances initialHRStatus transportReview requestSource').lean();
			if (!existingClearance) return res.status(404).json({ success: false, message: 'Clearance request not found.' });
			requestUpdates.workflow = (Array.isArray(existingClearance.workflow) ? existingClearance.workflow : []).map((step) => {
				if (String(step.status || '').toLowerCase() !== 'returned' && String(step.status || '').toLowerCase() !== 'rejected') return step;
				const office = String(step.office || step.name || '').toLowerCase();
				if (existingClearance.requestSource === 'HR Officer' && !requestUpdates.currentStep) {
					requestUpdates.currentStep = step.office || step.name || 'HR Officer';
				}
				if (office.includes('ict')) requestUpdates.ictStatus = 'Pending';
				if (office.includes('finance')) {
					requestUpdates.financeStatus = 'Pending';
					resubmittedToFinance = true;
				}
				if (office.includes('library')) requestUpdates.libraryStatus = 'Pending';
				if (office.includes('property')) requestUpdates.propertyStatus = 'Pending';
				if (office.includes('transport')) {
					requestUpdates.transportStatus = 'Pending';
					requestUpdates.transportReturnReason = '';
					requestUpdates.transportOfficerComment = '';
					requestUpdates.transportReviewedBy = '';
					requestUpdates.transportReviewedAt = null;
					requestUpdates.transportReview = resetTransportReviewForResubmission(existingClearance.transportReview || {});
					requestUpdates.currentStep = 'Transport Office';
				}
				if (office.includes('department')) requestUpdates.departmentStatus = 'Pending';
				return {
					...step,
					status: 'Pending',
					updatedAt: new Date(),
					comment: '',
					remarks: '',
					returnReason: '',
					...(office.includes('transport') ? { approvedBy: '', reviewedBy: '', reviewedAt: null, completedAt: null } : {}),
				};
			});
			requestUpdates.departmentClearances = (Array.isArray(existingClearance.departmentClearances) ? existingClearance.departmentClearances : []).map((item) => {
				if (!['returned', 'rejected'].includes(String(item.status || '').toLowerCase())) return item;
				return { ...item, status: 'Pending', updatedAt: new Date(), comment: '', remarks: '', returnReason: '' };
			});
			requestUpdates.departmentReturnReason = '';
			requestUpdates.departmentComment = resolutionRemark;
			if (existingClearance.initialHRStatus === 'Returned') {
				requestUpdates.initialHRStatus = 'Pending';
				requestUpdates.currentStep = 'Initial HR Review';
				requestUpdates.workflow = [
					{ office: 'Initial HR Review', status: 'Pending', updatedAt: new Date() },
					...(Array.isArray(requestUpdates.workflow) ? requestUpdates.workflow : []),
				];
			}
		}
		const clearanceFilter = mongoose.isValidObjectId(req.params.id)
			? { $or: [{ _id: req.params.id }, { requestId: req.params.id }] }
			: { requestId: req.params.id };
		const previousClearance = await Clearance.findOne(clearanceFilter).select('libraryStatus departmentStatus workflow transportStatus returnedOffice requestSource').lean();
		if (previousClearance?.requestSource === 'HR Officer' && ['Returned', 'Rejected'].includes(requestUpdates.status)) {
			requestUpdates.currentStep = 'HR Officer';
		}
		if (libraryDecision && previousClearance) {
			const libraryWorkflowStatus = libraryDecision.status === 'Completed'
				? 'Completed'
				: libraryDecision.status === 'Rejected' ? 'Returned' : 'Under Review';
			const workflow = Array.isArray(previousClearance.workflow) ? [...previousClearance.workflow] : [];
			const libraryIndex = workflow.findIndex((step) => /library/i.test(step.office || step.name || ''));
			const libraryStep = {
				...(libraryIndex >= 0 ? workflow[libraryIndex] : { office: 'Library Office' }),
				status: libraryWorkflowStatus,
				updatedAt: new Date(),
				comment: libraryDecision.comment || '',
				returnReason: libraryDecision.returnReason || '',
			};
			if (libraryIndex >= 0) workflow[libraryIndex] = libraryStep;
			else workflow.push(libraryStep);
			requestUpdates.workflow = workflow;
		}
		const clearance = await Clearance.findOneAndUpdate(clearanceFilter, requestUpdates, { returnDocument: 'after', runValidators: true }).lean();
		if (!clearance) return res.status(404).json({ success: false, message: 'Clearance request not found.' });
		const previousPropertyWasReturned = previousClearance?.propertyStatus === 'Returned'
			|| previousClearance?.propertyStatus === 'Rejected'
			|| previousClearance?.workflow?.some((step) => /property/i.test(step.office || step.name || '') && /returned|rejected/i.test(step.status || ''));
		const previousTransportWasReturned = previousClearance?.transportStatus === 'Returned'
			|| previousClearance?.returnedOffice === 'Transport Office'
			|| previousClearance?.workflow?.some((step) => /transport/i.test(step.office || step.name || '') && /returned|rejected/i.test(step.status || ''));
		const previousTransportWasReviewed = ['Approved', 'Returned'].includes(previousClearance?.transportStatus)
			|| previousClearance?.workflow?.some((step) => /transport/i.test(step.office || step.name || '') && /completed|approved|returned|rejected/i.test(step.status || ''));
		if (requestUpdates.departmentStatus === 'Approved') {
			await notifyDepartmentHeads({
				clearance,
				type: 'CLEARANCE_APPROVED',
				title: 'Clearance Approved',
				message: `Department clearance for ${clearance.employeeName || 'the employee'} was successfully approved.`,
			});
			if (hasTransportOffice(clearance)) {
				await notifyTransportOfficers({
					type: 'TRANSPORT_NEW_CLEARANCE_REQUEST',
					title: 'New Clearance Request',
					message: `${clearance.employeeName || 'An employee'}${clearance.employeeId ? ` (${clearance.employeeId})` : ''} has a clearance request ready for Transport review.`,
					employeeName: clearance.employeeName,
					employeeId: clearance.employeeId,
					requestId: clearance.requestId,
					eventDate: clearance.updatedAt || new Date(),
					actionText: 'Review Request',
					actionLink: '/transport-office/requests',
				});
			}
		}
		if (requestUpdates.departmentStatus === 'Returned' || requestUpdates.departmentStatus === 'Rejected') {
			await notifyDepartmentHeads({
				clearance,
				type: 'CLEARANCE_RETURNED',
				title: 'Clearance Returned',
				message: `${clearance.employeeName || 'The employee'}'s clearance request was returned for correction.`,
			});
		}
		if (isResubmission) {
			await notifyDepartmentHeads({
				clearance,
				type: 'EMPLOYEE_UPDATED_REQUEST_DEPARTMENT',
				title: 'Employee Updated Request',
				message: `${clearance.employeeName || 'The employee'} updated and resubmitted the clearance request.`,
				actionText: 'Review Request',
			});
			if (hasTransportOffice(clearance) && previousTransportWasReviewed) {
				const notificationType = previousTransportWasReturned
					? 'TRANSPORT_CLEARANCE_RESUBMITTED'
					: 'TRANSPORT_EMPLOYEE_RESUBMISSION';
				await notifyTransportOfficers({
					type: notificationType,
					title: previousTransportWasReturned ? 'Clearance Resubmitted' : 'Employee Resubmission',
					message: `${clearance.employeeName || 'An employee'}${clearance.employeeId ? ` (${clearance.employeeId})` : ''} resubmitted clearance request ${clearance.requestId || ''}.`,
					employeeName: clearance.employeeName,
					employeeId: clearance.employeeId,
					requestId: clearance.requestId,
					eventDate: clearance.updatedAt || new Date(),
					actionText: 'Review Request',
					actionLink: '/transport-office/requests',
				});
			}
		}
		if (clearance.status === 'Completed') {
			await notifyDepartmentHeads({
				clearance,
				type: 'ALL_DEPARTMENT_TASKS_COMPLETED',
				title: 'All Department Tasks Completed',
				message: `All required clearance tasks for ${clearance.employeeName || 'the employee'} have been completed.`,
			});
		}
		if (requestUpdates.departmentStatus === 'Approved') {
			if (isAssignedOffice(clearance, /library/i)) {
				await notifyLibraryOfficers({
					clearance,
					type: 'CLEARANCE_READY_FOR_LIBRARY',
					title: 'Clearance Ready for Library Review',
					message: `${clearance.employeeName || 'An employee'}'s clearance request was approved by the Department Head and is ready for Library review.`,
					actionText: 'Review Request',
				});
			}
			if (isAssignedOffice(clearance, /property|asset/i)) await notifyPropertyOfficers(clearance);
			if (isAssignedOffice(clearance, /finance/i)) {
				await notifyFinanceOfficers({
					type: 'CLEARANCE_READY_FOR_FINANCE',
					employeeName: clearance.employeeName,
					requestId: clearance.requestId,
				});
			}
			if (requiresIctClearance(clearance)) {
				await createIctClearanceRequestFromClearance(clearance);
				await notifyIctOfficers({
					type: 'NEW_CLEARANCE_REQUEST',
					employeeName: clearance.employeeName,
					employeeId: clearance.employeeId,
					requestId: clearance.requestId,
					message: `${clearance.employeeName || 'An employee'}'s clearance was approved by the Department Head and is ready for ICT review.`,
				});
			}
			await notifyDynamicClearanceOffices(clearance);
		}
		if (libraryDecision?.status === 'Completed') {
			await notifyFinanceOfficers({
				type: 'CLEARANCE_READY_FOR_FINANCE',
				employeeName: clearance.employeeName,
				requestId: clearance.requestId,
			});
		}
		if (resubmittedToFinance) {
			await notifyFinanceOfficers({
				type: 'REQUEST_RETURNED_TO_FINANCE',
				employeeName: clearance.employeeName,
				requestId: clearance.requestId,
			});
			await notifyFinanceOfficers({
				type: 'EMPLOYEE_UPDATED_REQUEST',
				employeeName: clearance.employeeName,
				requestId: clearance.requestId,
			});
		}
		await recordAuditLog({
			req,
			user: req.user,
			action: clearance.status === 'Completed' ? 'COMPLETE_CLEARANCE' : clearance.status === 'Rejected' ? 'REJECT_CLEARANCE' : 'UPDATE_CLEARANCE',
			module: 'Clearance Request',
			description: `${clearance.employeeName || 'An employee'} clearance status changed to ${clearance.status}.`,
			oldValues: { requestId: clearance.requestId, status: requestUpdates.status || 'Previous status' },
			newValues: { requestId: clearance.requestId, status: clearance.status },
		});
		if (requiresIctClearance(clearance)) await createIctClearanceRequestFromClearance(clearance);
		const statusMessages = {
			Cancelled: ['Clearance Request Cancelled', `Your clearance request ${clearance.requestId || ''} has been cancelled.`, 'cancelled'],
			Completed: ['Clearance Updated', `Your ${clearance.department || 'clearance'} has been completed successfully.`, 'CLEARANCE_UPDATED'],
			Returned: ['Clearance Request Returned', clearance.returnReason || clearance.libraryReturnReason || 'Your clearance request requires your attention. Please review the returned issue and resubmit.', 'CLEARANCE_REQUEST_RETURNED'],
			Rejected: ['Clearance Request Returned', clearance.returnReason || clearance.libraryReturnReason || 'Your clearance request requires your attention. Please review the officer remark and resubmit.', 'CLEARANCE_REQUEST_RETURNED'],
			Approved: ['Department Clearance Approved', `Department clearance for ${clearance.requestId || 'your request'} was approved.`, 'CLEARANCE_APPROVED'],
			'In Progress': ['Clearance In Progress', 'Your clearance request is currently under review. Some offices are still pending.', 'CLEARANCE_IN_PROGRESS'],
			Pending: ['Clearance In Progress', 'Your clearance request is currently under review. Some offices are still pending.', 'CLEARANCE_IN_PROGRESS'],
		};
		const officeApproval = libraryDecision?.status === 'Completed'
			? ['Library Clearance Approved', `Library Office approved clearance ${clearance.requestId || 'for your request'}.`, 'CLEARANCE_PROGRESS_UPDATED']
			: Array.isArray(requestUpdates.departmentClearances) && requestUpdates.departmentStatus === 'Approved'
				? ['Department Clearance Approved', `Department Head approved clearance ${clearance.requestId || 'for your request'}.`, 'CLEARANCE_PROGRESS_UPDATED']
				: requestUpdates.financeStatus === 'Approved'
					? ['Finance Clearance Approved', `Finance Office approved clearance ${clearance.requestId || 'for your request'}.`, 'CLEARANCE_PROGRESS_UPDATED']
					: requestUpdates.propertyStatus === 'Approved'
						? ['Property Clearance Approved', `Property / Asset Office approved clearance ${clearance.requestId || 'for your request'}.`, 'CLEARANCE_PROGRESS_UPDATED']
						: requestUpdates.ictStatus === 'Approved'
							? ['ICT Clearance Approved', `ICT Office approved clearance ${clearance.requestId || 'for your request'}.`, 'CLEARANCE_PROGRESS_UPDATED']
							: null;
		const [title, message, type] = officeApproval || statusMessages[clearance.status] || statusMessages.Pending;
		if (clearance.requestSource !== 'HR Officer') {
			await createEmployeeNotification({ clearance, title, message, type, actionText: clearance.status === 'Returned' ? 'View Request' : 'View Clearance' });
		}
		const officeProgress = getOfficeProgress(clearance);
		const allRequiredOfficesCleared = officeProgress.total > 0 && officeProgress.completed === officeProgress.total;
		const decisionOffice = libraryDecision ? 'Library Office' : Array.isArray(requestUpdates.departmentClearances) ? 'Department Head' : 'Clearance Office';
		const hrEvent = clearance.status === 'Cancelled'
			? {
				title: 'Clearance Request Cancelled',
				message: `Request ${clearance.requestId || ''} for ${clearance.employeeName || 'Employee'} has been cancelled.`,
				type: 'cancelled', actionText: 'View Details', actionLink: '/hr-office/clearance-requests'
			}
			: clearance.status === 'Returned' || clearance.status === 'Rejected'
			? {
				title: 'Clearance Request Returned',
				message: `${clearance.employeeName || 'Employee'}'s clearance request was returned for correction. Reason: ${clearance.returnReason || clearance.libraryReturnReason || clearance.reason || 'Review required.'}`,
				type: 'CLEARANCE_REQUEST_RETURNED', actionText: 'View Details', actionLink: '/hr-office/clearance-requests'
			}
			: isResubmission
				? {
					title: 'Clearance Request Resubmitted',
					message: `${clearance.employeeName || 'Employee'} has resolved the issue and resubmitted the clearance request.`,
					type: 'CLEARANCE_RESUBMITTED', actionText: 'Review Request', actionLink: '/hr-office/clearance-requests'
				}
				: officeProgress.completed > 0
					? {
						title: allRequiredOfficesCleared ? 'Clearance Ready for Final Review' : 'Office Clearance Completed',
						message: allRequiredOfficesCleared
							? `All required offices have cleared ${clearance.employeeName || 'the employee'}. The request is now ready for final HR review.`
							: `Request ${clearance.requestId || 'N/A'} | Employee: ${clearance.employeeName || 'Employee'}. ${decisionOffice} has approved the clearance. Progress: ${officeProgress.completed}/${officeProgress.total} offices.`,
						type: allRequiredOfficesCleared ? 'ready_review' : 'CLEARANCE_PROGRESS_UPDATED',
						actionText: allRequiredOfficesCleared ? 'View Final Clearance' : 'View Clearance',
						actionLink: '/hr-office/final-hr-clearance'
					}
					: null;
		if (hrEvent) await notifyHrOfficers({ ...hrEvent, clearance });
		const previousDepartmentWasReturned = previousClearance?.departmentStatus === 'Returned'
			|| previousClearance?.workflow?.some((step) => /department/i.test(step.office || step.name || '') && /returned|rejected/i.test(step.status || ''));
		if (isResubmission && previousDepartmentWasReturned) {
			await notifyDepartmentHeads({
				clearance,
				type: 'CLEARANCE_RESUBMITTED',
				title: 'Clearance Request Resubmitted',
				message: `${clearance.employeeName || 'An employee'} has resubmitted ${clearance.requestId || 'the request'} after addressing the returned issue.`,
				actionText: 'Review Again',
			});
		} else if (String(req.user?.role || '').match(/^hr[ _]?officer$/i)) {
			await notifyDepartmentHeads({
				clearance,
				type: requestUpdates.departmentStatus === 'Pending' ? 'REQUEST_ASSIGNED' : 'CLEARANCE_UPDATED',
				title: requestUpdates.departmentStatus === 'Pending' ? 'Clearance Request Assigned' : 'Clearance Request Updated',
				message: requestUpdates.departmentStatus === 'Pending'
					? `A clearance request has been sent to your department for review. Employee: ${clearance.employeeName || 'Employee'}. Request No: ${clearance.requestId || 'N/A'}`
					: `HR Officer updated ${clearance.requestId || 'a clearance request'}.`,
				actionText: requestUpdates.departmentStatus === 'Pending' ? 'Review Request' : 'View Details',
			});
			await notifyDepartmentHeads({
				clearance,
				type: 'FINAL_HR_CLEARANCE_UPDATE',
				title: 'Final HR Clearance Update',
				message: `HR updated the final clearance status for ${clearance.employeeName || 'the employee'}.`,
				actionText: 'View Details',
			});
		}
		if (isResubmission && previousPropertyWasReturned) await notifyPropertyOfficers(clearance, 'resubmitted');
		if (isResubmission && (previousClearance?.libraryStatus === 'Returned' || previousClearance?.workflow?.some((step) => /library/i.test(step.office || step.name || '') && /returned|rejected/i.test(step.status || '')))) {
			await notifyLibraryOfficers({
				clearance,
				type: 'Clearance Resubmitted',
				title: 'Clearance Resubmitted',
				message: `${clearance.employeeName || 'Employee'} has resolved the returned issue and resubmitted request ${clearance.requestId || 'N/A'}.`,
				actionText: 'Review Again',
			});
		}
		if (!isResubmission && clearance.libraryStatus === 'Pending' && previousClearance?.libraryStatus && previousClearance.libraryStatus !== 'Pending') {
			await notifyLibraryOfficers({
				clearance,
				type: 'Clearance Awaiting Your Review',
				title: 'Clearance Awaiting Your Review',
				message: `Clearance request ${clearance.requestId || 'N/A'} is waiting for your Library review.`,
				actionText: 'Review',
			});
		}
		const hasOutstandingMaterial = Array.isArray(clearance.outstandingItems) && clearance.outstandingItems.length > 0;
		if (hasOutstandingMaterial) {
			await notifyLibraryOfficers({
				clearance,
				type: 'Outstanding Library Material',
				title: 'Outstanding Library Material',
				message: `${clearance.employeeName || 'Employee'} has outstanding library material that must be returned before clearance.`,
				actionText: 'View Employee',
			});
		}
		const libraryFine = Number(clearance.libraryFine ?? clearance.outstandingLibraryFine ?? 0);
		if (libraryFine > 0) {
			await notifyLibraryOfficers({
				clearance,
				type: 'Outstanding Library Fine',
				title: 'Outstanding Library Fine',
				message: `An outstanding library fine was found for employee ${clearance.employeeName || 'Employee'}.`,
				actionText: 'View Details',
			});
		}
		if (requiresIctClearance(clearance) && isResubmission) {
			await notifyIctOfficers({
				type: 'CLEARANCE_RESUBMITTED',
				employeeName: clearance.employeeName || 'An employee',
				employeeId: clearance.employeeId || clearance.employee?.employeeId || '',
				requestId: clearance.requestId,
				message: `${clearance.employeeName || 'An employee'}'s ICT clearance request requires your attention.`,
			});
		}
		return res.status(200).json({ success: true, clearance });
	} catch (error) {
		console.error('Unable to update clearance request:', error);
		return res.status(400).json({ success: false, message: error.message || 'Unable to update clearance request.' });
	}
};

export { getClearances, getLibraryReport, getMyClearances, getClearance, addClearance, updateClearance, deleteClearance };
