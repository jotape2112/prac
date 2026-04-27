const prisma = require("../config/prisma");

// ✅ Bandeja coordinación: revisa funciones + muestra evaluador
const listStartDocsForCoordination = async (req, res) => {
  try {
    const items = await prisma.practice.findMany({
      where: {
        startDocStatus: { in: ["EN_REVISION_COORDINACION", "OBSERVADO_COORDINACION"] },
      },
      orderBy: { id: "desc" },
      select: {
        id: true,
        startDocStatus: true,

        // ✅ TU CAMPO REAL
        funciones: true,
        funcionesNotes: true,

        // ✅ NUEVO: evaluador asignado
        evaluadorId: true,
        evaluador: { select: { id: true, name: true, email: true } },

        studentId: true,
        student: { select: { id: true, name: true, email: true } },
        nrc: { select: { id: true, code: true, practiceType: true } },
      },
    });

    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar coordinación" });
  }
};

// ✅ Listar docentes evaluadores disponibles (para el modal)
const listEvaluators = async (req, res) => {
  try {
    const docs = await prisma.user.findMany({
      where: { role: "DOCENTE", active: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    res.json(docs);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar docentes" });
  }
};

// ✅ Asignar evaluador (antes de enviar al Director)
const assignEvaluator = async (req, res) => {
  try {
    const { practiceId } = req.params;
    const { evaluadorId } = req.body;

    if (!evaluadorId) return res.status(400).json({ error: "evaluadorId requerido" });

    const practice = await prisma.practice.findUnique({
      where: { id: Number(practiceId) },
      select: { id: true, studentId: true },
    });
    if (!practice) return res.status(404).json({ error: "Práctica no encontrada" });

    const evaluador = await prisma.user.findUnique({
      where: { id: Number(evaluadorId) },
      select: { id: true, role: true, active: true, name: true },
    });
    if (!evaluador || !evaluador.active) {
      return res.status(404).json({ error: "Docente evaluador no encontrado o inactivo" });
    }
    if (evaluador.role !== "DOCENTE") {
      return res.status(400).json({ error: "El evaluador debe tener rol DOCENTE" });
    }

    const updated = await prisma.practice.update({
      where: { id: Number(practiceId) },
      data: { evaluadorId: Number(evaluadorId) },
      select: { id: true, evaluadorId: true },
    });

    // 🔔 Notificar evaluador
    await prisma.notification.create({
      data: {
        userId: evaluador.id,
        title: "Nueva práctica asignada",
        message: `Coordinación te asignó la práctica #${practiceId} para evaluación.`,
        type: "EVALUATOR_ASSIGNED",
        practiceId: Number(practiceId),
      },
    });

    // 🔔 Notificar alumno 
    await prisma.notification.create({
      data: {
        userId: practice.studentId,
        title: "Profesor evaluador asignado",
        message: "Coordinación asignó un profesor evaluador para tu práctica.",
        type: "EVALUATOR_ASSIGNED_STUDENT",
        practiceId: Number(practiceId),
      },
    });

    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al asignar evaluador" });
  }
};

// ✅ Coordinación aprueba funciones => exige evaluador => envía a Director
const approveFunctions = async (req, res) => {
  try {
    const { practiceId } = req.params;

    const practice = await prisma.practice.findUnique({
      where: { id: Number(practiceId) },
      select: {
        id: true,
        studentId: true,
        funciones: true,      // ✅ tu campo real
        evaluadorId: true,    // ✅ requerido
      },
    });
    if (!practice) return res.status(404).json({ error: "Práctica no encontrada" });

    // ✅ Validar funciones reales
    if (!practice.funciones || practice.funciones.trim().length < 10) {
      return res.status(400).json({ error: "Funciones insuficientes (mín. 10 caracteres)." });
    }

    // ✅ Obligatorio: evaluador asignado antes de enviar a Director
    if (!practice.evaluadorId) {
      return res.status(400).json({ error: "Debes asignar un profesor evaluador antes de enviar al Director." });
    }

    const updated = await prisma.practice.update({
      where: { id: Number(practiceId) },
      data: { startDocStatus: "EN_FIRMA_DIRECTOR", funcionesNotes: null },
      select: { id: true, startDocStatus: true, studentId: true, evaluadorId: true },
    });

    // 🔔 Notificar estudiante 
    await prisma.notification.create({
      data: {
        userId: updated.studentId,
        title: "Inicio enviado a Director",
        message: "Coordinación aprobó tus funciones y envió el inicio al Director para firma.",
        type: "START_DOC_SENT_TO_DIRECTOR",
        practiceId: updated.id,
      },
    });

    // 🔔 Notificar evaluador 
    await prisma.notification.create({
      data: {
        userId: updated.evaluadorId,
        title: "Inicio enviado a Director",
        message: `El inicio de la práctica #${practiceId} fue enviado al Director para firma.`,
        type: "START_DOC_SENT_TO_DIRECTOR_EVALUATOR",
        practiceId: updated.id,
      },
    });

    // 🔔 Notificar director(es)
    const directors = await prisma.user.findMany({
      where: { role: "DIRECTOR", active: true },
      select: { id: true },
    });

    if (directors.length > 0) {
      await prisma.notification.createMany({
        data: directors.map((d) => ({
          userId: d.id,
          title: "Documento para firma",
          message: `Inicio pendiente de firma (Práctica #${practiceId}).`,
          type: "START_DOC_TO_SIGN",
          practiceId: Number(practiceId),
        })),
      });
    }

    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al aprobar funciones" });
  }
};

// ✅ Coordinación observa funciones => vuelve al alumno (y notifica alumno sí o sí)
const observeFunctions = async (req, res) => {
  try {
    const { practiceId } = req.params;
    const { notes } = req.body;

    const updated = await prisma.practice.update({
      where: { id: Number(practiceId) },
      data: {
        startDocStatus: "OBSERVADO_COORDINACION",
        funcionesNotes: notes || "Funciones observadas por Coordinación",
      },
      select: { id: true, startDocStatus: true, studentId: true },
    });

    await prisma.notification.create({
      data: {
        userId: updated.studentId,
        title: "Funciones observadas por Coordinación",
        message: `Observación: ${updated.funcionesNotes || notes || "Sin detalle"}`,
        type: "FUNCTIONS_OBSERVED",
        practiceId: updated.id
      }
    });

    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al observar funciones" });
  }
};

module.exports = {
  listStartDocsForCoordination,
  listEvaluators,
  assignEvaluator,
  approveFunctions,
  observeFunctions,
};