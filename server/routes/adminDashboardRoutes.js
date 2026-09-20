import express from 'express';
import { getDashboardData } from '../controllers/adminDashboardController.js';

const router = express.Router();

// 1. የዳሽቦርድ ዋና ዋና መረጃዎች ማምጫ (Get Dashboard Stats & Overviews)
router.get('/dashboard-data', getDashboardData);

export default router;