import ClearanceChecklist from "../models/ClearanceChecklist.js";

// CREATE
export const createChecklist = async (req, res) => {
  try {
    const {
      checklistName,
      clearanceStep,
      description,
      order,
      required,
      status,
    } = req.body;

    if (!checklistName || !clearanceStep || !order) {
      return res.status(400).json({
        message: "Checklist name, clearance step and order are required",
      });
    }

    const checklist = await ClearanceChecklist.create({
      checklistName,
      clearanceStep,
      description,
      order,
      required,
      status,
    });

    res.status(201).json({
      message: "Checklist created successfully",
      checklist,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// GET ALL
export const getChecklists = async (req, res) => {
  try {
    const checklists = await ClearanceChecklist.find()
      .populate("clearanceStep", "stepName")
      .sort({ order: 1 });

    res.status(200).json(checklists);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// GET ONE
export const getChecklistById = async (req, res) => {
  try {
    const checklist = await ClearanceChecklist.findById(
      req.params.id
    ).populate("clearanceStep", "stepName");

    if (!checklist) {
      return res.status(404).json({
        message: "Checklist not found",
      });
    }

    res.status(200).json(checklist);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// UPDATE
export const updateChecklist = async (req, res) => {
  try {
    const checklist = await ClearanceChecklist.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        returnDocument: 'after',
        runValidators: true,
      }
    );

    if (!checklist) {
      return res.status(404).json({
        message: "Checklist not found",
      });
    }

    res.status(200).json({
      message: "Checklist updated successfully",
      checklist,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// DELETE
export const deleteChecklist = async (req, res) => {
  try {
    const checklist = await ClearanceChecklist.findByIdAndDelete(
      req.params.id
    );

    if (!checklist) {
      return res.status(404).json({
        message: "Checklist not found",
      });
    }

    res.status(200).json({
      message: "Checklist deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};