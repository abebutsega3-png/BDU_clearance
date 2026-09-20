import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getLibraryReport } from '../controllers/clearancecontroller.js';

const router = express.Router();

router.get('/', authMiddleware, getLibraryReport);

export default router;
