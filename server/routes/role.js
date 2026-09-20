import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { createRole, deleteRole, getRole, getRoles, updateRole } from '../controllers/rolecontroller.js';

const router = express.Router();
router.get('/', authMiddleware, getRoles);
router.get('/:id', authMiddleware, getRole);
router.post('/', authMiddleware, createRole);
router.put('/:id', authMiddleware, updateRole);
router.delete('/:id', authMiddleware, deleteRole);

export default router;