const prisma = require("../config/prisma");

const listToSign = async (req, res) => {
  try {
    const items = await prisma.practice.findMany({
      where: { startDocStatus: "EN_FIRMA_DIRECTOR" },
      orderBy: { id: "desc" },
      select: {
        id: true,
        studentId: true,
        nrcId: true,
        documentoInicio: true,
        startDocStatus: true
      }
    });

    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar para firma" });
  }
};

// Director marca firmado (archivo firmado lo sube secretaría después)
const markSigned = async (req, res) => {
  try {
    const { practiceId } = req.params;

    const practice = await prisma.practice.update({
      where: { id: Number(practiceId) },
      data: { startDocStatus: "FIRMADO_DIRECTOR" }
    });

    res.json(practice);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al marcar firmado" });
  }
};

module.exports = { listToSign, markSigned };