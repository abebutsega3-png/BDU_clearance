import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { addClearance, deleteClearance, getClearance, getClearances, getLibraryReport, getMyClearances, updateClearance } from '../controllers/clearancecontroller.js';
import { authorizeDepartmentChecklistUpload, deleteDepartmentChecklistAttachment, downloadDepartmentChecklistAttachment, previewDepartmentChecklistAttachment, uploadDepartmentChecklistAttachmentForItem } from '../controllers/departmentChecklistAttachmentController.js';
import { uploadDepartmentChecklistAttachment } from '../middleware/departmentChecklistUpload.js';

const router = express.Router();

router.get('/', authMiddleware, getClearances);
router.get('/library-report', authMiddleware, getLibraryReport);
router.get('/my', authMiddleware, getMyClearances);
router.post('/:id/department-checklist/attachment', authMiddleware, authorizeDepartmentChecklistUpload, uploadDepartmentChecklistAttachment, uploadDepartmentChecklistAttachmentForItem);
router.get('/:id/department-checklist/:itemId/preview', authMiddleware, previewDepartmentChecklistAttachment);
router.get('/:id/department-checklist/:itemId/attachment', authMiddleware, downloadDepartmentChecklistAttachment);
router.delete('/:id/department-checklist/:itemId/attachment', authMiddleware, authorizeDepartmentChecklistUpload, deleteDepartmentChecklistAttachment);
router.get('/:id', authMiddleware, getClearance);
router.post('/add', authMiddleware, addClearance);
router.put('/:id', authMiddleware, updateClearance);
router.delete('/:id', authMiddleware, deleteClearance);

export default router;