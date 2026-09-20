import express from "express";

import {
  createChecklist,
  getChecklists,
  getChecklistById,
  updateChecklist,
  deleteChecklist,
} from "../controllers/clearanceChecklistController.js";

const router = express.Router();

router.post("/", createChecklist);

router.get("/", getChecklists);

router.get("/:id", getChecklistById);

router.put("/:id", updateChecklist);

router.delete("/:id", deleteChecklist);

export default router;