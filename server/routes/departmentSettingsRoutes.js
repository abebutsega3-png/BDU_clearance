import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  getDepartmentSettings,
  logoutAllDevices,
  updateDepartmentSettings,
} from '../controllers/departmentSettingsController.js';

const router = express.Router();
router.get('/', authMiddleware, getDepartmentSettings);
router.put('/', authMiddleware, updateDepartmentSettings);
router.post('/logout-all-devices', authMiddleware, logoutAllDevices);
export default router;