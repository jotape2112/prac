const prisma = require("../config/prisma");

// ✅ listar docs inicio para secretaría (inbox)
const listStartDocsForSecretary = async (req, res) => {
  try {
    const items = await prisma.practice.findMany({
      where: {
        startDocStatus: {
          in: [
            "SUBIDO_POR_ESTUDIANTE",
            "EN_REVISION_SECRETARIA",
            "OBSERVADO_SECRETARIA",
            "VALIDADO_SECRETARIA",
            "EN_FIRMA_DIRECTOR",
            "FIRMADO_DIRECTOR",
            "PUBLICADO_POR_SECRETARIA",
          ],
        },
      },
      orderBy: { id: "desc" },
      select: {
        id: true,
        status: true,
        startDocStatus: true,
        startDocNotes: true,
        studentId: true,
        nrcId: true,
        student: { select: { id: true, name: true, email: true } },
        nrc: { select: { id: true, code: true, practiceType: true } },
      },
    });

    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar inicios" });
  }
};

// ✅ check: secretaría valida
const secretaryCheckStartDoc = async (req, res) => {
  try {
    const { practiceId } = req.params;

    const practice = await prisma.practice.update({
      where: { id: Number(practiceId) },
      data: {
        startDocStatus: "VALIDADO_SECRETARIA",
        startDocNotes: null,
      },
      select: { id: true, studentId: true, startDocStatus: true },
    });

    res.json(practice);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al validar inicio" });
  }
};

// ✅ observar (reprobar con observaciones)
const secretaryObserveStartDoc = async (req, res) => {
  try {
    const { practiceId } = req.params;
    const { notes } = req.body;

    const practice = await prisma.practice.update({
      where: { id: Number(practiceId) },
      data: {
        startDocStatus: "OBSERVADO_SECRETARIA",
        startDocNotes: notes || "Observado por secretaría",
      },
      select: { id: true, studentId: true, startDocStatus: true },
    });

    // ✅ notificar al alumno (rechazado)
    await prisma.notification.create({
      data: {
        userId: practice.studentId,
        title: "Inicio de práctica rechazado (con observaciones)",
        message:
          "Tu inicio de práctica tiene observaciones de Secretaría. Debes corregir y volver a subir el PDF firmado y timbrado para que se reenvíe.",
        type: "START_DOC_REJECTED",
        practiceId: practice.id,
      },
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
      data: { startDocStatus: "EN_FIRMA_DIRECTOR" },
      select: { id: true, studentId: true, startDocStatus: true },
    });

    // ✅ notificar al alumno
    await prisma.notification.create({
      data: {
        userId: practice.studentId,
        title: "Inicio enviado al Director",
        message:
          "Tu inicio de práctica fue revisado por Secretaría y enviado al Director para firma.",
        type: "START_DOC_SENT_TO_DIRECTOR",
        practiceId: practice.id,
      },
    });

    // ✅ notificar a directores 
    const directors = await prisma.user.findMany({
      where: { role: "DIRECTOR", active: true },
      select: { id: true },
    });

    if (directors.length > 0) {
      await prisma.notification.createMany({
        data: directors.map((d) => ({
          userId: d.id,
          title: "Documento para firma",
          message: `Hay un inicio de práctica pendiente de firma (Práctica #${practice.id}).`,
          type: "START_DOC_TO_SIGN",
          practiceId: practice.id,
        })),
      });
    }

    res.json(practice);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al enviar a director" });
  }
};

// ✅ publicar 
const publishSignedStartDoc = async (req, res) => {
  try {
    const { practiceId } = req.params;

    const signed = await prisma.practiceDocument.findFirst({
      where: { practiceId: Number(practiceId), type: "INICIO_FIRMADO_PDF" },
      select: { id: true },
    });

    if (!signed) {
      return res
        .status(400)
        .json({ error: "Debe subir el INICIO_FIRMADO_PDF antes de publicar" });
    }

    const practice = await prisma.practice.update({
      where: { id: Number(practiceId) },
      data: {
        startDocStatus: "PUBLICADO_POR_SECRETARIA",
        status: "APROBADA",
      },
      select: { id: true, studentId: true, startDocStatus: true, status: true },
    });

    await prisma.notification.create({
      data: {
        userId: practice.studentId,
        title: "Inicio de práctica aprobado",
        message:
          "Tu documento de inicio fue firmado y publicado. ¡Práctica aprobada!",
        type: "START_DOC_PUBLISHED",
        practiceId: practice.id,
      },
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
  sendStartDocToDirector,
};