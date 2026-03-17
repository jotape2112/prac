const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

router.get(
  '/admin-only',
  verifyToken,
  authorizeRoles('ADMIN'),
  (req, res) => {
    res.json({
      message: 'Acceso concedido solo para ADMIN',
      user: req.user
    });
  }
);

module.exports = router;
