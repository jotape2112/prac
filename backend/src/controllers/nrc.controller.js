const prisma = require('../config/prisma');

const createNrc = async (req, res) => {
  try {
    const { code, practiceType, periodId, docenteId } = req.body;

    const nrc = await prisma.nrc.create({
      data: {
        code,
        practiceType,
        periodId,
        docenteId
      }
    });

    res.status(201).json(nrc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear NRC' });
  }
};

module.exports = { createNrc };
