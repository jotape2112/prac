const express = require("express");
const router = express.Router();
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");
const { upsertEvaluation } = require("../controllers/evaluation.controller");

router.patch(
  "/:practiceId",
  verifyToken,
  authorizeRoles("DOCENTE", "ADMIN"),
  upsertEvaluation
);

module.exports = router;