const express = require('express');
const router = express.Router();
const { requireFormatives } = require("../middlewares/formative.middleware");

const {
  createPractice,
  updatePracticeStatus,
  getPracticeById,
  getMyPractice,
  listPractices
} = require('../controllers/practice.controller');

const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

// 📄 Crear práctica (subir PDF)
router.post(
  '/',
  verifyToken,
  authorizeRoles('ESTUDIANTE'),
  requireFormatives,
  upload.single('file'),
  createPractice
);

// 👤 Obtener mi práctica activa
router.get(
  '/me',
  verifyToken,
  authorizeRoles('ESTUDIANTE'),
  getMyPractice
);

// 📋 Listar prácticas (Panel Gestión)
router.get(
  '/',
  verifyToken,
  authorizeRoles('ADMIN', 'DOCENTE', 'DIRECTOR'),
  listPractices
);

// 🔎 Obtener práctica por ID (solo gestión)
router.get(
  '/:practiceId',
  verifyToken,
  authorizeRoles('ADMIN', 'DOCENTE', 'DIRECTOR'),
  getPracticeById
);

// 🛠 Cambiar estado
router.patch(
  '/:practiceId/status',
  verifyToken,
  authorizeRoles('ADMIN', 'DOCENTE', 'DIRECTOR'),
  updatePracticeStatus
);

module.exports = router;