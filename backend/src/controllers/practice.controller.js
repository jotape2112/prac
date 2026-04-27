const prisma = require("../config/prisma");
const PDFDocument = require("pdfkit");

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isValidPhone = (phone) => {
  const cleaned = String(phone || "").replace(/[^\d]/g, "");
  return cleaned.length >= 8;
};

const createPractice = async (req, res) => {
  try {
    const studentId = req.user.id;

    const period = await prisma.period.findFirst({
      where: { active: true },
      orderBy: { id: "desc" },
      select: { id: true },
    });

    if (!period) {
      return res.status(400).json({ error: "No hay período activo" });
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: { periodId: period.id, studentId },
      select: { nrcId: true },
    });

    if (!enrollment) {
      return res.status(400).json({
        error: "No estás inscrito en un NRC para el período activo",
      });
    }

    const nrcIdReal = enrollment.nrcId;

    const nrc = await prisma.nrc.findUnique({
      where: { id: nrcIdReal },
      include: { docente: true },
    });

    if (!nrc) {
      return res.status(404).json({ error: "NRC no encontrado" });
    }

    const practice = await prisma.practice.create({
      data: {
        studentId,
        nrcId: Number(nrcIdReal),
        status: "PROCESSING_DOCUMENT",
        documentoInicio: req.file?.path || null,
      },
    });

    await prisma.practiceStatusHistory.create({
      data: {
        practiceId: practice.id,
        previousStatus: null,
        newStatus: "PROCESSING_DOCUMENT",
        changedById: studentId,
      },
    });

    await prisma.notification.create({
      data: {
        userId: nrc.docenteId,
        title: "Nueva práctica enviada",
        message: `El estudiante #${req.user.id} subió su documento de inicio.`,
        type: "NEW_PRACTICE",
        practiceId: practice.id,
      },
    });

    res.status(201).json(practice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear práctica" });
  }
};

const updatePracticeStatus = async (req, res) => {
  try {
    const { practiceId } = req.params;
    const { status } = req.body;

    if (!practiceId) {
      return res.status(400).json({ error: "ID de práctica requerido" });
    }

    if (!status) {
      return res.status(400).json({ error: "Status requerido" });
    }

    const practice = await prisma.practice.findUnique({
      where: { id: Number(practiceId) },
    });

    if (!practice) {
      return res.status(404).json({ error: "Práctica no encontrada" });
    }

    const updatedPractice = await prisma.practice.update({
      where: { id: Number(practiceId) },
      data: { status },
    });

    await prisma.practiceStatusHistory.create({
      data: {
        practiceId: Number(practiceId),
        previousStatus: practice.status,
        newStatus: status,
        changedById: req.user.id,
      },
    });

    await prisma.notification.create({
      data: {
        userId: practice.studentId,
        title: "Estado actualizado",
        message: `Tu práctica cambió a ${status}`,
        type: "STATUS_UPDATE",
        practiceId: practice.id,
      },
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
          notIn: ["FINALIZADA", "CANCELADA"],
        },
      },
      include: {
        nrc: true,
        evaluador: { select: { id: true, name: true, email: true } },
        statusHistory: true,
      },
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
      where: { id: Number(practiceId) },
      include: {
        student: { select: { id: true, name: true, email: true, rut: true } },
        nrc: { select: { id: true, code: true, practiceType: true } },
        statusHistory: { orderBy: { createdAt: "desc" } },
        documents: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!practice) {
      return res.status(404).json({ message: "Práctica no encontrada" });
    }

    res.json(practice);
  } catch (error) {
    console.error("getPracticeById error:", error);
    res.status(500).json({ message: "Error al obtener práctica" });
  }
};

