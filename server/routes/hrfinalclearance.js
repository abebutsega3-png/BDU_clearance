import express from 'express';
import {
  getHRFinalClearanceDetails,
  updateHRFinalDecision,
  getAllClearanceRequestsForHR,
  generateCertificate,
  getGeneratedCertificates,
  issueCertificate,
  getEmployeeCertificates
} from '../controllers/hrFinalClearanceController.js';

const router = express.Router();

// GET clearance details by ID with employee data
router.get('/clearance/:id', getHRFinalClearanceDetails);

// GET all clearance requests for HR review
router.get('/clearances', getAllClearanceRequestsForHR);

// UPDATE HR Final Decision
router.patch('/clearance/:id/decision', updateHRFinalDecision);

// Generate Certificate
router.post('/clearance/:id/certificate', generateCertificate);
router.get('/certificates', getGeneratedCertificates);
router.get('/certificates/employee/:employeeId', getEmployeeCertificates);
router.patch('/certificate/:id/issue', issueCertificate);

export default router;