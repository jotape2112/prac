const prisma = require("../config/prisma");

const upsertEvaluation = async (req, res) => {
  try {
    const { practiceId } = req.params;
    const { type, observations, grade, status } = req.body;

    if (!type) return res.status(400).json({ error: "type requerido (HORAS_100 o FINAL)" });

    const data = {
      type,
      observations: observations ?? null,
      reviewedById: req.user.id
    };

    if (status) data.status = status;
    if (grade !== undefined && grade !== null) data.grade = Number(grade);

    const evalRow = await prisma.practiceEvaluation.upsert({
      where: { practiceId_type: { practiceId: Number(practiceId), type } },
      create: {
        practiceId: Number(practiceId),
        ...data
      },
      update: data
    });

    res.json(evalRow);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al guardar evaluación" });
  }
};

module.exports = { upsertEvaluation };