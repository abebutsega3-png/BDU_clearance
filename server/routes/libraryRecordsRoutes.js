import express from 'express';
import { getLibraryRecords } from '../controllers/libraryRecordsController.js';

const router = express.Router();

router.get('/', getLibraryRecords);

export default router;