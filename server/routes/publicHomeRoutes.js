import express from 'express';
import { getPublicHomeData } from '../controllers/publicHomeController.js';

const router = express.Router();

router.get('/', getPublicHomeData);

export default router;