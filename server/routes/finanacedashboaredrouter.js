import express from "express";
import {
  createFinancialRecord,
  createFinancialPayment,
  getFinanceDashboard,
  getFinancialRecords,
  reverseFinancialPayment,
  updateFinancialRecord
} from "../controllers/financedashboaredController.js";

const router = express.Router();

router.get(
  "/",
  getFinanceDashboard
);

router.get('/records', getFinancialRecords);
router.post('/records', createFinancialRecord);
router.post('/records/payments', createFinancialPayment);
router.patch('/records/:id', updateFinancialRecord);
router.post('/records/:id/reverse', reverseFinancialPayment);

export default router;