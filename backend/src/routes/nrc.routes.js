const express = require('express');
const router = express.Router();
const { createNrc } = require('../controllers/nrc.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

router.post(
  '/',
  verifyToken,
  authorizeRoles('ADMIN'),
  createNrc
);

module.exports = router;
