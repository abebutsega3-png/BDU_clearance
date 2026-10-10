import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getLibraryDashboard, getLibraryRecords, issueLibraryMaterial, updateLibraryMaterial } from '../controllers/libraryRecordsController.js';

const router = express.Router();
const requireLibraryOfficer = (req, res, next) => {
  const assignedRoles = [
    req.user?.role,
    req.user?.activeRole,
    ...(Array.isArray(req.user?.roles) ? req.user.roles : []),
  ];
  const normalizedRoles = assignedRoles.map((role) => String(role?.name || role || '')
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[\/_&-]+/g, ' ')
    .replace(/\s+/g, ' '));
  const allowedRoles = ['library officer', 'library', 'librarian', 'admin', 'administrator', 'system admin', 'system administrator'];
  if (!normalizedRoles.some((role) => allowedRoles.includes(role))) {
    return res.status(403).json({ success: false, message: 'Library officer access is required.' });
  }
  return next();
};

router.get('/', authMiddleware, requireLibraryOfficer, getLibraryRecords);
router.get('/dashboard', authMiddleware, requireLibraryOfficer, getLibraryDashboard);
router.post('/', authMiddleware, requireLibraryOfficer, issueLibraryMaterial);
router.patch('/:requestId/materials/:materialId/:action', authMiddleware, requireLibraryOfficer, updateLibraryMaterial);

export default router;