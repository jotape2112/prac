const prisma = require("../config/prisma");

const listPracticeDocuments = async (req, res) => {
  try {
    const { practiceId } = req.params;

    const docs = await prisma.practiceDocument.findMany({
      where: { practiceId: Number(practiceId) },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        filePath: true,
        fileName: true,
        mimeType: true,
        uploadedBy: true,
        createdAt: true,
      },
    });

    res.json(docs);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar documentos" });
  }
};

const uploadPracticeDocument = async (req, res) => {
  try {
    const { practiceId } = req.params;
    const { type } = req.body;

    if (!type) return res.status(400).json({ error: "type requerido" });
    if (!req.file) return res.status(400).json({ error: "archivo requerido" });

    const mime = req.file.mimetype;
    const isPDF = mime === "application/pdf";
    const isWord =
      mime === "application/msword" ||
      mime ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const isImg = ["image/png", "image/jpeg", "image/jpg"].includes(mime);

    // ✅ mantenemos CARTA_EMPRESA_PDF como segundo archivo obligatorio (modal)
    const allowed = {
      INICIO_PDF: isPDF,
      INICIO_FIRMADO_PDF: isPDF,
      CARTA_EMPRESA_PDF: isPDF,

      EXTENSION_PDF: isPDF,
      INFORME_100H_WORD: isWord,
      INFORME_FINAL_WORD: isWord,
      INICIO_FIRMA_ALUMNO_IMG: isImg,
      INICIO_EVIDENCIA_EMPRESA: isPDF || isImg,
    };

    if (!allowed[type]) {
      return res
        .status(400)
        .json({ error: "Tipo de archivo inválido para este documento" });
    }

    // Validar práctica
    const practice = await prisma.practice.findUnique({
      where: { id: Number(practiceId) },
      select: { id: true, studentId: true, nrcId: true },
    });
    if (!practice) return res.status(404).json({ error: "Práctica no encontrada" });

    // Guardar doc subido
    const doc = await prisma.practiceDocument.create({
      data: {
        practiceId: Number(practiceId),
        type,
        filePath: req.file.path
          .replace(/\\/g, "/")
          .replace(/^.*uploads\//, "uploads/"),
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        uploadedBy: req.user.id,
      },
    });

    // ============================================================
    // ✅ NUEVO (SIN CAMBIAR TU LÓGICA): reset evaluación + notificar evaluador
    // ============================================================
    if (type === "INFORME_100H_WORD" || type === "INFORME_FINAL_WORD") {
      const evalType = type === "INFORME_100H_WORD" ? "HORAS_100" : "FINAL";

      // Reset (o crear) evaluación en PENDIENTE
      await prisma.practiceEvaluation.upsert({
        where: {
          practiceId_type: {
            practiceId: Number(practiceId),
            type: evalType,
          },
        },
        create: {
          practiceId: Number(practiceId),
          type: evalType,
          status: "PENDIENTE",
          grade: null,
          observations: null,
          reviewedById: null,
        },
        update: {
          status: "PENDIENTE",
          grade: null,
          observations: null,
          reviewedById: null,
        },
      });

      // Notificar evaluador asignado (Practice.evaluadorId)
      const pEval = await prisma.practice.findUnique({
        where: { id: Number(practiceId) },
        select: { evaluadorId: true },
      });

      if (pEval?.evaluadorId) {
        await prisma.notification.create({
          data: {
            userId: pEval.evaluadorId,
            title: "Documento recibido",
            message:
              evalType === "HORAS_100"
                ? `El alumno subió/re-subió el informe de 100 horas (Práctica #${practiceId}).`
                : `El alumno subió/re-subió el informe final (Práctica #${practiceId}).`,
            type: `DOC_SUBMITTED_${evalType}`,
            practiceId: Number(practiceId),
          },
        });
      }
    }
    // ============================================================

    // ✅ Alumno sube INICIO_PDF (firmado y timbrado) => vuelve a revisión secretaría (TU LÓGICA)
    if (type === "INICIO_PDF") {
      await prisma.practice.update({
        where: { id: Number(practiceId) },
        data: { startDocStatus: "EN_REVISION_SECRETARIA", startDocNotes: null },
      });

      await prisma.notification.create({
        data: {
          userId: req.user.id,
          title: "Inicio reenviado a Secretaría",
          message:
            "Tu inicio de práctica fue reenviado correctamente y quedó nuevamente en revisión de Secretaría.",
          type: "START_DOC_RESUBMITTED",
          practiceId: Number(practiceId),
        },
      });

      const admins = await prisma.user.findMany({
        where: { role: "ADMIN", active: true },
        select: { id: true },
      });

      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map((a) => ({
            userId: a.id,
            title: "Inicio de práctica recibido",
            message: `Se subió el inicio firmado y timbrado (Práctica #${practiceId}).`,
            type: "START_DOC_SUBMITTED",
            practiceId: Number(practiceId),
          })),
        });
      }
    }

    // ✅ DIRECTOR: mantiene modal con 2 archivos obligatorios
    // Pero aquí NO generamos carta. Solo verificamos si ya están ambos y notificamos.
    if (type === "INICIO_FIRMADO_PDF" || type === "CARTA_EMPRESA_PDF") {
      const [inicioFirmado, cartaEmpresa] = await Promise.all([
        prisma.practiceDocument.findFirst({
          where: { practiceId: Number(practiceId), type: "INICIO_FIRMADO_PDF" },
          select: { id: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.practiceDocument.findFirst({
          where: { practiceId: Number(practiceId), type: "CARTA_EMPRESA_PDF" },
          select: { id: true },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      // Solo cuando estén los 2: cerrar paso del director + notificar
      if (inicioFirmado && cartaEmpresa) {
        // Evitar notificar 2 veces
        const already = await prisma.notification.findFirst({
          where: { practiceId: Number(practiceId), type: "DIRECTOR_DOCS_UPLOADED" },
          select: { id: true },
        });

        if (!already) {
          // Setear estado
          await prisma.practice.update({
            where: { id: Number(practiceId) },
            data: { startDocStatus: "FIRMADO_DIRECTOR" },
          });

          // Docente evaluador (según modelo actual: nrc.docenteId)
          const nrc = await prisma.nrc.findUnique({
            where: { id: practice.nrcId },
            select: { docenteId: true },
          });

          // Coordinador = ADMIN
          const coordinadores = await prisma.user.findMany({
            where: { role: "ADMIN", active: true },
            select: { id: true },
          });

          // Alumno
          await prisma.notification.create({
            data: {
              userId: practice.studentId,
              title: "Inicio aprobado por Director",
              message:
                "El Director subió el inicio firmado y la carta a empresa. Coordinación continuará el proceso.",
              type: "DIRECTOR_DOCS_UPLOADED",
              practiceId: Number(practiceId),
            },
          });

          // Docente evaluador
          if (nrc?.docenteId) {
            await prisma.notification.create({
              data: {
                userId: nrc.docenteId,
                title: "Inicio de práctica aprobado",
                message: `El Director completó la documentación del inicio (Práctica #${practiceId}).`,
                type: "DIRECTOR_DOCS_UPLOADED",
                practiceId: Number(practiceId),
              },
            });
          }

          // Coordinación
          if (coordinadores.length > 0) {
            await prisma.notification.createMany({
              data: coordinadores.map((c) => ({
                userId: c.id,
                title: "Director completó documentación",
                message: `Se subieron INICIO_FIRMADO_PDF y CARTA_EMPRESA_PDF (Práctica #${practiceId}).`,
                type: "DIRECTOR_DOCS_UPLOADED",
                practiceId: Number(practiceId),
              })),
            });
          }
        }
      }
    }

    return res.status(201).json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al subir documento" });
  }
};

module.exports = { listPracticeDocuments, uploadPracticeDocument };