import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getAuditLogs, getAuditLogById, exportAuditLogs } from '../controllers/auditLogController.js';

const router = express.Router();
router.use(authMiddleware);
router.get('/', getAuditLogs);
router.get('/export', exportAuditLogs);
router.get('/:id', getAuditLogById);

export default router;