import express from 'express';
import {
  getHRFinalClearanceDetails,
  updateHRFinalDecision,
  getAllClearanceRequestsForHR,
  generateCertificate,
  getGeneratedCertificates,
  issueCertificate,
  getEmployeeCertificates,
  verifyCertificate
} from '../controllers/hrFinalClearanceController.js';
import { updateInitialHRDecision } from '../controllers/hrFinalClearanceController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// GET clearance details by ID with employee data
router.get('/clearance/:id', getHRFinalClearanceDetails);

// GET all clearance requests for HR review
router.get('/clearances', getAllClearanceRequestsForHR);

// UPDATE HR Final Decision
router.patch('/clearance/:id/decision', updateHRFinalDecision);
router.patch('/initial-clearance/:id/decision', authMiddleware, updateInitialHRDecision);

// Generate Certificate
router.post('/clearance/:id/certificate', generateCertificate);
router.get('/certificates', getGeneratedCertificates);
router.get('/certificates/employee/:employeeId', getEmployeeCertificates);
router.get('/certificates/verify/:certificateNo', verifyCertificate);
router.patch('/certificate/:id/issue', issueCertificate);

export default router;