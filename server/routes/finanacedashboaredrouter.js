import express from "express";
import {
  getFinanceDashboard,
  getFinancialRecords
} from "../controllers/financedashboaredController.js";

const router = express.Router();

router.get(
  "/",
  getFinanceDashboard
);

router.get('/records', getFinancialRecords);

export default router;