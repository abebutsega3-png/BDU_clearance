import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  getMyClearanceOffices,
  getOfficeRequests,
  reviewOfficeRequest,
} from '../controllers/clearanceOfficeController.js';

const router = express.Router();

router.use(authMiddleware);
router.get('/roles', getMyClearanceOffices);
router.get('/requests', getOfficeRequests);
router.patch('/requests/:id/decision', reviewOfficeRequest);

export default router;
