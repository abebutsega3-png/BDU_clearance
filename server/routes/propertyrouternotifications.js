const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/propertynotificationController');
const { protect } = require('../middleware/authMiddleware'); // Dummy Auth Middleware

// Fetch notifications for the logged-in Property Officer
router.get('/my', protect, notificationController.getMyNotifications);

// Mark notification as read
router.put('/:id/read', protect, notificationController.markAsRead);

module.exports = router;