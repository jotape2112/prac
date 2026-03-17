const prisma = require("../config/prisma");

const uploadPracticeDocument = async (req, res) => {
  try {
    const { practiceId } = req.params;
    const { type } = req.body;

    if (!type) return res.status(400).json({ error: "type requerido" });
    if (!req.file) return res.status(400).json({ error: "archivo requerido" });

    // Validación simple por tipo
    const mime = req.file.mimetype;
    const isPDF = mime === "application/pdf";
    const isWord =
      mime === "application/msword" ||
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    const allowed = {
      INICIO_PDF: isPDF,
      INICIO_FIRMADO_PDF: isPDF,
      EXTENSION_PDF: isPDF,
      INFORME_100H_WORD: isWord,
      INFORME_FINAL_WORD: isWord
    };

    if (!allowed[type]) {
      return res.status(400).json({ error: "Tipo de archivo inválido para este documento" });
    }

    const doc = await prisma.practiceDocument.create({
      data: {
        practiceId: Number(practiceId),
        type,
        filePath: req.file.path,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        uploadedBy: req.user.id
      }
    });

    // Si secretaría sube el firmado, puede publicar:
    // (lo dejamos separado para endpoint publish)

    res.status(201).json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al subir documento" });
  }
};

const listPracticeDocuments = async (req, res) => {
  try {
    const { practiceId } = req.params;

    const docs = await prisma.practiceDocument.findMany({
      where: { practiceId: Number(practiceId) },
      orderBy: { createdAt: "desc" }
    });

    res.json(docs);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar documentos" });
  }
};

module.exports = { uploadPracticeDocument, listPracticeDocuments };