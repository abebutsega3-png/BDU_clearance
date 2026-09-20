import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getReportSummary, getFilteredReports, submitDepartmentReport, getDepartmentReports, getHRClearanceReports } from '../controllers/reportController.js';
const router = express.Router();

router.post('/department-submissions', authMiddleware, submitDepartmentReport);
router.get('/department-submissions', authMiddleware, getDepartmentReports);
router.get('/hr-clearance', authMiddleware, getHRClearanceReports);

// 1. የሪፖርት ማጠቃለያዎችን እና Chart ዳታዎችን ለማምጣት
// GET /api/reports/summary
router.get('/summary', getReportSummary);

// 2. በደረጃ (Filter) የተለዩ የክሊራንስ ጥያቄዎችን ለማምጣት
// GET /api/reports/filter
router.get('/filter', getFilteredReports);
router.get('/', getFilteredReports);

export default router;