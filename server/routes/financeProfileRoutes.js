import express from 'express';
import {
  getFinanceProfile,
  updateFinanceProfile,
  changePassword,
} from '../controllers/financeProfileController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, getFinanceProfile);
router.put('/edit', authMiddleware, updateFinanceProfile);
router.put('/change-password', authMiddleware, changePassword);

export default router;