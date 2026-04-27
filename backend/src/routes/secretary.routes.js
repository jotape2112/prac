const express = require("express");
const router = express.Router();
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");
const {
  listStartDocsForSecretary,
  secretaryCheckSignature,
  secretaryObserveSignature,
} = require("../controllers/secretary.controller");

router.get("/start-docs", verifyToken, authorizeRoles("ADMIN"), listStartDocsForSecretary);
router.patch("/start-docs/:practiceId/check-signature", verifyToken, authorizeRoles("ADMIN"), secretaryCheckSignature);
router.patch("/start-docs/:practiceId/observe-signature", verifyToken, authorizeRoles("ADMIN"), secretaryObserveSignature);

module.exports = router;