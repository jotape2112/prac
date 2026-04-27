const express = require("express");
const router = express.Router();
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");
const {
  listStartDocsForCoordination,
  approveFunctions,
  observeFunctions,
  listEvaluators,      
  assignEvaluator      
} = require("../controllers/coordination.controller");

router.get("/start-docs", verifyToken, authorizeRoles("ADMIN"), listStartDocsForCoordination);
router.patch("/start-docs/:practiceId/approve-functions", verifyToken, authorizeRoles("ADMIN"), approveFunctions);
router.patch("/start-docs/:practiceId/observe-functions", verifyToken, authorizeRoles("ADMIN"), observeFunctions);
router.get("/start-docs", verifyToken, authorizeRoles("ADMIN"), listStartDocsForCoordination);

router.get("/evaluators", verifyToken, authorizeRoles("ADMIN"), listEvaluators);

router.patch(
  "/start-docs/:practiceId/assign-evaluator",
  verifyToken,
  authorizeRoles("ADMIN"),
  assignEvaluator
);

router.patch(
  "/start-docs/:practiceId/approve-functions",
  verifyToken,
  authorizeRoles("ADMIN"),
  approveFunctions
);

router.patch(
  "/start-docs/:practiceId/observe-functions",
  verifyToken,
  authorizeRoles("ADMIN"),
  observeFunctions
);
module.exports = router;