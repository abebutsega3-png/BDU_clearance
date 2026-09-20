import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
	addDepartment,
	getDepartments,
	getDepartment,
	updateDepartment,
} from '../controllers/departmentcontroller.js';

const router = express.Router();

router.get('/', authMiddleware, getDepartments);
router.get('/:id', authMiddleware, getDepartment);
router.post('/', authMiddleware, addDepartment);
router.post('/add', authMiddleware, addDepartment);
router.put('/:id', authMiddleware, updateDepartment);

export default router;