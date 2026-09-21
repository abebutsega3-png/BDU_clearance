import Clearance from '../models/clearance.js';
import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Employee from '../models/employee.js';
import Department from '../models/department.js';
import {
  DEFAULT_REQUIRED_OFFICES,
  buildRequiredOfficeWorkflow,
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
		const libraryOfficers = await User.find({ role: { $regex: '^library officer$', $options: 'i' } }).select('_id name');
		const requestId = clearance.requestId || null;
		const notifications = [];
		for (const officer of libraryOfficers) {
			const exists = await Notification.exists({ recipientId: officer._id, type, relatedRequestId: requestId });
			if (!exists) {
				notifications.push({
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
				});
			}
		}
		if (notifications.length) await Notification.insertMany(notifications);
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
	try {
		const role = String(_req.user?.role || '').toLowerCase().replace(/[_-]+/g, ' ');
		const workflowFilter = {};
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
		const roleVisibility = officeVisibility[role] || {};
		const query = Object.keys(roleVisibility).length ? { ...workflowFilter, ...roleVisibility } : workflowFilter;
		const clearances = await Clearance.find(query).sort({ createdAt: -1 }).lean();
		return res.status(200).json({ success: true, clearances });
	} catch (error) {
		console.error('Error in getClearances:', error);
		return res.status(500).json({ success: false, message: 'Server error while fetching clearances.' });
	}
};

const getLibraryReport = async (req, res) => {
	try {
		const { reportType = 'summary', fromDate, toDate, status, employee, department } = req.query;
		const filter = { $and: [{
			$or: [
				{ requiredOffices: { $regex: 'library', $options: 'i' } },
				{ libraryStatus: { $exists: true } },
			],
		}] };
		const dateFilter = {};
		if (fromDate) dateFilter.$gte = new Date(`${fromDate}T00:00:00.000Z`);
		if (toDate) dateFilter.$lte = new Date(`${toDate}T23:59:59.999Z`);
		if (Object.keys(dateFilter).length) filter.createdAt = dateFilter;
		if (department) filter.$and.push({ $or: [
			{ 'department.name': department },
			{ department },
		] });
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
		if (reportType && reportType !== 'summary' && reportType !== 'all') {
			filter.$and.push({ libraryStatus: { $in: statusGroups[reportType] || [reportType] } });
		}

		const clearances = await Clearance.find(filter).sort({ createdAt: -1 }).lean();
		const employeeIds = clearances.map((item) => item.employeeId).filter(Boolean);
		const employees = await Employee.find({ employeeId: { $in: employeeIds } }).select('employeeId fullName department').lean();
		const employeeById = new Map(employees.map((item) => [item.employeeId, item]));
		const rows = clearances.map((item) => {
			const employeeRecord = employeeById.get(item.employeeId);
			const rawStatus = item.libraryStatus || 'Pending';
			return {
				...item,
				employeeName: item.employeeName || employeeRecord?.fullName || item.employee?.fullName || item.employeeId || '',
				department: item.department?.name || item.department || employeeRecord?.department || '',
				libraryReportStatus: rawStatus === 'In Progress' ? 'Under Review' : rawStatus === 'Completed' ? 'Approved' : rawStatus === 'Rejected' ? 'Returned' : rawStatus,
				requestDate: item.createdAt || item.requestDate,
			};
		});
		const getReportStatus = (item) => item.libraryReportStatus;
		const counts = {
			total: rows.length,
			pending: rows.filter((item) => getReportStatus(item) === 'Pending').length,
			underReview: rows.filter((item) => getReportStatus(item) === 'Under Review').length,
			returned: rows.filter((item) => getReportStatus(item) === 'Returned').length,
			approved: rows.filter((item) => getReportStatus(item) === 'Approved').length,
			completed: rows.filter((item) => item.libraryStatus === 'Completed').length,
		};
		const byDepartment = rows.reduce((result, item) => {
			result[item.department || 'Other'] = (result[item.department || 'Other'] || 0) + 1;
			return result;
		}, {});
		const trend = Array.from({ length: 7 }, (_, index) => {
			const day = new Date();
			day.setHours(0, 0, 0, 0);
			day.setDate(day.getDate() - (6 - index));
			const nextDay = new Date(day);
			nextDay.setDate(nextDay.getDate() + 1);
			return {
				date: day.toISOString().slice(0, 10),
				label: day.toLocaleDateString('en-US', { weekday: 'short' }),
				count: rows.filter((item) => item.createdAt >= day && item.createdAt < nextDay).length,
			};
		});
		return res.status(200).json({ success: true, rows, counts, byDepartment, trend });
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
		const normalizedClearances = clearances.map((clearance) => {
			const ictStep = Array.isArray(clearance.workflow)
				? clearance.workflow.find((step) => /ict/i.test(step.office || step.name || ''))
				: null;
			const ictDecision = clearance.ictClearance || {};
			return {
				...clearance,
				ictStatus: clearance.ictStatus || ictDecision.status || ictStep?.status || 'Pending',
				ictRemarks: clearance.ictRemarks || ictDecision.comment || ictStep?.remarks || '',
				ictReturnReason: clearance.ictReturnReason || ictDecision.returnReason || ictStep?.returnReason || '',
			};
		});
		return res.status(200).json({ success: true, clearances: normalizedClearances });
	} catch (error) {
		console.error('Error in getMyClearances:', error);
		return res.status(500).json({ success: false, message: 'Server error while fetching your clearances.' });
	}
};

