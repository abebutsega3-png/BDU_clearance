import express from 'express';
import { login, refresh, logout, requestPasswordReset, resetPassword, verify, getProfile } from '../controllers/authcontroller.js';
import authMiddleware from '../middleware/authMiddleware.js';
const router = express.Router();
router.post('/login', login);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/verify', authMiddleware, verify);
router.get('/profile', authMiddleware, getProfile);

export default router;