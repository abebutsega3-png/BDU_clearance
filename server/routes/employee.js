import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
	addEmployee,
	getEmployees,
	getEmployee,
	updateEmployee,
	deleteEmployee,
	getDepartmentEmployees,
	upload,
} from '../controllers/employeecontroller.js';

const router = express.Router();

router.get('/', authMiddleware, getEmployees);
router.get('/department', authMiddleware, getDepartmentEmployees);
router.get('/:id', authMiddleware, getEmployee);
router.post('/', authMiddleware, upload.single('image'), addEmployee);
router.post('/add', authMiddleware, upload.single('image'), addEmployee);
router.put('/:id', authMiddleware, updateEmployee);
router.delete('/:id', authMiddleware, deleteEmployee);
router.post('/upload', authMiddleware, upload.single('image'), addEmployee);

export default router;