const getClearance = async (req, res) => {
	try {
		const clearance = await Clearance.findOne({ $or: [{ _id: req.params.id }, { requestId: req.params.id }] }).lean();
		if (!clearance) return res.status(404).json({ success: false, message: 'Clearance request not found.' });
		const role = String(req.user?.role || '').toLowerCase().replace(/[_-]+/g, ' ');
		const officeByRole = {
			'finance officer': 'Finance Office',
			'library officer': 'Library',
			'property officer': 'Property / Asset Office',
			'property / asset officer': 'Property / Asset Office',
			'ict officer': 'ICT Office',
		};
		const parallelOffice = ['finance officer', 'library officer', 'property officer', 'property / asset officer', 'ict officer'].includes(role);
		const canView = officeByRole[role]
			? (parallelOffice && clearance.departmentStatus === 'Approved'
				? true
				: isRequestVisibleToOffice(clearance, officeByRole[role]))
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

const addClearance = async (req, res) => {
	try {
		const employeeRecord = req.body?.employeeId
			? await Employee.findOne({ employeeId: req.body.employeeId }).select('employeeId fullName department position campus phone email').lean()
			: null;
		const resolvedDepartment = employeeRecord?.department || req.user?.department || req.body?.department || '';
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
		const requestedOffices = normalizeRequiredOffices([
			...(req.body?.requiredOffices || req.body?.offices || DEFAULT_REQUIRED_OFFICES),
			'Department Head',
		]);
		const workflow = Array.isArray(req.body?.workflow) && req.body.workflow.length
			? req.body.workflow
				.map((step) => ({
					office: step?.office || step?.name || '',
					status: ['Pending', 'In Progress', 'Completed', 'Rejected'].includes(step?.status) ? step.status : 'Pending',
					updatedAt: step?.updatedAt || new Date().toISOString(),
				}))
				.filter((step) => step.office)
			: buildRequiredOfficeWorkflow(requestedOffices);
		if (!workflow.some((step) => /department\s*head|^department$/i.test(String(step.office || '').trim()))) {
			workflow.unshift({ office: 'Department Head', status: 'Pending', updatedAt: new Date().toISOString() });
		}

		const payload = {
			...(req.body || {}),
			employeeId: employeeRecord?.employeeId || req.body?.employeeId || req.user?.employeeId || '',
			department: resolvedDepartment,
			departmentStatus: 'Pending',
			employeeName: resolvedEmployeeName,
			clearanceType: req.body?.clearanceType || req.body?.clearanceReason || 'Resignation',
			requiredOffices: requestedOffices,
			currentStep: 'Department Head',
			workflow,
			status: req.body?.status || 'Pending',
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
				action: 'SUBMIT_CLEARANCE',
				module: 'Clearance Request',
				description: `${clearance.employeeName || 'An employee'} submitted a clearance request (${clearance.requestId || clearance._id}).`,
				newValues: {
					requestId: clearance.requestId,
					employeeId: clearance.employeeId,
					status: clearance.status,
					requiredOffices: clearance.requiredOffices,
				},
			});
		} catch (auditError) {
			console.error('Failed to record audit log:', auditError.message);
		}

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

		await notifyDepartmentHeads({
			clearance,
			type: 'NEW_CLEARANCE_REQUEST',
			title: 'New Clearance Request',
			message: `${clearance.employeeName || 'An employee'} submitted a clearance request. Request No: ${clearance.requestId || 'N/A'}`,
		});
		return res.status(201).json({ success: true, clearance });
	} catch (error) {
		console.error('Error in addClearance:', error);
		return res.status(400).json({ success: false, message: 'Unable to create clearance request.' });
	}
};

