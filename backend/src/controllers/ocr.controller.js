const prisma = require("../config/prisma");
const { extractText, parseFields } = require("../services/ocr.service");

const uploadPracticeDocument = async (req, res) => {
  try {
    const studentId = req.user.id;
    const filePath = req.file.path;

    const practice = await prisma.practice.create({
      data: {
        studentId,
        status: "PROCESSING_DOCUMENT",
        documentoInicio: filePath
      }
    });

    // 🔥 PROCESAMIENTO ASÍNCRONO BÁSICO
    process.nextTick(async () => {
      try {
        const text = await extractText(filePath);
        const parsed = parseFields(text);

        await prisma.practice.update({
          where: { id: practice.id },
          data: {
            ...parsed,
            status: "BORRADOR_AUTO_COMPLETADO",
            ocrProcessed: true
          }
        });

        await prisma.notification.create({
          data: {
            userId: studentId,
            title: "Documento procesado",
            message: "El análisis de tu práctica terminó. Revisa los datos.",
            type: "OCR_COMPLETED",
            practiceId: practice.id
          }
        });

      } catch (err) {
        await prisma.practice.update({
          where: { id: practice.id },
          data: {
            ocrError: err.message,
            status: "BORRADOR"
          }
        });
      }
    });

    res.json({
      message: "Documento recibido y en procesamiento",
      practiceId: practice.id
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al subir documento" });
  }
};

module.exports = { uploadPracticeDocument };