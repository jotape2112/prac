const express = require("express");
const router = express.Router();

const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");
const {
  listMyPending,
  listMyHistory,
  getMyPracticeDetail,
  upsertEvaluation,
} = require("../controllers/evaluator.controller");

// DOCENTE = evaluador
router.get(
  "/pending",
  verifyToken,
  authorizeRoles("DOCENTE"),
  listMyPending
);

router.get(
  "/history",
  verifyToken,
  authorizeRoles("DOCENTE"),
  listMyHistory
);

router.get(
  "/practices/:practiceId",
  verifyToken,
  authorizeRoles("DOCENTE"),
  getMyPracticeDetail
);

router.patch(
  "/practices/:practiceId/evaluations/:type",
  verifyToken,
  authorizeRoles("DOCENTE"),
  upsertEvaluation
);

module.exports = router;