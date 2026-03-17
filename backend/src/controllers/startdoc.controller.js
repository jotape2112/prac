const prisma = require("../config/prisma");

// ✅ listar docs inicio pendientes para secretaría
const listStartDocsForSecretary = async (req, res) => {
  try {
    const items = await prisma.practice.findMany({
      where: {
        startDocStatus: { in: ["SUBIDO_POR_ESTUDIANTE", "EN_REVISION_SECRETARIA", "OBSERVADO_SECRETARIA"] }
      },
      orderBy: { id: "desc" },
      select: {
        id: true,
        studentId: true,
        nrcId: true,
        status: true,
        startDocStatus: true,
        startDocNotes: true,
        documentoInicio: true
      }
    });

    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar inicios" });
  }
};

// ✅ check: secretaría valida y envía a firma
const secretaryCheckStartDoc = async (req, res) => {
  try {
    const { practiceId } = req.params;

    const practice = await prisma.practice.update({
      where: { id: Number(practiceId) },
      data: {
        startDocStatus: "VALIDADO_SECRETARIA",
        startDocNotes: null
      }
    });

    res.json(practice);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al validar inicio" });
  }
};

// ✅ observar
const secretaryObserveStartDoc = async (req, res) => {
  try {
    const { practiceId } = req.params;
    const { notes } = req.body;

    const practice = await prisma.practice.update({
      where: { id: Number(practiceId) },
      data: {
        startDocStatus: "OBSERVADO_SECRETARIA",
        startDocNotes: notes || "Observado por secretaría"
      }
    });

    await prisma.notification.create({
      data: {
        userId: practice.studentId,
        title: "Inicio de práctica observado",
        message: "Secretaría observó tu documento de inicio. Revisa observaciones y vuelve a subir.",
        type: "START_DOC_OBSERVED",
        practiceId: practice.id
      }
    });

    res.json(practice);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al observar inicio" });
  }
};

// ✅ enviar a director
const sendStartDocToDirector = async (req, res) => {
  try {
    const { practiceId } = req.params;

    const practice = await prisma.practice.update({
      where: { id: Number(practiceId) },
      data: { startDocStatus: "EN_FIRMA_DIRECTOR" }
    });

    const directors = await prisma.user.findMany({
      where: { role: "DIRECTOR_CARRERA", active: true },
      select: { id: true }
    });

    await prisma.notification.createMany({
      data: directors.map(d => ({
        userId: d.id,
        title: "Documento para firma",
        message: `Hay un inicio de práctica pendiente de firma (Práctica #${practice.id}).`,
        type: "START_DOC_TO_SIGN",
        practiceId: practice.id
      }))
    });

    res.json(practice);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al enviar a director" });
  }
};

const publishSignedStartDoc = async (req, res) => {
  try {
    const { practiceId } = req.params;

    const signed = await prisma.practiceDocument.findFirst({
      where: {
        practiceId: Number(practiceId),
        type: "INICIO_FIRMADO_PDF"
      }
    });

    if (!signed) {
      return res.status(400).json({ error: "Debe subir el INICIO_FIRMADO_PDF antes de publicar" });
    }

    const practice = await prisma.practice.update({
      where: { id: Number(practiceId) },
      data: {
        startDocStatus: "PUBLICADO_POR_SECRETARIA",
        status: "APROBADA"
      }
    });

    await prisma.notification.create({
      data: {
        userId: practice.studentId,
        title: "Inicio de práctica aprobado",
        message: "Tu documento de inicio fue firmado y publicado. ¡Práctica aprobada!",
        type: "START_DOC_PUBLISHED",
        practiceId: practice.id
      }
    });

    res.json(practice);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al publicar firmado" });
  }
};

module.exports = {
  listStartDocsForSecretary,
  secretaryCheckStartDoc,
  secretaryObserveStartDoc,
  publishSignedStartDoc,
  sendStartDocToDirector
};