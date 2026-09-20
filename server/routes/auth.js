import express from 'express';
import { login, verify, getProfile } from '../controllers/authcontroller.js';
import authMiddleware from '../middleware/authMiddleware.js';
const router = express.Router();
router.post('/login', login);
router.get('/verify', authMiddleware, verify);
router.get('/profile', authMiddleware, getProfile);

export default router;