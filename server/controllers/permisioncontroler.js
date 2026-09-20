const permissionService = require("../services/permission.service");

const createPermission = async (req, res) => {
  try {
    const permission =
      await permissionService.createPermission(req.body);

    res.status(201).json({
      success: true,
      message: "Permission created successfully",
      data: permission,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getPermissions = async (req, res) => {
  try {
    const permissions =
      await permissionService.getPermissions();

    res.status(200).json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getPermissionById = async (req, res) => {
  try {
    const permission =
      await permissionService.getPermissionById(
        req.params.id
      );

    res.status(200).json({
      success: true,
      data: permission,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

const deletePermission = async (req, res) => {
  try {
    await permissionService.deletePermission(
      req.params.id
    );

    res.status(200).json({
      success: true,
      message: "Permission deleted successfully",
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createPermission,
  getPermissions,
  getPermissionById,
  deletePermission,
};