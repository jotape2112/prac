const express = require('express');
const router = express.Router();
const { createPeriod } = require('../controllers/period.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

router.post(
  '/',
  verifyToken,
  authorizeRoles('ADMIN'),
  createPeriod
);

module.exports = router;
