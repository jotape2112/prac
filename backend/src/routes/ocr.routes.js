const express = require("express");
const router = express.Router();
const upload = require("../services/ocr.upload");
const { uploadPracticeDocument } = require("../controllers/ocr.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.post(
  "/upload",
  verifyToken,
  upload.single("document"),
  uploadPracticeDocument
);

module.exports = router;