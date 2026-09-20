import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { createPosition, getPositions, getPosition, updatePosition, deletePosition } from '../controllers/positioncontroller.js';

const router = express.Router();

router.get('/', authMiddleware, getPositions);
router.get('/:id', authMiddleware, getPosition);
router.post('/', authMiddleware, createPosition);
router.put('/:id', authMiddleware, updatePosition);
router.delete('/:id', authMiddleware, deletePosition);

export default router;
