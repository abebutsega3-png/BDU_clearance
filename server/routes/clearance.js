import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { addClearance, deleteClearance, getClearance, getClearances, getLibraryReport, getMyClearances, updateClearance } from '../controllers/clearancecontroller.js';

const router = express.Router();

router.get('/', authMiddleware, getClearances);
router.get('/library-report', authMiddleware, getLibraryReport);
router.get('/my', authMiddleware, getMyClearances);
router.get('/:id', authMiddleware, getClearance);
router.post('/add', authMiddleware, addClearance);
router.put('/:id', authMiddleware, updateClearance);
router.delete('/:id', authMiddleware, deleteClearance);

export default router;