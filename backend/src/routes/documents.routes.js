const express = require("express");
const router = express.Router();

const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/documentsUpload.middleware");
const { listPracticeDocuments, uploadPracticeDocument } = require("../controllers/documents.controller");

// listar docs de una práctica
router.get(
  "/:practiceId",
  verifyToken,
  listPracticeDocuments
);

// subir doc a una práctica
router.post(
  "/:practiceId",
  verifyToken,
  authorizeRoles("ESTUDIANTE", "ADMIN", "DOCENTE", "DIRECTOR"),
  upload.single("file"),
  uploadPracticeDocument
);

module.exports = router;