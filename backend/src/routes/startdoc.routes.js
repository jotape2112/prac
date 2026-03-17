const express = require("express");
const router = express.Router();
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

const {
  listStartDocsForSecretary,
  secretaryCheckStartDoc,
  secretaryObserveStartDoc,
  sendStartDocToDirector,
  publishSignedStartDoc
} = require("../controllers/startdoc.controller");

router.get(
  "/secretary/pending",
  verifyToken,
  authorizeRoles("SECRETARIO_ACADEMICO", "ADMIN"),
  listStartDocsForSecretary
);

router.patch(
  "/:practiceId/check",
  verifyToken,
  authorizeRoles("SECRETARIO_ACADEMICO", "ADMIN"),
  secretaryCheckStartDoc
);

router.patch(
  "/:practiceId/observe",
  verifyToken,
  authorizeRoles("SECRETARIO_ACADEMICO", "ADMIN"),
  secretaryObserveStartDoc
);

router.patch(
  "/:practiceId/send-to-director",
  verifyToken,
  authorizeRoles("SECRETARIO_ACADEMICO", "ADMIN"),
  sendStartDocToDirector
);

router.patch(
  "/:practiceId/publish",
  verifyToken,
  authorizeRoles("SECRETARIO_ACADEMICO", "ADMIN"),
  publishSignedStartDoc
);

module.exports = router;