const listPractices = async (req, res) => {
  try {
    const practices = await prisma.practice.findMany({
      orderBy: { id: "desc" },
      select: {
        id: true,
        status: true,
        startDocStatus: true,
        empresaNombre: true,
        fechaInicio: true,
        fechaFin: true,
        student: { select: { id: true, name: true, email: true } },
        nrc: { select: { id: true, code: true, practiceType: true } },
      },
    });

    res.json(practices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al listar prácticas" });
  }
};

const createStartDraft = async (req, res) => {
  try {
    const studentId = req.user.id;

    const period = await prisma.period.findFirst({
      where: { active: true },
      orderBy: { id: "desc" },
      select: { id: true, name: true },
    });

    if (!period) {
      return res.status(400).json({ error: "No hay período activo" });
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: { periodId: period.id, studentId },
      select: { nrcId: true },
    });

    if (!enrollment) {
      return res.status(400).json({
        error: "No estás inscrito en un NRC para el período activo",
      });
    }

    const existingPractice = await prisma.practice.findFirst({
      where: {
        studentId,
        status: { notIn: ["FINALIZADA", "CANCELADA", "RECHAZADA"] },
      },
    });

    if (existingPractice) {
      return res.json(existingPractice);
    }

    const practice = await prisma.practice.create({
      data: {
        studentId,
        nrcId: enrollment.nrcId,
        status: "BORRADOR",
        startDocStatus: "SUBIDO_POR_ESTUDIANTE",
      },
    });

    res.status(201).json(practice);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al crear borrador" });
  }
};

