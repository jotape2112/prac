const express = require("express");
const router = express.Router();
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");
const { listToSign, markSigned } = require("../controllers/director.controller");

router.get(
  "/to-sign",
  verifyToken,
  authorizeRoles("DIRECTOR_CARRERA", "ADMIN"),
  listToSign
);

router.patch(
  "/:practiceId/signed",
  verifyToken,
  authorizeRoles("DIRECTOR_CARRERA", "ADMIN"),
  markSigned
);

module.exports = router;