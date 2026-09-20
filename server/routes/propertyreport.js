import express from 'express';
import { getPropertyClearanceReport, sendReportToHR } from '../controllers/propertyReportController.js';

const router = express.Router();

// GET Property Clearance Report
router.get('/property-clearance', getPropertyClearanceReport);

// POST Send Report to HR Officer
router.post('/send-to-hr', sendReportToHR);

export default router;