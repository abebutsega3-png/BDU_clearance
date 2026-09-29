import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getDashboardData } from '../controllers/transportDashboardController.js';
import {
	approveTransportClearance,
	getTransportRequestById,
	getTransportRequests,
	returnTransportClearance,
	startTransportReview,
} from '../controllers/transportClearanceController.js';
import { getVehicleRecordById, getVehicleRecords } from '../controllers/transportVehicleController.js';
import {
	getTransportClearanceHistory,
	getTransportClearanceHistoryEntry,
} from '../controllers/transportClearanceHistoryController.js';
import { getTransportReport } from '../controllers/transportReportController.js';
import {
	getTransportNotifications,
	markAllTransportNotificationsRead,
	markTransportNotificationRead,
} from '../controllers/transportNotificationController.js';

const router = express.Router();

router.get('/dashboard', authMiddleware, getDashboardData);
router.get('/requests', authMiddleware, getTransportRequests);
router.get('/requests/:requestId', authMiddleware, getTransportRequestById);
router.patch('/requests/:requestId/start-review', authMiddleware, startTransportReview);
router.patch('/requests/:requestId/approve', authMiddleware, approveTransportClearance);
router.patch('/requests/:requestId/return', authMiddleware, returnTransportClearance);
router.get('/assigned-vehicles', authMiddleware, getVehicleRecords);
router.get('/assigned-vehicles/:vehicleId', authMiddleware, getVehicleRecordById);
router.get('/history', authMiddleware, getTransportClearanceHistory);
router.get('/history/:entryId', authMiddleware, getTransportClearanceHistoryEntry);
router.get('/reports', authMiddleware, getTransportReport);
router.get('/notifications', authMiddleware, getTransportNotifications);
router.patch('/notifications/mark-all-read', authMiddleware, markAllTransportNotificationsRead);
router.patch('/notifications/:id/read', authMiddleware, markTransportNotificationRead);

export default router;