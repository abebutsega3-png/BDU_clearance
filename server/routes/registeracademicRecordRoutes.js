import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  addAcademicRecord,
  getAcademicRecords,
  requireAcademicRecordsAccess,
} from '../controllers/registeracademicRecordController.js';

const router = express.Router();

router.use(authMiddleware, requireAcademicRecordsAccess);
router.get('/', getAcademicRecords);
router.post('/add', addAcademicRecord);

export default router;
