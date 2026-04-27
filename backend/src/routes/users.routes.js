const express = require("express");
const router = express.Router();
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");
const { listUsers } = require("../controllers/users.controller");

router.get("/", verifyToken, authorizeRoles("ADMIN"), listUsers);

module.exports = router;