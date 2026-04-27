const prisma = require("../config/prisma");
const path = require("path");
const fs = require("fs");

const viewInicioPdf = async (req, res) => {
  try {
    const { practiceId } = req.params;

    // buscar el último INICIO_PDF subido
    const inicio = await prisma.practiceDocument.findFirst({
      where: { practiceId: Number(practiceId), type: "INICIO_PDF" },
      orderBy: { createdAt: "desc" },
      select: { filePath: true, fileName: true, mimeType: true },
    });

    if (!inicio) return res.status(404).json({ error: "No existe INICIO_PDF" });

    // filePath viene como "uploads/....pdf"
    const absPath = path.join(process.cwd(), inicio.filePath);

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: "Archivo no encontrado en disco" });
    }

    res.setHeader("Content-Type", inicio.mimeType || "application/pdf");
    // inline para abrir en navegador (no descargar)
    res.setHeader("Content-Disposition", `inline; filename="${inicio.fileName || "inicio.pdf"}"`);

    return res.sendFile(absPath);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al abrir INICIO_PDF" });
  }
};

module.exports = { viewInicioPdf };