const express = require("express");
const router = express.Router();

const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");
const excelUpload = require("../middlewares/excelUpload.middleware");
const { importPeriodExcel } = require("../controllers/periodImport.controller");

router.post(
  "/:periodId/import-excel",
  verifyToken,
  authorizeRoles("SECRETARIO_ACADEMICO", "DIRECTOR_CARRERA", "ADMIN"),
  excelUpload.single("file"),
  importPeriodExcel
);

module.exports = router;