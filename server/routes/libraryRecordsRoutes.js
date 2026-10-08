import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getLibraryDashboard, getLibraryRecords, issueLibraryMaterial, updateLibraryMaterial } from '../controllers/libraryRecordsController.js';

const router = express.Router();
const requireLibraryOfficer = (req, res, next) => {
  const role = String(req.user?.role?.name || req.user?.role || '')
    .trim()
    .toLowerCase()
    .replace(/[\/_&-]+/g, ' ')
    .replace(/\s+/g, ' ');
  if (!['library officer', 'library', 'librarian', 'admin', 'administrator', 'system admin', 'system administrator'].includes(role)) {
    return res.status(403).json({ success: false, message: 'Library officer access is required.' });
  }
  return next();
};

router.get('/', authMiddleware, requireLibraryOfficer, getLibraryRecords);
router.get('/dashboard', authMiddleware, requireLibraryOfficer, getLibraryDashboard);
router.post('/', authMiddleware, requireLibraryOfficer, issueLibraryMaterial);
router.patch('/:requestId/materials/:materialId/:action', authMiddleware, requireLibraryOfficer, updateLibraryMaterial);

export default router;