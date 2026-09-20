import express from "express";
import {
  getFinanceSettings,
  updateFinanceSettings,
  changeSettingsPassword,
} from "../controllers/financeSettingsController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getFinanceSettings);
router.put("/", authMiddleware, updateFinanceSettings);
router.put("/change-password", authMiddleware, changeSettingsPassword);

export default router;