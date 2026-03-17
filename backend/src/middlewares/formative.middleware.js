const prisma = require("../config/prisma");

const requireFormatives = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "ESTUDIANTE") return next();

    // buscar periodo activo (tu Period tiene active=true)
    const period = await prisma.period.findFirst({
      where: { active: true },
      select: { id: true },
      orderBy: { id: "desc" }
    });

    if (!period) {
      return res.status(403).json({ message: "No hay período activo" });
    }

    // debe existir inscripción con formativas entregadas
    const ok = await prisma.enrollment.findFirst({
      where: {
        periodId: period.id,
        studentId: req.user.id,
        formativesDelivered: true
      },
      select: { id: true }
    });

    if (!ok) {
      return res.status(403).json({ message: "No habilitado: faltan formativas del ramo" });
    }

    next();
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error validando formativas" });
  }
};

module.exports = { requireFormatives };