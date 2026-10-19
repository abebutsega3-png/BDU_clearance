import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getUsers, getUser, addUser, updateUser, resetUserPassword, sendUserCredentials } from '../controllers/usercontroler.js';

const router = express.Router();

const hrOrAdminOnly = (req, res, next) => {
  const roles = [req.user?.role, req.user?.activeRole, ...(req.user?.roles || [])];
  if (!roles.some((role) => /^(admin|administrator|system admin|system administrator|hr officer|human resources officer)$/i.test(String(role || '').trim()))) {
    return res.status(403).json({ success: false, message: 'HR Officer or Administrator access is required.' });
  }
  return next();
};

router.get('/', authMiddleware, getUsers);
router.post('/reset/:id', authMiddleware, resetUserPassword);
router.post('/send-credentials', authMiddleware, hrOrAdminOnly, sendUserCredentials);
router.get('/:id', authMiddleware, getUser);
router.post('/', authMiddleware, addUser);
router.post('/add', authMiddleware, addUser);
router.put('/:id', authMiddleware, updateUser);

export default router;