const updateStartForm = async (req, res) => {
  try {
    const { practiceId } = req.params;
    const studentId = req.user.id;

    const practice = await prisma.practice.findUnique({
      where: { id: Number(practiceId) },
      select: {
        id: true,
        studentId: true,
        nrc: { select: { practiceType: true } }, // ✅ para saber si es I o II
      },
    });

    if (!practice || practice.studentId !== studentId) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const data = req.body;

    if (!data.empresaEmail || !isValidEmail(data.empresaEmail)) {
      return res.status(400).json({ error: "Email de empresa inválido" });
    }

    if (!data.supervisorEmail || !isValidEmail(data.supervisorEmail)) {
      return res.status(400).json({ error: "Email de supervisor inválido" });
    }

    if (!data.empresaTelefono || !isValidPhone(data.empresaTelefono)) {
      return res.status(400).json({ error: "Teléfono de empresa inválido" });
    }

    if (!data.supervisorFono || !isValidPhone(data.supervisorFono)) {
      return res.status(400).json({ error: "Teléfono de supervisor inválido" });
    }

    // ✅ Validación País / Región / Ciudad
    const pais = String(data.empresaPais || "").trim();
    const paisLower = pais.toLowerCase();

    if (!pais) {
      return res.status(400).json({ error: "País de la empresa es obligatorio" });
    }

    const ciudad = String(data.empresaCiudad || "").trim();
    const region = String(data.empresaRegion || "").trim();

    // Si es Chile => Región + Ciudad obligatorias
    if (paisLower === "chile") {
      if (!region) {
        return res.status(400).json({ error: "Región es obligatoria cuando el país es Chile" });
      }
      if (!ciudad) {
        return res.status(400).json({ error: "Ciudad es obligatoria cuando el país es Chile" });
      }
    } else {
      // Si no es Chile => Ciudad obligatoria (texto libre)
      if (!ciudad) {
        return res.status(400).json({ error: "Ciudad es obligatoria cuando el país no es Chile" });
      }
    }

    if (!data.fechaInicio) {
      return res.status(400).json({ error: "La fecha de inicio es obligatoria" });
    }

    if (!data.fechaFin) {
      return res.status(400).json({ error: "La fecha de término es obligatoria" });
    }

        // 1) helper (arriba, antes de usarlo)
    const parseISODateLocal = (iso) => {
      const [y, m, d] = String(iso).split("-").map(Number);
      return new Date(y, m - 1, d); // local
    };

    // 2) crear fechas PRIMERO (antes de cualquier uso)
    const fechaInicio = parseISODateLocal(data.fechaInicio);
    const fechaFin = parseISODateLocal(data.fechaFin);

    // 3) normalizar a medianoche (ahora sí, porque ya existen)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    fechaInicio.setHours(0, 0, 0, 0);
    fechaFin.setHours(0, 0, 0, 0);

    // 4) validaciones básicas
    if (fechaInicio < today) {
      return res.status(400).json({ error: "La fecha de inicio no puede ser anterior al día actual" });
    }
    if (fechaFin < today) {
      return res.status(400).json({ error: "La fecha de término no puede ser anterior al día actual" });
    }
    if (fechaFin <= fechaInicio) {
      return res.status(400).json({ error: "La fecha de término debe ser posterior a la fecha de inicio" });
    }


    if (Number.isNaN(fechaInicio.getTime()) || Number.isNaN(fechaFin.getTime())) {
      return res.status(400).json({ error: "Fechas inválidas" });
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    fechaInicio.setHours(0, 0, 0, 0);
    fechaFin.setHours(0, 0, 0, 0);

    if (fechaInicio < hoy) {
      return res.status(400).json({
        error: "La fecha de inicio no puede ser anterior al día actual",
      });
    }

    if (fechaFin < hoy) {
      return res.status(400).json({
        error: "La fecha de término no puede ser anterior al día actual",
      });
    }

    if (fechaFin <= fechaInicio) {
      return res.status(400).json({
        error: "La fecha de término debe ser posterior a la fecha de inicio",
      });
    }

    if (!data.celular || !/^\+569\d{8}$/.test(String(data.celular).trim())) {
      return res.status(400).json({
        error: "Celular inválido. Debe ser +569XXXXXXXX (ej: +56912345678)",
      });
    }

      // ===== Regla horas mínimas (sin sábados ni domingos) =====
  const HOURS_PER_DAY = 8;

  const addBusinessDays = (startDate, businessDays) => {
    const d = new Date(startDate);
    d.setHours(0, 0, 0, 0);

    let added = 0;
    while (added < businessDays) {
      d.setDate(d.getDate() + 1);
      const day = d.getDay(); // 0=Dom, 6=Sáb
      if (day !== 0 && day !== 6) added++;
    }
    return d;
  };

  const type = practice.nrc?.practiceType; // "I" o "II"
  if (!type) {
    return res.status(400).json({
      error: "No se pudo determinar el tipo de práctica (I/II) desde el NRC",
    });
  }

  const hoursRequired = type === "I" ? 216 : 351;
  const requiredBusinessDays = Math.ceil(hoursRequired / HOURS_PER_DAY);

  const minEnd = addBusinessDays(fechaInicio, requiredBusinessDays);

  if (fechaFin < minEnd) {
    const minEndISO = minEnd.toISOString().slice(0, 10);
    return res.status(400).json({
      error: `Fecha fin inválida. Para Práctica ${type} (mín. ${hoursRequired}h) la fecha fin mínima (sin sábados/domingo) es ${minEndISO}.`,
    });
  }
  // ===== Fin regla horas mínimas =====

    const updated = await prisma.practice.update({
      where: { id: Number(practiceId) },
      data: {
        empresaNombre: data.empresaNombre ?? undefined,
        empresaRut: data.empresaRut ?? undefined,
        empresaGiro: data.empresaGiro ?? undefined,
        empresaDireccion: data.empresaDireccion ?? undefined,
        empresaNumero: data.empresaNumero ?? undefined,
        empresaCiudad: data.empresaCiudad ?? undefined,
        empresaPais: data.empresaPais ?? undefined,
        empresaRegion: data.empresaRegion ?? undefined,
        empresaTelefono: data.empresaTelefono ?? undefined,
        empresaEmail: data.empresaEmail ?? undefined,

        supervisorNombre: data.supervisorNombre ?? undefined,
        supervisorApellido: data.supervisorApellido ?? undefined,
        supervisorCargo: data.supervisorCargo ?? undefined,
        supervisorEmail: data.supervisorEmail ?? undefined,
        supervisorFono: data.supervisorFono ?? undefined,

      
        celular: data.celular ?? undefined,

        funciones: data.funciones ?? undefined,
        fechaInicio,
        fechaFin,
      },
    });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al guardar formulario" });
  }
};

const downloadStartFormPdf = async (req, res) => {
  try {
    const { practiceId } = req.params;
    const studentId = req.user.id;

    const practice = await prisma.practice.findUnique({
      where: { id: Number(practiceId) },
      include: { student: true },
    });

    if (!practice || practice.studentId !== studentId) {
      return res.status(403).json({ error: "No autorizado" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="inicio_practica_${practice.id}.pdf"`
    );

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    const pageWidth = doc.page.width;
    const left = doc.page.margins.left;
    const right = doc.page.margins.right;
    const usableWidth = pageWidth - left - right;

    doc.fontSize(18).font("Helvetica-Bold").text("UNAB", left, 35);
    doc.fontSize(12).font("Helvetica").text("Universidad Andrés Bello", left + 55, 38);

    doc
      .moveTo(left, 62)
      .lineTo(left + usableWidth, 62)
      .lineWidth(1)
      .strokeColor("#E5E7EB")
      .stroke();

    doc.moveDown(2);
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("SOLICITUD DE INICIO DE PRÁCTICA", { align: "center" });

    doc.moveDown(1);

    doc.fontSize(11).font("Helvetica-Bold").text("DATOS DEL ALUMNO");
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(11);
    doc.text(`Nombre: ${practice.student?.name || ""}`);
    doc.text(`Correo: ${practice.student?.email || ""}`);
    doc.text(`RUT: ${practice.student?.rut || ""}`);
    doc.text(`Celular: ${practice.celular || ""}`);
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").text("DATOS DE LA EMPRESA");
    doc.moveDown(0.3);
    doc.font("Helvetica");
    doc.text(`Nombre: ${practice.empresaNombre || ""}`);
    doc.text(`RUT: ${practice.empresaRut || ""}`);
    doc.text(`Giro: ${practice.empresaGiro || ""}`);

    const dir = `${practice.empresaDireccion || ""} ${practice.empresaNumero || ""}`.trim();
    doc.text(`Dirección: ${dir}`);
    doc.text(`País: ${practice.empresaPais || ""}`);

    const paisLowerPdf = String(practice.empresaPais || "").trim().toLowerCase();
    if (paisLowerPdf === "chile") {
      doc.text(`Región: ${practice.empresaRegion || ""}`);
      doc.text(`Ciudad: ${practice.empresaCiudad || ""}`);
    } else {
      doc.text(`Ciudad: ${practice.empresaCiudad || ""}`);
    }

    doc.text(`Teléfono: ${practice.empresaTelefono || ""}`);
    doc.text(`Email: ${practice.empresaEmail || ""}`);
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").text("SUPERVISOR");
    doc.moveDown(0.3);
    doc.font("Helvetica");
    doc.text(`Nombre: ${practice.supervisorNombre || ""}`);
    doc.text(`Apellido: ${practice.supervisorApellido || ""}`);
    doc.text(`Cargo: ${practice.supervisorCargo || ""}`);
    doc.text(`Email: ${practice.supervisorEmail || ""}`);
    doc.text(`Teléfono: ${practice.supervisorFono || ""}`);
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").text("FUNCIONES");
    doc.moveDown(0.3);
    doc.font("Helvetica");
    doc.text(practice.funciones || "", { width: 520 });
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").text("FECHAS");
    doc.moveDown(0.3);
    doc.font("Helvetica");
    doc.text(
      `Inicio: ${
        practice.fechaInicio ? new Date(practice.fechaInicio).toLocaleDateString() : ""
      }`
    );
    doc.text(
      `Término: ${
        practice.fechaFin ? new Date(practice.fechaFin).toLocaleDateString() : ""
      }`
    );
    doc.moveDown(1.2);

    doc.font("Helvetica-Bold").text("FIRMAS");
    doc.moveDown(0.6);
    doc.font("Helvetica").fontSize(10).fillColor("#111827");

    const startY = doc.y;

    doc.text("Firma Alumno", left, startY);
    const box1Y = startY + 14;
    doc.rect(left, box1Y, usableWidth, 70).lineWidth(1).strokeColor("#D1D5DB").stroke();

    const box2TitleY = box1Y + 85;
    doc.text("Firma y Timbre Empresa", left, box2TitleY);
    const box2Y = box2TitleY + 14;
    doc.rect(left, box2Y, usableWidth, 110).lineWidth(1).strokeColor("#D1D5DB").stroke();

    doc.moveDown(8);
    doc.fontSize(9).fillColor("#6B7280");
    doc.text(
      "Nota: Este documento debe ser impreso y firmado por el alumno. La empresa debe firmar y timbrar.",
      { align: "left" }
    );

    doc.end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al generar PDF" });
  }
};

module.exports = {
  createPractice,
  updatePracticeStatus,
  getPracticeById,
  getMyPractice,
  listPractices,
  createStartDraft,
  updateStartForm,
  downloadStartFormPdf,
};