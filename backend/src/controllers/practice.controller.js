const prisma = require('../config/prisma');

const createPractice = async (req, res) => {
  try {
    const { nrcId } = req.body;
    const studentId = req.user.id;

    if (!nrcId) {
      return res.status(400).json({ error: "NRC requerido" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Debe subir un PDF" });
    }

    // 🔒 Validar que no tenga práctica activa
    const existingPractice = await prisma.practice.findFirst({
      where: {
        studentId,
        status: {
          notIn: ['FINALIZADA', 'CANCELADA', 'RECHAZADA']
        }
      }
    });

    if (existingPractice) {
      return res.status(400).json({
        error: "Ya tienes una práctica activa"
      });
    }

    // 🔍 Buscar NRC con docente
    const nrc = await prisma.nrc.findUnique({
      where: { id: Number(nrcId) },
      include: { docente: true }
    });

    if (!nrc) {
      return res.status(404).json({ error: "NRC no encontrado" });
    }

    // 🆕 Crear práctica
    const practice = await prisma.practice.create({
      data: {
        studentId,
        nrcId: Number(nrcId),
        status: 'PROCESSING_DOCUMENT',
        documentoInicio: req.file.path
      }
    });

    // 📝 Registrar historial
    await prisma.practiceStatusHistory.create({
      data: {
        practiceId: practice.id,
        previousStatus: null,
        newStatus: 'PROCESSING_DOCUMENT',
        changedById: studentId
      }
    });

    // 🔔 Notificar al docente
    await prisma.notification.create({
      data: {
        userId: nrc.docenteId,
        title: "Nueva práctica enviada",
        message: `El estudiante #${req.user.id} subió su documento de inicio.`,
        type: "NEW_PRACTICE",
        practiceId: practice.id
      }
    });

    res.status(201).json(practice);

    // ⚡ Aquí luego llamaremos al OCR async

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear práctica" });
  }
};

const updatePracticeStatus = async (req, res) => {
  try {
    console.log("Params:", req.params);
    console.log("Body:", req.body);

    const { practiceId } = req.params;
    const { status } = req.body;

    if (!practiceId) {
      return res.status(400).json({ error: "ID de práctica requerido" });
    }

    if (!status) {
      return res.status(400).json({ error: "Status requerido" });
    }

    const practice = await prisma.practice.findUnique({
      where: { id: Number(practiceId) }
    });

    if (!practice) {
      return res.status(404).json({ error: "Práctica no encontrada" });
    }

    const updatedPractice = await prisma.practice.update({
      where: { id: Number(practiceId) },
      data: { status }
    });

    // ✅ REGISTRAR HISTORIAL (AHORA BIEN UBICADO)
    await prisma.practiceStatusHistory.create({
      data: {
        practiceId: Number(practiceId),
        previousStatus: practice.status,
        newStatus: status,
        changedById: req.user.id
      }
    });
    // 🔔 Notificar al estudiante
    await prisma.notification.create({
      data: {
        userId: practice.studentId,
        title: "Estado actualizado",
        message: `Tu práctica cambió a ${status}`,
        type: "STATUS_UPDATE",
        practiceId: practice.id
      }
    });

    res.json(updatedPractice);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar estado" });
  }
};


const getMyPractice = async (req, res) => {
  try {
    const practice = await prisma.practice.findFirst({
      where: {
        studentId: req.user.id,
        status: {
          notIn: ['FINALIZADA', 'CANCELADA']
        }
      },
      include: {
        nrc: true,
        statusHistory: true
      }
    });

    if (!practice) {
      return res.status(404).json({ message: "No tienes práctica activa" });
    }

    res.json(practice);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener práctica" });
  }
};

const getPracticeById = async (req, res) => {
  try {
    const { practiceId } = req.params;

    const practice = await prisma.practice.findUnique({
      where: { id: parseInt(practiceId) },
      include: {
        student: true,
        nrc: true,
        notifications: true,
        statusHistory: {
          orderBy: { id: "desc" } // o createdAt si lo tienes en esa tabla
        }
      }
    });

    if (!practice) {
      return res.status(404).json({ message: 'Práctica no encontrada' });
    }

    res.json(practice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener práctica' });
  }
};

createPractice

const listPractices = async (req, res) => {
  try {
    // Solo roles administrativos deberían usar esto (lo controlamos en routes)
    const practices = await prisma.practice.findMany({
      orderBy: { id: "desc" },
      select: {
        id: true,
        status: true,
        studentId: true,
        nrcId: true,
        empresaNombre: true,
        fechaInicio: true,
        fechaFin: true,
      },
    });

    res.json(practices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al listar prácticas" });
  }
};

module.exports = {
  createPractice,
  updatePracticeStatus,
  getPracticeById,
  getMyPractice,
  listPractices
};
