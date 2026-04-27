const prisma = require("../config/prisma");

const normalizeEvalType = (t) => {
  const s = String(t || "").toUpperCase().trim();
  if (!["HORAS_100", "FINAL"].includes(s)) return null;
  return s;
};

const listMyPending = async (req, res) => {
  try {
    const evaluadorId = req.user.id;

    const practices = await prisma.practice.findMany({
      where: {
        evaluadorId, // ✅ lo único obligatorio
      },
      orderBy: { id: "desc" },
      include: {
        student: { select: { id: true, name: true, email: true, rut: true } },
        nrc: { select: { id: true, code: true, practiceType: true } },
        documents: { orderBy: { createdAt: "desc" } },
        evaluations: true,
      },
    });

    const items = practices.map((p) => {
      const has100 = p.documents.some((d) => d.type === "INFORME_100H_WORD");
      const hasFinal = p.documents.some((d) => d.type === "INFORME_FINAL_WORD");

      const ev100 = p.evaluations.find((e) => e.type === "HORAS_100") || null;
      const evFinal = p.evaluations.find((e) => e.type === "FINAL") || null;

      const pending100 = has100 && (!ev100 || ev100.status !== "EVALUADO");
      const pendingFinal = hasFinal && (!evFinal || evFinal.status !== "EVALUADO");

      return {
        id: p.id,
        student: p.student,
        nrc: p.nrc,
        status: p.status,
        startDocStatus: p.startDocStatus,
        evaluadorId: p.evaluadorId,

        has100,
        hasFinal,

        ev100,
        evFinal,

        pending100,
        pendingFinal,
      };
    });

    // ✅ Importante: ahora devolvemos TODO lo asignado (aunque no haya docs aún)
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar prácticas del evaluador" });
  }
};

const listMyHistory = async (req, res) => {
  try {
    const evaluadorId = req.user.id;

    const rows = await prisma.practice.findMany({
      where: {
        evaluadorId,
        evaluations: {
          some: {
            status: "EVALUADO",
            reviewedById: evaluadorId,
          },
        },
      },
      orderBy: { id: "desc" },
      include: {
        student: { select: { id: true, name: true, email: true, rut: true } },
        nrc: { select: { id: true, code: true, practiceType: true } },
        evaluations: true,
      },
    });

    res.json(
      rows.map((p) => ({
        id: p.id,
        student: p.student,
        nrc: p.nrc,
        status: p.status,
        startDocStatus: p.startDocStatus,
        evaluations: p.evaluations,
      }))
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar historial del evaluador" });
  }
};

const getMyPracticeDetail = async (req, res) => {
  try {
    const evaluadorId = req.user.id;
    const { practiceId } = req.params;

    const practice = await prisma.practice.findUnique({
      where: { id: Number(practiceId) },
      include: {
        student: { select: { id: true, name: true, email: true, rut: true } },
        nrc: { select: { id: true, code: true, practiceType: true } },
        documents: { orderBy: { createdAt: "desc" } },
        evaluations: { orderBy: { updatedAt: "desc" } },
      },
    });

    if (!practice) return res.status(404).json({ error: "Práctica no encontrada" });
    if (practice.evaluadorId !== evaluadorId) return res.status(403).json({ error: "No autorizado" });

    res.json(practice);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener detalle de práctica" });
  }
};

const upsertEvaluation = async (req, res) => {
  try {
    const evaluadorId = req.user.id;
    const { practiceId, type } = req.params;

    const evalType = normalizeEvalType(type);
    if (!evalType) return res.status(400).json({ error: "type inválido (HORAS_100 o FINAL)" });

    const { status, grade, observations } = req.body;

    if (!["PENDIENTE", "OBSERVADO", "EVALUADO"].includes(String(status || ""))) {
      return res.status(400).json({ error: "status inválido (PENDIENTE/OBSERVADO/EVALUADO)" });
    }

    // Validar práctica + que sea del evaluador
    const practice = await prisma.practice.findUnique({
      where: { id: Number(practiceId) },
      select: { id: true, studentId: true, evaluadorId: true },
    });
    if (!practice) return res.status(404).json({ error: "Práctica no encontrada" });
    if (practice.evaluadorId !== evaluadorId) return res.status(403).json({ error: "No autorizado" });

    // Si evalúa, validar nota 1.0 a 7.0
    let finalGrade = null;
    if (status === "EVALUADO") {
      const g = Number(grade);
      if (Number.isNaN(g)) return res.status(400).json({ error: "grade requerido para EVALUADO" });
      if (g < 1.0 || g > 7.0) return res.status(400).json({ error: "grade debe estar entre 1.0 y 7.0" });
      finalGrade = Math.round(g * 10) / 10; // 1 decimal
    }

    const saved = await prisma.practiceEvaluation.upsert({
      where: { practiceId_type: { practiceId: Number(practiceId), type: evalType } },
      create: {
        practiceId: Number(practiceId),
        type: evalType,
        status,
        grade: finalGrade,
        observations: observations || null,
        reviewedById: evaluadorId,
      },
      update: {
        status,
        grade: finalGrade,
        observations: observations || null,
        reviewedById: evaluadorId,
      },
    });

    // 🔔 Notificar alumno según estado
    const titles = {
      OBSERVADO: "Documento observado",
      EVALUADO: "Documento evaluado",
      PENDIENTE: "Documento en revisión",
    };

    const msg = evalType === "HORAS_100"
      ? (status === "EVALUADO"
          ? `Tu informe de 100 horas fue evaluado con nota ${finalGrade}.`
          : status === "OBSERVADO"
            ? "Tu informe de 100 horas tiene observaciones. Revisa y vuelve a subir."
            : "Tu informe de 100 horas está en revisión.")
      : (status === "EVALUADO"
          ? `Tu informe final fue evaluado con nota ${finalGrade}.`
          : status === "OBSERVADO"
            ? "Tu informe final tiene observaciones. Revisa y vuelve a subir."
            : "Tu informe final está en revisión.");

    await prisma.notification.create({
      data: {
        userId: practice.studentId,
        title: titles[status] || "Actualización",
        message: msg,
        type: `EVAL_${evalType}_${status}`,
        practiceId: Number(practiceId),
      },
    });

    res.json(saved);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al guardar evaluación" });
  }
};

module.exports = {
  listMyPending,
  listMyHistory,
  getMyPracticeDetail,
  upsertEvaluation,
};