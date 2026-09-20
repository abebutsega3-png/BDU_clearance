import express from 'express';
import { getProfile, updateProfile, changePassword } from '../controllers/ICTprofileController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, getProfile);
router.put('/', authMiddleware, updateProfile);
router.put('/change-password', authMiddleware, changePassword);

export default router;