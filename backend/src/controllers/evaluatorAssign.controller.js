const prisma = require("../config/prisma");

const assignEvaluadorToPractice = async (req, res) => {
  try {
    const { practiceId } = req.params;
    const { evaluadorId } = req.body;

    if (!evaluadorId) return res.status(400).json({ error: "evaluadorId requerido" });

    // práctica existe
    const practice = await prisma.practice.findUnique({
      where: { id: Number(practiceId) },
      select: { id: true, studentId: true, nrcId: true, evaluadorId: true, startDocStatus: true },
    });
    if (!practice) return res.status(404).json({ error: "Práctica no encontrada" });

    // evaluador existe y es docente
    const evaluador = await prisma.user.findUnique({
      where: { id: Number(evaluadorId) },
      select: { id: true, name: true, role: true, active: true },
    });
    if (!evaluador || !evaluador.active) return res.status(404).json({ error: "Evaluador no encontrado o inactivo" });
    if (evaluador.role !== "DOCENTE") return res.status(400).json({ error: "El evaluador debe tener rol DOCENTE" });

    // asignar
    const updated = await prisma.practice.update({
      where: { id: Number(practiceId) },
      data: { evaluadorId: Number(evaluadorId) },
      select: { id: true, evaluadorId: true },
    });

    // notificar evaluador
    await prisma.notification.create({
      data: {
        userId: evaluador.id,
        title: "Nueva práctica asignada",
        message: `Se te asignó la práctica #${practiceId} para evaluación (100h y final).`,
        type: "EVALUATOR_ASSIGNED",
        practiceId: Number(practiceId),
      },
    });

    // (opcional) notificar alumno
    await prisma.notification.create({
      data: {
        userId: practice.studentId,
        title: "Evaluador asignado",
        message: "Coordinación asignó un docente evaluador para tu práctica.",
        type: "EVALUATOR_ASSIGNED",
        practiceId: Number(practiceId),
      },
    });

    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al asignar evaluador" });
  }
};

module.exports = { assignEvaluadorToPractice };