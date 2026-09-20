import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getDepartmentSettings, updateDepartmentSettings } from '../controllers/departmentSettingsController.js';

const router = express.Router();
router.get('/', authMiddleware, getDepartmentSettings);
router.put('/', authMiddleware, updateDepartmentSettings);
export default router;