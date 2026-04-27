const express = require("express");
const router = express.Router();
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");
const { downloadInicioPdfForDirectorSign } = require("../controllers/directorDownload.controller");

router.get(
  "/start-docs/:practiceId/for-sign",
  verifyToken,
  authorizeRoles("DIRECTOR"),
  downloadInicioPdfForDirectorSign
);

module.exports = router;