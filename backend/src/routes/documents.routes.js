const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

const { uploadPracticeDocument, listPracticeDocuments } = require("../controllers/documents.controller");

router.get("/:practiceId", verifyToken, listPracticeDocuments);

router.post(
  "/:practiceId",
  verifyToken,
  upload.single("file"),
  uploadPracticeDocument
);

module.exports = router;