const prisma = require("../config/prisma");

// Bandeja secretaría: revisa firma/timbre del INICIO_PDF
const listStartDocsForSecretary = async (req, res) => {
  try {
    const items = await prisma.practice.findMany({
      where: { startDocStatus: { in: ["EN_REVISION_SECRETARIA", "OBSERVADO_SECRETARIA"] } },
      orderBy: { id: "desc" },
      select: {
        id: true,
        startDocStatus: true,
        startDocNotes: true,
        status: true,
        student: { select: { id: true, name: true, email: true } },
        nrc: { select: { id: true, code: true, practiceType: true } },
      },
    });
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar secretaría" });
  }
};

// Secretaría OK firma/timbre => pasa a coordinación
const secretaryCheckSignature = async (req, res) => {
  try {
    const { practiceId } = req.params;

    const updated = await prisma.practice.update({
      where: { id: Number(practiceId) },
      data: { startDocStatus: "EN_REVISION_COORDINACION", startDocNotes: null },
      select: { id: true, startDocStatus: true, studentId: true },
    });

    await prisma.notification.create({
      data: {
        userId: updated.studentId,
        title: "Inicio revisado por Secretaría",
        message: "Tu inicio fue revisado por Secretaría y pasó a revisión de Coordinación.",
        type: "START_DOC_TO_COORDINATION",
        practiceId: updated.id,
      },
    });

    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al validar firma/timbre" });
  }
};

// Secretaría observa firma/timbre => vuelve al alumno
const secretaryObserveSignature = async (req, res) => {
  try {
    const { practiceId } = req.params;
    const { notes } = req.body;

    const updated = await prisma.practice.update({
      where: { id: Number(practiceId) },
      data: {
        startDocStatus: "OBSERVADO_SECRETARIA",
        startDocNotes: notes || "Observado por Secretaría",
      },
      select: { id: true, startDocStatus: true, studentId: true },
    });
    const lastInicio = await prisma.practiceDocument.findFirst({
      where: { practiceId: Number(practiceId), type: "INICIO_PDF" },
      orderBy: { createdAt: "desc" },
      select: { fileName: true }
    });

    await prisma.notification.create({
      data: {
        userId: practice.studentId,
        title: "Inicio observado por Secretaría",
        message: `Archivo: ${lastInicio?.fileName || "INICIO_PDF"}\nObservación: ${notes || "Sin detalle"}`,
        type: "START_DOC_REJECTED",
        practiceId: practice.id
      }
    });

    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al observar firma/timbre" });
  }
};

module.exports = {
  listStartDocsForSecretary,
  secretaryCheckSignature,
  secretaryObserveSignature,
};