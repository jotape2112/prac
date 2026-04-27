const express = require('express');
const router = express.Router();
const { requireFormatives } = require("../middlewares/formative.middleware");
const { viewInicioPdf } = require("../controllers/practiceFiles.controller");
const { assignEvaluadorToPractice } = require("../controllers/evaluatorAssign.controller");

const {
  createPractice,
  updatePracticeStatus,
  getPracticeById,
  getMyPractice,
  listPractices,
  createStartDraft,
  updateStartForm,
  downloadStartFormPdf
} = require("../controllers/practice.controller");

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

// Crear/obtener borrador de inicio (usa Enrollment)
router.post(
  "/start",
  verifyToken,
  authorizeRoles("ESTUDIANTE"),
  requireFormatives,
  createStartDraft
);

// Guardar formulario (parcial)
router.patch(
  "/:practiceId/start-form",
  verifyToken,
  authorizeRoles("ESTUDIANTE"),
  requireFormatives,
  updateStartForm
);

// Descargar PDF generado desde formulario
router.get(
  "/:practiceId/start-form/pdf",
  verifyToken,
  authorizeRoles("ESTUDIANTE"),
  requireFormatives,
  downloadStartFormPdf
);

router.get(
  "/:practiceId/inicio-pdf",
  verifyToken,
  authorizeRoles("ADMIN", "DIRECTOR"), // Secretaría/Coordinación = ADMIN
  viewInicioPdf
);

//asignar docente evaluador
router.patch(
  "/:practiceId/assign-evaluador",
  verifyToken,
  authorizeRoles("ADMIN", "SECRETARIO_ACADEMICO"), // ajusta a tus roles reales
  assignEvaluadorToPractice
);

module.exports = router;