import express from 'express';
import { getPublicHomeData } from '../controllers/publicHomeController.js';
import { submitContactMessage } from '../controllers/contactController.js';

const router = express.Router();

router.get('/', getPublicHomeData);
router.post('/contact', submitContactMessage);

export default router;