const updateClearance = async (req, res) => {
	try {
		const { libraryDecision, ...requestUpdates } = req.body || {};
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
			const existingClearance = await Clearance.findOne(requestFilter).select('departmentStatus').lean();
			if (!existingClearance) return res.status(404).json({ success: false, message: 'Clearance request not found.' });
			if (existingClearance.departmentStatus !== 'Approved') {
				return res.status(400).json({ success: false, message: 'This request is waiting for Department Head approval.' });
			}
		}
		const isResubmission = requestUpdates.resubmitted === true || requestUpdates.status === 'Resubmitted';
		let resubmittedToFinance = false;
		const departmentDecision = Array.isArray(requestUpdates.departmentClearances) && requestUpdates.departmentClearances.length;
		if (isResubmission) {
			requestUpdates.status = 'Pending';
			requestUpdates.overallStatus = 'In Progress';
			requestUpdates.returnReason = '';
			requestUpdates.officerComment = requestUpdates.resolutionRemark || '';
		}
		if (Array.isArray(requestUpdates.departmentClearances) && requestUpdates.departmentClearances.length) {
			const departmentDecision = requestUpdates.departmentClearances[requestUpdates.departmentClearances.length - 1];
			const departmentStatus = departmentDecision.status === 'Completed' ? 'Approved' : departmentDecision.status;
			if (!['Pending', 'In Progress', 'Approved', 'Returned'].includes(departmentStatus)) {
				return res.status(400).json({ success: false, message: 'Invalid Department Head decision status.' });
			}
			if (departmentStatus === 'Returned' && !String(departmentDecision.returnReason || '').trim()) {
				return res.status(400).json({ success: false, message: 'Return reason is required.' });
			}
			const reviewedAt = new Date();
			requestUpdates.departmentStatus = departmentStatus;
			if (departmentStatus === 'Approved') {
				requestUpdates.status = 'In Progress';
				requestUpdates.overallStatus = 'In Progress';
			}
			if (departmentStatus === 'Returned') {
				requestUpdates.status = 'Returned';
				requestUpdates.overallStatus = 'Returned';
				requestUpdates.returnReason = departmentDecision.returnReason.trim();
			}
			requestUpdates.departmentReturnReason = departmentDecision.returnReason || '';
			const departmentReviewer = req.user?.fullName || req.user?.name || '';
			requestUpdates.departmentReviewedBy = departmentReviewer;
			requestUpdates.departmentReviewedAt = reviewedAt;
			requestUpdates.departmentComment = departmentDecision.comment || requestUpdates.remarks || '';
			requestUpdates.departmentClearance = {
				...departmentDecision,
				status: departmentStatus,
				reviewedBy: departmentReviewer,
				reviewedAt,
				comment: departmentDecision.comment || requestUpdates.remarks || '',
				returnReason: departmentDecision.returnReason || '',
			};
			requestUpdates.departmentClearances = [{
				...departmentDecision,
				status: departmentStatus,
				reviewedBy: req.user?._id || req.user?.id || req.user?.name || '',
				reviewedAt,
			}];
		}
		if (libraryDecision) {
			const { status, verificationResult = '', comment = '', returnReason = '' } = libraryDecision;
			if (!['In Progress', 'Completed', 'Rejected'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid library decision status.' });
			if (status === 'Rejected' && !returnReason.trim()) return res.status(400).json({ success: false, message: 'Return reason is required.' });
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
			}
		}
		if (Array.isArray(requestUpdates.departmentClearances) && requestUpdates.departmentClearances.length) {
			const existingClearance = await Clearance.findById(req.params.id).select('workflow').lean();
			if (!existingClearance) return res.status(404).json({ success: false, message: 'Clearance request not found.' });
			const departmentDecision = requestUpdates.departmentClearances[requestUpdates.departmentClearances.length - 1];
			const workflow = Array.isArray(existingClearance.workflow) ? [...existingClearance.workflow] : [];
			const departmentIndex = workflow.findIndex((step) => /department/i.test(step.office || step.name || ''));
			if (departmentIndex >= 0) workflow[departmentIndex] = { ...workflow[departmentIndex], ...departmentDecision };
			else workflow.unshift({ office: 'Department Head', ...departmentDecision });
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
		if (isResubmission) {
			const clearanceFilter = mongoose.isValidObjectId(req.params.id)
				? { $or: [{ _id: req.params.id }, { requestId: req.params.id }] }
				: { requestId: req.params.id };
			const existingClearance = await Clearance.findOne(clearanceFilter).select('workflow departmentClearances').lean();
			if (!existingClearance) return res.status(404).json({ success: false, message: 'Clearance request not found.' });
			requestUpdates.workflow = (Array.isArray(existingClearance.workflow) ? existingClearance.workflow : []).map((step) => {
				if (String(step.status || '').toLowerCase() !== 'returned' && String(step.status || '').toLowerCase() !== 'rejected') return step;
				const office = String(step.office || step.name || '').toLowerCase();
				if (office.includes('ict')) requestUpdates.ictStatus = 'Pending';
				if (office.includes('finance')) {
					requestUpdates.financeStatus = 'Pending';
					resubmittedToFinance = true;
				}
				if (office.includes('library')) requestUpdates.libraryStatus = 'Pending';
				if (office.includes('property')) requestUpdates.propertyStatus = 'Pending';
				if (office.includes('department')) requestUpdates.departmentStatus = 'Pending';
				return { ...step, status: 'Pending', updatedAt: new Date(), comment: '', remarks: '', returnReason: '' };
			});
			requestUpdates.departmentClearances = (Array.isArray(existingClearance.departmentClearances) ? existingClearance.departmentClearances : []).map((item) => {
				if (!['returned', 'rejected'].includes(String(item.status || '').toLowerCase())) return item;
				return { ...item, status: 'Pending', updatedAt: new Date(), comment: '', remarks: '', returnReason: '' };
			});
			requestUpdates.departmentReturnReason = '';
			requestUpdates.departmentComment = requestUpdates.resolutionRemark || '';
		}
		const clearanceFilter = mongoose.isValidObjectId(req.params.id)
			? { $or: [{ _id: req.params.id }, { requestId: req.params.id }] }
			: { requestId: req.params.id };
		const previousClearance = await Clearance.findOne(clearanceFilter).select('libraryStatus departmentStatus workflow').lean();
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
		if (requestUpdates.departmentStatus === 'Approved') {
			await notifyDepartmentHeads({
				clearance,
				type: 'CLEARANCE_APPROVED',
				title: 'Clearance Approved',
				message: `Department clearance for ${clearance.employeeName || 'the employee'} was successfully approved.`,
			});
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
			await notifyLibraryOfficers({
				clearance,
				type: 'CLEARANCE_READY_FOR_LIBRARY',
				title: 'Clearance Ready for Library Review',
				message: `${clearance.employeeName || 'An employee'}'s clearance request was approved by the Department Head and is ready for Library review.`,
				actionText: 'Review Request',
			});
			await notifyPropertyOfficers(clearance);
			await notifyFinanceOfficers({
				type: 'CLEARANCE_READY_FOR_FINANCE',
				employeeName: clearance.employeeName,
				requestId: clearance.requestId,
			});
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
		await createEmployeeNotification({ clearance, title, message, type, actionText: clearance.status === 'Returned' ? 'View Request' : 'View Clearance' });
		const clearanceItems = Array.isArray(clearance.departmentClearances) ? clearance.departmentClearances : [];
		const clearedCount = clearanceItems.filter((item) => ['approved', 'completed', 'cleared'].includes(String(item?.status || '').toLowerCase())).length;
		const officeProgress = getOfficeProgress(clearance);
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
				: clearanceItems.length && clearedCount > 0
					? {
						title: clearedCount === clearanceItems.length ? 'Clearance Ready for Final Review' : 'Office Clearance Completed',
						message: clearedCount === clearanceItems.length
							? `All required offices have cleared ${clearance.employeeName || 'the employee'}. The request is now ready for final HR review.`
							: `Request ${clearance.requestId || 'N/A'} | Employee: ${clearance.employeeName || 'Employee'}. ${decisionOffice} has approved the clearance. Progress: ${officeProgress.completed}/${officeProgress.total} offices.`,
						type: clearedCount === clearanceItems.length ? 'ready_review' : 'CLEARANCE_PROGRESS_UPDATED',
						actionText: clearedCount === clearanceItems.length ? 'View Final Clearance' : 'View Clearance',
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
		if (requiresIctClearance(clearance) && (requestUpdates.resubmitted || requestUpdates.status === 'Resubmitted')) {
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
		return res.status(400).json({ success: false, message: 'Unable to update clearance request.' });
	}
};

export { getClearances, getLibraryReport, getMyClearances, getClearance, addClearance, updateClearance, deleteClearance };
