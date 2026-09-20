const express = require("express");

const router = express.Router();

const permissionController =
  require("../controllers/permission.controller");

const auth =
  require("../middleware/auth.middleware");

const checkPermission =
  require("../middleware/permission.middleware");

router.post(
  "/",
  auth,
  checkPermission("permission:create"),
  permissionController.createPermission
);

router.get(
  "/",
  auth,
  checkPermission("permission:read"),
  permissionController.getPermissions
);

router.get(
  "/:id",
  auth,
  checkPermission("permission:read"),
  permissionController.getPermissionById
);

router.delete(
  "/:id",
  auth,
  checkPermission("permission:delete"),
  permissionController.deletePermission
);

module.exports = router;