const express = require("express");
const router = express.Router();

const prisma = require("../config/prisma");
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

router.get("/me/eligibility", verifyToken, authorizeRoles("ESTUDIANTE"), async (req, res) => {
  try {
    const period = await prisma.period.findFirst({
      where: { active: true },
      orderBy: { id: "desc" },
      select: { id: true, name: true }
    });

    if (!period) {
      return res.json({
        eligible: false,
        reason: "No hay período activo",
        period: null
      });
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: { periodId: period.id, studentId: req.user.id },
      select: { formativesDelivered: true }
    });

    if (!enrollment) {
      return res.json({
        eligible: false,
        reason: "No estás inscrito en un NRC para el período activo",
        period
      });
    }

    if (!enrollment.formativesDelivered) {
      return res.json({
        eligible: false,
        reason: "No habilitado: faltan formativas del ramo",
        period
      });
    }

    return res.json({ eligible: true, reason: null, period });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error verificando habilitación" });
  }
});

module.exports = router;