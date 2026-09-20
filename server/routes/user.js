import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getUsers, getUser, addUser, resetUserPassword } from '../controllers/usercontroler.js';

const router = express.Router();

router.get('/', authMiddleware, getUsers);
router.post('/reset/:id', authMiddleware, resetUserPassword);
router.get('/:id', authMiddleware, getUser);
router.post('/', authMiddleware, addUser);
router.post('/add', authMiddleware, addUser);

export default router;