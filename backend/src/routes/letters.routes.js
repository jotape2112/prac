const express = require("express");
const router = express.Router();
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");
const { downloadCompanyLetter } = require("../controllers/letters.controller");

// Director/Secretaría/Admin pueden descargar
router.get(
  "/practices/:practiceId/carta-empresa",
  verifyToken,
  authorizeRoles("DIRECTOR", "SECRETARIO_ACADEMICO", "ADMIN"),
  downloadCompanyLetter
);

module.exports = router;