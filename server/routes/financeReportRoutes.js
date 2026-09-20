import express from "express";
import {
  getFinanceSummaryReport,
  getOutstandingObligationsReport,
  getPendingClearancesReport,
  getFinanceHistoryReport,
} from "../controllers/financeReportController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/summary", authMiddleware, getFinanceSummaryReport);
router.get("/obligations", authMiddleware, getOutstandingObligationsReport);
router.get("/pending", authMiddleware, getPendingClearancesReport);
router.get("/history", authMiddleware, getFinanceHistoryReport);

export default router;