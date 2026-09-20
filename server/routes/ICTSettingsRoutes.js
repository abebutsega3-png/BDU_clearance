import express from 'express';
import { getUserSettings, updateUserSettings } from '../controllers/ICTSettingsController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getUserSettings);
router.put('/', protect, updateUserSettings);

export default router;